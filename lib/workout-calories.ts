// Ponte Treino → Nutrição: estima o gasto calórico de uma sessão de treino.
// Abordagem MET (Compendium of Physical Activities) — transparente e sem libs:
//   kcal ≈ MET × peso(kg) × duração(h)
// Para atividades com distância (corrida/ciclismo), usa kcal ≈ 1.03 × peso × km,
// que é mais fiel ao esforço real do que tempo×MET. Sem peso do perfil, cai para 70kg.

export interface WorkoutBurnInput {
  type?: string | null;        // "GYM", "RUN", "CARDIO"…
  durationMin: number;         // duração em minutos
  intensity?: string | null;   // "LOW" | "MEDIUM" | "HIGH"
  distanceKm?: number | null;  // quando houver (corrida/ciclismo)
  bodyWeightKg?: number | null; // peso corporal (BodyMeasurement); null → 70kg
}

const DEFAULT_WEIGHT_KG = 70;

// MET por intensidade — treino de força (musculação).
const STRENGTH_MET: Record<"LOW" | "MEDIUM" | "HIGH", number> = { LOW: 3.5, MEDIUM: 5, HIGH: 6 };
// MET por intensidade — atividades genéricas (sem distância conhecida).
const GENERIC_MET: Record<"LOW" | "MEDIUM" | "HIGH", number> = { LOW: 3.5, MEDIUM: 5.5, HIGH: 7.5 };

function normIntensity(v?: string | null): "LOW" | "MEDIUM" | "HIGH" {
  const s = (v ?? "").toUpperCase();
  return s === "LOW" || s === "MEDIUM" || s === "HIGH" ? s : "MEDIUM";
}

/** Estimativa de calorias gastas em UM treino. Retorna 0 se não há base de cálculo. */
export function estimateWorkoutCalories(w: WorkoutBurnInput): number {
  const weight = w.bodyWeightKg && w.bodyWeightKg > 0 ? w.bodyWeightKg : DEFAULT_WEIGHT_KG;
  const type = (w.type ?? "").toUpperCase();
  const intensity = normIntensity(w.intensity);

  // Corrida/ciclismo com distância → estimativa por km (mais fiel).
  if (w.distanceKm && w.distanceKm > 0 && /RUN|CORR|CARDIO|BIKE|CICL/.test(type)) {
    return Math.round(1.03 * weight * w.distanceKm);
  }

  const minutes = Math.max(0, w.durationMin || 0);
  if (minutes <= 0) return 0;
  const hours = minutes / 60;
  // Sem tipo definido assume musculação (origem mais comum da sessão ao vivo).
  const isStrength = type === "" || /GYM|FORC|FORÇ|MUSC|STRENGTH|WEIGHT/.test(type);
  const met = isStrength ? STRENGTH_MET[intensity] : GENERIC_MET[intensity];
  return Math.round(met * weight * hours);
}

/** Soma o gasto estimado de vários treinos (ex.: todos os treinos do dia). */
export function estimateDayBurn(workouts: WorkoutBurnInput[]): number {
  return workouts.reduce((acc, w) => acc + estimateWorkoutCalories(w), 0);
}
