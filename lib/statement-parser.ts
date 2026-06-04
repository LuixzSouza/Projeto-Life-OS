// Parser de extratos bancários (OFX e CSV) — puro, roda no cliente para manter
// o arquivo local (privacy-first). Normaliza tudo em ParsedTransaction.

export interface ParsedTransaction {
  date: string; // ISO (YYYY-MM-DD)
  description: string;
  amount: number; // valor absoluto
  type: "INCOME" | "EXPENSE";
  fitId?: string; // id único do banco (OFX), quando disponível
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  format: "OFX" | "CSV" | "UNKNOWN";
  error?: string;
}

// ---------- helpers ----------

const toISO = (y: number, m: number, d: number) =>
  `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;

// Aceita dd/mm/yyyy, yyyy-mm-dd, dd-mm-yyyy, yyyymmdd…
function parseFlexibleDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // OFX: YYYYMMDD (+ hora opcional)
  const ofx = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofx) return toISO(+ofx[1], +ofx[2], +ofx[3]);

  // yyyy-mm-dd
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return toISO(+iso[1], +iso[2], +iso[3]);

  // dd/mm/yyyy ou dd-mm-yyyy
  const br = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (br) {
    const year = br[3].length === 2 ? 2000 + +br[3] : +br[3];
    return toISO(year, +br[2], +br[1]);
  }
  return null;
}

// Converte valor monetário BR ("1.234,56" / "-12,90") ou US ("1234.56").
function parseMoney(raw: string): number {
  let s = raw.replace(/[R$\s]/gi, "").trim();
  if (!s) return NaN;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // o último separador é o decimal
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delim && !inQuotes) {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

// ---------- OFX ----------

function getTag(chunk: string, tag: string): string {
  const m = chunk.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
  return m ? m[1].trim() : "";
}

export function parseOFX(content: string): ParsedTransaction[] {
  const parts = content.split(/<STMTTRN>/i).slice(1);
  const txns: ParsedTransaction[] = [];
  for (const part of parts) {
    const amountRaw = getTag(part, "TRNAMT");
    const dateRaw = getTag(part, "DTPOSTED");
    if (!amountRaw || !dateRaw) continue;
    const value = parseMoney(amountRaw);
    const iso = parseFlexibleDate(dateRaw);
    if (isNaN(value) || !iso) continue;
    const description = getTag(part, "MEMO") || getTag(part, "NAME") || "Lançamento";
    txns.push({
      date: iso,
      description: description.slice(0, 200),
      amount: Math.abs(value),
      type: value < 0 ? "EXPENSE" : "INCOME",
      fitId: getTag(part, "FITID") || undefined,
    });
  }
  return txns;
}

// ---------- CSV ----------

export function parseCSV(content: string): ParsedTransaction[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const delim = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";
  const firstCols = splitCsvLine(lines[0], delim).map((h) => h.toLowerCase());
  const hasHeader = firstCols.some((h) => /data|date|valor|amount|descr|t[íi]tulo|hist|memo/.test(h));

  // Mapeia colunas por palavra-chave; fallback posicional [data, descrição, valor].
  const find = (re: RegExp, fallback: number) => {
    const i = firstCols.findIndex((h) => re.test(h));
    return i >= 0 ? i : fallback;
  };
  const dateIdx = hasHeader ? find(/data|date/, 0) : 0;
  const descIdx = hasHeader ? find(/descr|t[íi]tulo|hist|memo|estabelec|lan[çc]/, 1) : 1;
  const amountIdx = hasHeader ? find(/valor|amount|montante|quantia/, 2) : 2;

  const rows = hasHeader ? lines.slice(1) : lines;
  const txns: ParsedTransaction[] = [];
  for (const line of rows) {
    const cols = splitCsvLine(line, delim);
    const iso = parseFlexibleDate(cols[dateIdx] ?? "");
    const value = parseMoney(cols[amountIdx] ?? "");
    if (!iso || isNaN(value)) continue;
    txns.push({
      date: iso,
      description: (cols[descIdx] || "Lançamento").slice(0, 200),
      amount: Math.abs(value),
      type: value < 0 ? "EXPENSE" : "INCOME",
    });
  }
  return txns;
}

// ---------- dispatcher ----------

export function parseStatement(filename: string, content: string): ParseResult {
  const lower = filename.toLowerCase();
  const looksOfx = lower.endsWith(".ofx") || /<OFX>|<STMTTRN>/i.test(content);
  try {
    if (looksOfx) {
      const transactions = parseOFX(content);
      return { transactions, format: "OFX", error: transactions.length ? undefined : "Nenhum lançamento encontrado no OFX." };
    }
    if (lower.endsWith(".csv") || lower.endsWith(".txt") || content.includes(",") || content.includes(";")) {
      const transactions = parseCSV(content);
      return { transactions, format: "CSV", error: transactions.length ? undefined : "Não consegui identificar as colunas (data, descrição, valor)." };
    }
    return { transactions: [], format: "UNKNOWN", error: "Formato não reconhecido. Use OFX ou CSV." };
  } catch {
    return { transactions: [], format: "UNKNOWN", error: "Falha ao ler o arquivo." };
  }
}
