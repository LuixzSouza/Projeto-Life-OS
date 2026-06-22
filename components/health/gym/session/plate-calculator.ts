// Calculadora de anilhas (helper PURO — sem DOM/estado).
//
// Dada a carga TOTAL desejada e o peso da barra, decompõe o que entra de CADA LADO
// (a barra é simétrica) usando as anilhas comuns de academia, do disco mais pesado
// ao mais leve — algoritmo guloso, que é ótimo para o conjunto de pesos padrão.
// Tira a conta de cabeça na hora de montar a barra (UX frictionless).

/** Opções de barra mais comuns; o usuário escolhe e a preferência fica salva. */
export const BAR_OPTIONS: { weight: number; label: string }[] = [
  { weight: 20, label: "Barra 20kg" },   // Olímpica padrão
  { weight: 15, label: "Barra 15kg" },   // Técnica / olímpica feminina
  { weight: 10, label: "Barra W 10kg" }, // EZ / W
  { weight: 0, label: "Sem barra" },     // anilhas soltas / implemento sem peso fixo
];

// Anilhas padrão (kg), do mais pesado ao mais leve. Cobre academias comerciais e
// home gyms (frações de 1,25 / 1 / 0,5 para microcargas).
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 1, 0.5] as const;

const EPS = 1e-9;

export interface PlateStack {
  /** Anilhas de UM lado da barra (o outro é espelhado). */
  perSide: { plate: number; count: number }[];
  /** kg por lado que não fecham com as anilhas disponíveis (0 = montagem exata). */
  leftover: number;
  bar: number;
  total: number;
  /** Carga efetiva por lado (total - barra) / 2. */
  perSideKg: number;
}

/**
 * Decompõe a carga total em anilhas por lado.
 * Retorna `null` quando não há o que montar (carga ≤ 0 ou menor que a barra).
 */
export function platesPerSide(total: number, bar: number): PlateStack | null {
  if (!Number.isFinite(total) || total <= 0) return null;
  if (total < bar - EPS) return null; // a carga nem cobre a barra: nada a montar
  const perSideKg = Math.round(((total - bar) / 2) * 100) / 100;
  let rest = perSideKg;
  const perSide: { plate: number; count: number }[] = [];
  for (const p of PLATES) {
    if (rest < p - EPS) continue;
    const count = Math.floor((rest + EPS) / p);
    if (count > 0) {
      perSide.push({ plate: p, count });
      rest = Math.round((rest - count * p) * 100) / 100;
    }
  }
  return { perSide, leftover: Math.max(0, rest), bar, total, perSideKg };
}

/** Formata kg com vírgula decimal e sem zeros à toa (2.5 → "2,5"; 20 → "20"). */
export function fmtKg(kg: number): string {
  return (Math.round(kg * 100) / 100).toString().replace(".", ",");
}
