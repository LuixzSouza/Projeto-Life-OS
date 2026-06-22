// Gerador de séries de aquecimento (helper PURO — sem DOM/estado).
//
// A partir da carga de TRABALHO planejada, monta uma rampa curta de séries leves
// que preparam a articulação e o padrão de movimento antes das séries pesadas —
// prática padrão de força (ramp-up). As séries são marcadas como "warmup", então
// NÃO entram no volume/recorde (métricas de evolução ficam limpas).

import type { Equipment } from "./session-types";

// Percentuais clássicos de ramp-up: leve→médio→quase a carga, com reps decrescentes.
const RAMP: { pct: number; reps: string }[] = [
  { pct: 0.5, reps: "8" },
  { pct: 0.7, reps: "5" },
  { pct: 0.85, reps: "3" },
];

export interface WarmupSetInput { weight: string; reps: string }

/** Arredonda para o incremento de anilha mais próximo (2,5 kg). */
function roundLoad(kg: number): number {
  return Math.max(0, Math.round(kg / 2.5) * 2.5);
}

// Formata sem zeros à toa, com PONTO decimal (formato que o input de carga parseia).
function fmt(kg: number): string {
  return (Math.round(kg * 100) / 100).toString();
}

/**
 * Monta a rampa de aquecimento para uma carga de trabalho.
 * Retorna [] quando não faz sentido (carga ≤ 0 ou peso corporal puro).
 * Descarta degraus que zeram, repetem ou alcançam a carga de trabalho.
 */
export function buildWarmupRamp(workWeight: number, equipment?: Equipment): WarmupSetInput[] {
  if (!(workWeight > 0) || equipment === "bodyweight") return [];
  const out: WarmupSetInput[] = [];
  const seen = new Set<number>();
  for (const step of RAMP) {
    const w = roundLoad(workWeight * step.pct);
    if (w <= 0 || w >= workWeight || seen.has(w)) continue;
    seen.add(w);
    out.push({ weight: fmt(w), reps: step.reps });
  }
  return out;
}
