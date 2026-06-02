// Conversão de cor HEX -> HSL, retornando também a string CSS pronta (`hsl(...)`)
// usada para aplicar temas dinâmicos via CSS custom properties.
export function hexToHsl(hex: string): { h: number; s: number; l: number; cssValue: string } {
  const cleanHex = hex.replace(/^#/, '');

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hDeg = (h * 360).toFixed(1);
  const sPct = (s * 100).toFixed(1);
  const lPct = (l * 100).toFixed(1);

  return {
    h: h * 360,
    s: s * 100,
    l: l * 100,
    cssValue: `hsl(${hDeg} ${sPct}% ${lPct}%)`,
  };
}
