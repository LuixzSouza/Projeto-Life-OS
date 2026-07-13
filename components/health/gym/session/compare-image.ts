"use client";

// Gera uma imagem de EVOLUÇÃO (antes/depois) lado a lado em canvas e compartilha
// via Web Share API (WhatsApp/Instagram) ou baixa. Mesma técnica do card de treino
// (gym-share.ts). Ordena por data: mais antiga = ANTES, mais recente = DEPOIS.

export interface ComparePhoto {
  dataUrl: string;
  date: string;  // ISO
  title: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img"));
    img.src = src;
  });
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Desenha a imagem cobrindo (cover) o retângulo alvo, recortada em cantos suaves.
function drawCoverClipped(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  const scale = Math.max(w / img.width, h / img.height);
  const nw = img.width * scale, nh = img.height * scale;
  ctx.drawImage(img, x + (w - nw) / 2, y + (h - nh) / 2, nw, nh);
  ctx.restore();
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
}

async function buildCanvas(before: ComparePhoto, after: ComparePhoto): Promise<HTMLCanvasElement | null> {
  const W = 1080, H = 1200;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fundo escuro premium.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b1020");
  bg.addColorStop(1, "#111827");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Marca.
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("💪 LIFE OS · EVOLUÇÃO", 40, 70);

  const pad = 32;
  const colW = (W - pad * 3) / 2;
  const top = 110;
  const imgH = H - top - 150;
  const cols: [ComparePhoto, string, number][] = [
    [before, "ANTES", pad],
    [after, "DEPOIS", pad * 2 + colW],
  ];

  for (const [photo, tag, x] of cols) {
    try {
      const img = await loadImage(photo.dataUrl);
      drawCoverClipped(ctx, img, x, top, colW, imgH, 24);
    } catch {
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      roundRectPath(ctx, x, top, colW, imgH, 24);
      ctx.fill();
    }
    // Etiqueta ANTES/DEPOIS no topo da coluna.
    ctx.font = "800 26px system-ui, sans-serif";
    const tagW = ctx.measureText(tag).width + 32;
    roundRectPath(ctx, x + 16, top + 16, tagW, 44, 22);
    ctx.fillStyle = tag === "ANTES" ? "rgba(15,23,42,0.75)" : "rgba(99,102,241,0.9)";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText(tag, x + 32, top + 46);
    // Data embaixo da coluna.
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "600 30px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(dateLabel(photo.date), x + colW / 2, top + imgH + 52);
  }

  // Rodapé.
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "500 24px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Acompanhado no Life OS", W / 2, H - 34);

  return canvas;
}

export async function shareComparison(a: ComparePhoto, b: ComparePhoto): Promise<"shared" | "downloaded" | "failed"> {
  try {
    // Ordena por data: mais antiga = ANTES.
    const [before, after] = new Date(a.date) <= new Date(b.date) ? [a, b] : [b, a];
    const canvas = await buildCanvas(before, after);
    if (!canvas) return "failed";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((x) => resolve(x), "image/png", 0.92));
    if (!blob) return "failed";

    const file = new File([blob], "evolucao-lifeos.png", { type: "image/png" });
    const text = "Minha evolução no Life OS 💪";
    type ShareData2 = { title?: string; text?: string; files?: File[] };
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData2) => boolean;
      share?: (data?: ShareData2) => Promise<void>;
    };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: "Evolução — Life OS", text });
      return "shared";
    }
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url; el.download = file.name; el.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return "downloaded";
  } catch {
    return "failed";
  }
}
