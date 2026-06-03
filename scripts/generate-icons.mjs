// Gera os ícones .ico (multi-resolução) dos atalhos do Life OS.
// Verde = Abrir (play), Vermelho = Fechar (X). Rasteriza SVG via sharp.
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "launcher");
mkdirSync(OUT, { recursive: true });

const openSvg = `<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <rect x="16" y="16" width="224" height="224" rx="56" fill="url(#g)"/>
  <path d="M106 84 L176 128 L106 172 Z" fill="white"/>
</svg>`;

const closeSvg = `<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f87171"/><stop offset="1" stop-color="#b91c1c"/>
    </linearGradient>
  </defs>
  <rect x="16" y="16" width="224" height="224" rx="56" fill="url(#g)"/>
  <path d="M94 94 L162 162 M162 94 L94 162" stroke="white" stroke-width="22" stroke-linecap="round"/>
</svg>`;

const SIZES = [16, 24, 32, 48, 64, 128, 256];

// Monta um arquivo .ico a partir de vários PNGs (formato ICO suporta PNG embutido).
function buildIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(count, 4);

  const entries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  const blobs = [];
  pngs.forEach((p, i) => {
    const e = i * 16;
    entries.writeUInt8(p.size >= 256 ? 0 : p.size, e + 0); // largura (0 = 256)
    entries.writeUInt8(p.size >= 256 ? 0 : p.size, e + 1); // altura
    entries.writeUInt8(0, e + 2); // paleta
    entries.writeUInt8(0, e + 3); // reservado
    entries.writeUInt16LE(1, e + 4); // planos
    entries.writeUInt16LE(32, e + 6); // bits por pixel
    entries.writeUInt32LE(p.data.length, e + 8); // tamanho
    entries.writeUInt32LE(offset, e + 12); // posição
    offset += p.data.length;
    blobs.push(p.data);
  });

  return Buffer.concat([header, entries, ...blobs]);
}

async function makeIco(svg, file) {
  const pngs = [];
  for (const size of SIZES) {
    const data = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
    pngs.push({ size, data });
  }
  writeFileSync(join(OUT, file), buildIco(pngs));
  console.log("✓", file);
}

await makeIco(openSvg, "open.ico");
await makeIco(closeSvg, "close.ico");
console.log("Ícones em", OUT);
