// Parser de arquivos de corrida (GPX / TCX / CSV) — puro, roda no client.
// Sem dependências externas: usa DOMParser (browser) e cálculo de haversine.

export interface ParsedRun {
  title: string;
  date: string; // ISO
  distanceKm: number;
  durationMin: number;
  paceStr: string; // "m'ss\"" por km
  externalId: string;
  source: "GPX" | "TCX" | "CSV";
}

// Distância entre dois pontos lat/lon em metros (Haversine).
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // raio da Terra em metros
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatPace(durationMin: number, distanceKm: number): string {
  if (!distanceKm || distanceKm <= 0 || !durationMin) return "-";
  const paceDecimal = durationMin / distanceKm; // min por km
  const min = Math.floor(paceDecimal);
  const sec = Math.round((paceDecimal - min) * 60);
  return `${min}'${sec.toString().padStart(2, "0")}"`;
}

function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Arquivo XML inválido.");
  }
  return doc;
}

// --- GPX ---
function parseGpx(text: string): ParsedRun[] {
  const doc = parseXml(text);
  const tracks = Array.from(doc.getElementsByTagName("trk"));
  const runs: ParsedRun[] = [];

  tracks.forEach((trk, idx) => {
    const pts = Array.from(trk.getElementsByTagName("trkpt"));
    if (pts.length < 2) return;

    let distance = 0;
    let prevLat: number | null = null;
    let prevLon: number | null = null;

    for (const pt of pts) {
      const lat = parseFloat(pt.getAttribute("lat") || "");
      const lon = parseFloat(pt.getAttribute("lon") || "");
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
      if (prevLat !== null && prevLon !== null) {
        distance += haversine(prevLat, prevLon, lat, lon);
      }
      prevLat = lat;
      prevLon = lon;
    }

    const times = pts
      .map((p) => p.getElementsByTagName("time")[0]?.textContent)
      .filter((t): t is string => !!t)
      .map((t) => new Date(t).getTime())
      .filter((t) => !Number.isNaN(t));

    const start = times.length ? Math.min(...times) : Date.now();
    const end = times.length ? Math.max(...times) : start;
    const durationMin = times.length >= 2 ? (end - start) / 60000 : 0;
    const distanceKm = distance / 1000;
    const name = trk.getElementsByTagName("name")[0]?.textContent || "Corrida importada";
    const dateIso = new Date(start).toISOString();

    runs.push({
      title: name,
      date: dateIso,
      distanceKm: Number(distanceKm.toFixed(2)),
      durationMin: Math.round(durationMin),
      paceStr: formatPace(durationMin, distanceKm),
      externalId: `gpx-${dateIso}-${idx}`,
      source: "GPX",
    });
  });

  return runs;
}

// --- TCX ---
function parseTcx(text: string): ParsedRun[] {
  const doc = parseXml(text);
  const activities = Array.from(doc.getElementsByTagName("Activity"));
  const runs: ParsedRun[] = [];

  activities.forEach((act, idx) => {
    const laps = Array.from(act.getElementsByTagName("Lap"));
    if (!laps.length) return;

    let totalSeconds = 0;
    let totalMeters = 0;
    for (const lap of laps) {
      totalSeconds += parseFloat(lap.getElementsByTagName("TotalTimeSeconds")[0]?.textContent || "0");
      totalMeters += parseFloat(lap.getElementsByTagName("DistanceMeters")[0]?.textContent || "0");
    }

    const idText = act.getElementsByTagName("Id")[0]?.textContent;
    const startTime = idText || laps[0]?.getAttribute("StartTime") || new Date().toISOString();
    const dateIso = new Date(startTime).toISOString();
    const distanceKm = totalMeters / 1000;
    const durationMin = totalSeconds / 60;
    const sport = act.getAttribute("Sport") || "Running";

    runs.push({
      title: `Corrida (${sport})`,
      date: dateIso,
      distanceKm: Number(distanceKm.toFixed(2)),
      durationMin: Math.round(durationMin),
      paceStr: formatPace(durationMin, distanceKm),
      externalId: `tcx-${dateIso}-${idx}`,
      source: "TCX",
    });
  });

  return runs;
}

// --- CSV (export do Strava ou formato simples) ---
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function findIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((h) => aliases.some((a) => h.toLowerCase().includes(a)));
}

function parseCsv(text: string): ParsedRun[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  const iDate = findIndex(headers, ["activity date", "date", "data"]);
  const iName = findIndex(headers, ["activity name", "name", "título", "titulo"]);
  const iType = findIndex(headers, ["activity type", "type", "tipo"]);
  const iDist = findIndex(headers, ["distance", "distância", "distancia", "km"]);
  const iTime = findIndex(headers, ["moving time", "elapsed time", "duration", "tempo", "duração", "duracao"]);
  const iId = findIndex(headers, ["activity id", "id"]);

  const runs: ParsedRun[] = [];

  for (let r = 1; r < lines.length; r++) {
    const cols = splitCsvLine(lines[r]);
    const typeVal = iType >= 0 ? (cols[iType] || "").toLowerCase() : "run";
    // Mantém apenas corridas (se houver coluna de tipo).
    if (iType >= 0 && !/(run|corrida|jog)/.test(typeVal)) continue;

    const rawDate = iDate >= 0 ? cols[iDate] : "";
    // Data pura "YYYY-MM-DD" recebe T12:00:00 (evita o "dia anterior" em fusos
    // negativos); datas com hora (ex.: export do Strava) são usadas como vêm.
    const dateInput = /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim()) ? `${rawDate.trim()}T12:00:00` : rawDate;
    const parsedDate = rawDate ? new Date(dateInput) : new Date();
    const dateIso = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

    // Distância: assume km; se vier claramente em metros (>200), converte.
    let distanceKm = iDist >= 0 ? parseFloat((cols[iDist] || "0").replace(",", ".")) : 0;
    if (distanceKm > 200) distanceKm = distanceKm / 1000;

    // Tempo: aceita "HH:MM:SS", "MM:SS" ou segundos.
    let durationMin = 0;
    if (iTime >= 0) {
      const raw = cols[iTime] || "";
      if (raw.includes(":")) {
        const parts = raw.split(":").map((p) => parseInt(p, 10) || 0);
        const secs = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
        durationMin = secs / 60;
      } else {
        const secs = parseFloat(raw) || 0;
        durationMin = secs > 600 ? secs / 60 : secs; // heurística: >600 provavelmente segundos
      }
    }

    if (distanceKm <= 0 && durationMin <= 0) continue;

    runs.push({
      title: (iName >= 0 && cols[iName]) || "Corrida importada",
      date: dateIso,
      distanceKm: Number(distanceKm.toFixed(2)),
      durationMin: Math.round(durationMin),
      paceStr: formatPace(durationMin, distanceKm),
      externalId: iId >= 0 && cols[iId] ? `csv-${cols[iId]}` : `csv-${dateIso}-${r}`,
      source: "CSV",
    });
  }

  return runs;
}

// Dispatcher por extensão/conteúdo.
export function parseRunningFile(filename: string, content: string): ParsedRun[] {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "gpx") return parseGpx(content);
  if (ext === "tcx") return parseTcx(content);
  if (ext === "csv") return parseCsv(content);
  // Fallback por conteúdo
  if (content.includes("<gpx")) return parseGpx(content);
  if (content.includes("TrainingCenterDatabase") || content.includes("<Activities")) return parseTcx(content);
  return parseCsv(content);
}
