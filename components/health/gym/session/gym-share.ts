"use client";

// Gera um card bonito do treino (canvas) e compartilha via Web Share API
// (abre o menu nativo: WhatsApp, Instagram, etc.). Fallback: baixa a imagem.

export interface ShareData {
  title: string;
  dateLabel: string;
  volume: number;
  durationMin: number;
  sets: number;
  photoDataUrl?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img"));
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const r = Math.max(w / img.width, h / img.height);
  const nw = img.width * r, nh = img.height * r;
  ctx.drawImage(img, (w - nw) / 2, (h - nh) / 2, nw, nh);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

async function buildCard(d: ShareData): Promise<Blob | null> {
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fundo: foto (cover) ou gradiente.
  if (d.photoDataUrl) {
    try { drawCover(ctx, await loadImage(d.photoDataUrl), W, H); } catch { /* cai no gradiente */ }
  }
  if (!d.photoDataUrl) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#4f46e5");
    g.addColorStop(1, "#0ea5e9");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Sombra inferior para o texto.
  const shade = ctx.createLinearGradient(0, H * 0.35, 0, H);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  // Topo: marca.
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "700 34px system-ui, sans-serif";
  ctx.fillText("💪 LIFE OS · TREINO CONCLUÍDO", 64, 84);

  // Bloco inferior.
  let y = 980;
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 72px system-ui, sans-serif";
  for (const line of wrap(ctx, d.title, W - 128)) { ctx.fillText(line, 64, y); y += 84; }

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "400 32px system-ui, sans-serif";
  ctx.fillText(d.dateLabel, 64, y + 4);

  // Stats em 3 colunas.
  const stats: [string, string][] = [
    [`${(d.volume / 1000).toFixed(1)}k`, "KG DE VOLUME"],
    [`${d.durationMin}`, "MINUTOS"],
    [`${d.sets}`, "SÉRIES"],
  ];
  const baseY = H - 90;
  stats.forEach(([value, label], i) => {
    const x = 64 + i * ((W - 128) / 3);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 64px system-ui, sans-serif";
    ctx.fillText(value, x, baseY);
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.fillText(label, x, baseY + 32);
  });

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.92));
}

export async function shareWorkoutCard(d: ShareData): Promise<"shared" | "downloaded" | "failed"> {
  try {
    const blob = await buildCard(d);
    if (!blob) return "failed";
    const file = new File([blob], "treino-lifeos.png", { type: "image/png" });
    const text = `${d.title} — ${(d.volume / 1000).toFixed(1)}k kg em ${d.durationMin}min, ${d.sets} séries 💪`;

    type ShareData2 = { title?: string; text?: string; files?: File[] };
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData2) => boolean;
      share?: (data?: ShareData2) => Promise<void>;
    };

    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: d.title, text });
      return "shared";
    }

    // Fallback: baixa a imagem.
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "treino-lifeos.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return "downloaded";
  } catch {
    return "failed";
  }
}
