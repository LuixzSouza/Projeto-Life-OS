// Gera um cartão de aniversário como IMAGEM (PNG), 100% no cliente via <canvas>.
// Assim a pessoa pode mandar a homenagem por WhatsApp/Instagram mesmo sem o link
// público estar acessível (ex.: rodando local). Sem dependência nova e portátil:
// a foto (data URL base64 ou URL) é desenhada no canvas e exportada como Blob.
//
// Fotos externas sem CORS não podem ser exportadas (canvas "tainted"); por isso
// carregamos com crossOrigin="anonymous" e, se falhar, caímos para as iniciais —
// nunca quebramos a geração.

export interface CelebrationCardInput {
  displayName: string;
  fullName: string;
  greeting: string;
  age: number | null;
  isToday: boolean;
  paragraphs: string[];
  /** Fotos (data URL ou URL). Vazio → iniciais; várias → cluster lado a lado. */
  photos: string[];
  /** Paleta do tema (hex) — usada no fundo, confetes e destaque do nome. */
  confetti: string[];
}

/** Máximo de fotos mostradas juntas no cluster (mantém o cartão limpo). */
const MAX_CARD_PHOTOS = 4;

const W = 1080;
const H = 1350; // 4:5 — ótimo para WhatsApp/Stories
const FONT = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// --- cor ---------------------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const v = parseInt(n, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Mistura duas cores hex (t=0 → a, t=1 → b). */
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bb = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${bb})`;
}

// --- imagem ------------------------------------------------------------------
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // data: carrega sem CORS; URL externa só exporta se o servidor mandar CORS,
    // senão dispara onerror e seguimos com as iniciais (canvas nunca fica sujo).
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// --- texto -------------------------------------------------------------------
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function initialsOf(name: string): string {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Desenha o cartão e devolve o PNG como Blob. */
export async function renderCelebrationCard(input: CelebrationCardInput): Promise<Blob> {
  const palette = input.confetti.length ? input.confetti : ["#f43f5e", "#fb923c", "#fbbf24"];
  const c0 = palette[0];
  const c1 = palette[Math.min(2, palette.length - 1)];

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado neste dispositivo.");

  // Garante fontes carregadas antes de medir/desenhar texto.
  try { await document.fonts?.ready; } catch { /* sem Font Loading API */ }

  // Fundo: gradiente suave (tons bem claros do tema) + brilho radial atrás da foto.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, mix(c0, "#ffffff", 0.86));
  bg.addColorStop(1, mix(c1, "#ffffff", 0.9));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const halo = ctx.createRadialGradient(W / 2, 360, 40, W / 2, 360, 520);
  halo.addColorStop(0, mix(c0, "#ffffff", 0.62));
  halo.addColorStop(1, mix(c0, "#ffffff", 0.9));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, 760);

  // Confetes decorativos — espalhados de forma determinística nas bordas.
  let seed = 20240618;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 46; i++) {
    const x = rand() * W;
    const y = rand() * H;
    // Evita poluir a faixa central onde fica o texto principal.
    if (x > 210 && x < W - 210 && y > 620 && y < 1120) continue;
    const size = 8 + rand() * 12;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = palette[i % palette.length];
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI);
    if (rand() > 0.5) {
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-size / 2, -size / 4, size, size / 2);
    }
    ctx.restore();
  }

  // --- Fotos (uma grande, ou várias lado a lado num cluster) -----------------
  const cx = W / 2;
  const cy = 340;
  const loaded = (await Promise.all(input.photos.slice(0, MAX_CARD_PHOTOS).map(loadImage)))
    .filter((x): x is HTMLImageElement => x !== null);

  if (loaded.length <= 1) {
    drawCirclePhoto(ctx, loaded[0] ?? null, cx, cy, 170, input.fullName, c0);
  } else {
    const n = loaded.length;
    const r = n === 2 ? 138 : n === 3 ? 120 : 106;
    const step = 2 * r * 0.78; // 22% de sobreposição
    const totalW = 2 * r + (n - 1) * step;
    const firstX = cx - totalW / 2 + r;
    for (let i = 0; i < n; i++) {
      // desenhados da esquerda p/ direita → o de cima sobrepõe o anterior
      drawCirclePhoto(ctx, loaded[i], firstX + i * step, cy, r, input.fullName, c0);
    }
  }

  // --- Textos (fluxo vertical) ----------------------------------------------
  // Baseia o início do texto no raio máximo (170) para o espaçamento não pular
  // conforme o número de fotos muda o tamanho dos círculos.
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let y = cy + 170 + 78;

  // Saudação
  ctx.fillStyle = "#71717a";
  ctx.font = `500 38px ${FONT}`;
  ctx.fillText(`${input.greeting},`, cx, y);
  y += 96;

  // Nome — grande, cor de destaque, encolhe/quebra se preciso.
  const accent = mix(c0, "#1f2937", 0.14);
  ctx.fillStyle = accent;
  const name = `${input.displayName}!`;
  let nameSize = 108;
  ctx.font = `900 ${nameSize}px ${FONT}`;
  while (ctx.measureText(name).width > W - 160 && nameSize > 60) {
    nameSize -= 6;
    ctx.font = `900 ${nameSize}px ${FONT}`;
  }
  const nameLines = wrap(ctx, name, W - 140);
  for (const line of nameLines) {
    ctx.fillText(line, cx, y);
    y += nameSize * 1.02;
  }
  y += 14;

  // Idade (pílula)
  if (input.age) {
    const label = input.isToday ? `${input.age} anos hoje` : `Fazendo ${input.age} anos`;
    ctx.font = `700 32px ${FONT}`;
    const tw = ctx.measureText(label).width;
    const pw = tw + 64;
    const ph = 60;
    const px = cx - pw / 2;
    const py = y - 44;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    roundRect(ctx, px, py, pw, ph, 30);
    ctx.fill();
    ctx.fillStyle = "#3f3f46";
    ctx.fillText(label, cx, y - 2);
    y += 78;
  }

  // Mensagem — junta parágrafos, quebra em linhas e limita ao espaço disponível.
  const footerY = H - 70;
  ctx.font = `400 33px ${FONT}`;
  ctx.fillStyle = "#52525b";
  const lineH = 50;
  const maxLines = Math.max(0, Math.floor((footerY - 60 - y) / lineH));

  const allLines: string[] = [];
  for (const p of input.paragraphs) {
    for (const l of wrap(ctx, p, W - 200)) allLines.push(l);
  }
  const shown = allLines.slice(0, maxLines);
  if (allLines.length > maxLines && shown.length) {
    shown[shown.length - 1] = shown[shown.length - 1].replace(/[.,;:]?$/, "…");
  }
  for (const line of shown) {
    ctx.fillText(line, cx, y);
    y += lineH;
  }

  // Rodapé / marca
  ctx.fillStyle = "#a1a1aa";
  ctx.font = `600 26px ${FONT}`;
  ctx.fillText("🎂  Feito com carinho no Life OS", cx, footerY);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar a imagem."))),
      "image/png",
    );
  });
}

/** Desenha uma foto circular (com anel branco + sombra) ou as iniciais. */
function drawCirclePhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  cx: number,
  cy: number,
  r: number,
  fullName: string,
  c0: string,
) {
  // Anel branco com sombra (por baixo da foto).
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    // cobre o círculo mantendo proporção (object-fit: cover)
    const ratio = Math.max((2 * r) / img.width, (2 * r) / img.height);
    const dw = img.width * ratio;
    const dh = img.height * ratio;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  } else {
    ctx.fillStyle = mix(c0, "#ffffff", 0.7);
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.fillStyle = mix(c0, "#1f2937", 0.25);
    ctx.font = `800 ${Math.round(r * 0.72)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initialsOf(fullName), cx, cy + 4);
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Nome de arquivo amigável: feliz-aniversario-<nome>.png */
export function cardFileName(displayName: string): string {
  const slug = displayName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "amigo";
  return `feliz-aniversario-${slug}.png`;
}
