// =========================================================
// GERADOR DE ARTES DE PERFIL (capa e avatar) — client-side
// =========================================================
// Filosofia frictionless do Life OS: ninguém é obrigado a ter fotos. Estas
// funções desenham gradientes premium num <canvas> e devolvem dataURL base64 —
// o MESMO formato dos uploads — então o resto do sistema renderiza sem
// nenhum caso especial e o resultado viaja em backups normalmente.
// Só pode rodar no navegador (usa document.createElement).

export interface ArtPreset {
  id: string;
  label: string;
  /** Cores do gradiente (início → fim). */
  from: string;
  to: string;
}

export const ART_PRESETS: ArtPreset[] = [
  { id: "aurora", label: "Aurora", from: "#6366f1", to: "#06b6d4" },
  { id: "sunset", label: "Pôr do Sol", from: "#f97316", to: "#db2777" },
  { id: "forest", label: "Floresta", from: "#059669", to: "#84cc16" },
  { id: "midnight", label: "Meia-noite", from: "#0f172a", to: "#7c3aed" },
  { id: "ember", label: "Brasa", from: "#f59e0b", to: "#ef4444" },
  { id: "ocean", label: "Oceano", from: "#0ea5e9", to: "#1d4ed8" },
];

function createContext(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  return ctx ? { canvas, ctx } : null;
}

/** Brilho radial translúcido — dá profundidade ao gradiente plano. */
function paintGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number
) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, `rgba(255,255,255,${alpha})`);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/**
 * Capa de perfil em gradiente (1600×420). `toDataURL` cai para PNG sozinho
 * se o navegador não codificar WebP.
 */
export function generateGradientCover(preset: ArtPreset): string | null {
  const c = createContext(1600, 420);
  if (!c) return null;
  const { canvas, ctx } = c;

  const gradient = ctx.createLinearGradient(0, 420, 1600, 0);
  gradient.addColorStop(0, preset.from);
  gradient.addColorStop(1, preset.to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1600, 420);

  paintGlow(ctx, 1320, 60, 460, 0.18);
  paintGlow(ctx, 240, 380, 380, 0.12);

  return canvas.toDataURL("image/webp", 0.85);
}

/** Iniciais de exibição: primeira letra das duas primeiras palavras do nome. */
export function nameInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
  return initials || "EU";
}

/** Avatar quadrado (512×512) com gradiente e as iniciais do usuário. */
export function generateInitialsAvatar(name: string, preset: ArtPreset): string | null {
  const c = createContext(512, 512);
  if (!c) return null;
  const { canvas, ctx } = c;

  const gradient = ctx.createLinearGradient(0, 512, 512, 0);
  gradient.addColorStop(0, preset.from);
  gradient.addColorStop(1, preset.to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  paintGlow(ctx, 400, 110, 240, 0.2);

  const initials = nameInitials(name);
  ctx.font = `700 ${initials.length > 1 ? 200 : 240}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  // +4% de altura: opticamente o middle-baseline fica levemente alto
  ctx.fillText(initials, 256, 276);

  return canvas.toDataURL("image/webp", 0.9);
}
