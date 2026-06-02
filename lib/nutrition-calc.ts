// Cálculos nutricionais centralizados (TDEE / metas calóricas).
// Fórmula de Mifflin-St Jeor — padrão clínico para gasto energético.

export interface BodyProfileInput {
  weight: number;          // kg
  height: number;          // cm
  gender: string;          // "MALE" | "FEMALE" (tolerante a variações)
  activity: number;        // fator de atividade (1.2 sedentário … 1.9 atleta)
  birthDate?: string | Date | null;
}

export interface GoalTarget {
  tdee: number;            // gasto energético total estimado (manutenção)
  goal: number;            // meta sugerida para o objetivo escolhido
}

export type NutritionObjective = "LOSE" | "MAINTAIN" | "GAIN";

// Ajustes calóricos por objetivo (déficit/superávit moderado e seguro).
export const OBJECTIVE_DELTA: Record<NutritionObjective, number> = {
  LOSE: -400,
  MAINTAIN: 0,
  GAIN: 400,
};

export const ACTIVITY_LEVELS: { value: number; label: string; hint: string }[] = [
  { value: 1.2, label: "Sedentário", hint: "Pouco ou nenhum exercício" },
  { value: 1.375, label: "Leve", hint: "Exercício leve 1–3x/semana" },
  { value: 1.55, label: "Moderado", hint: "Exercício moderado 3–5x/semana" },
  { value: 1.725, label: "Intenso", hint: "Exercício pesado 6–7x/semana" },
  { value: 1.9, label: "Atleta", hint: "Treino muito intenso / 2x ao dia" },
];

/** Calcula a idade em anos a partir da data de nascimento. */
export function ageFromBirthDate(birthDate?: string | Date | null): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

function isFemale(gender: string): boolean {
  return /fem|mulher|^f$/i.test((gender || "").trim());
}

/**
 * Taxa Metabólica Basal (Mifflin-St Jeor).
 * Retorna null quando faltam dados essenciais (peso/altura).
 */
export function calculateBMR(profile: BodyProfileInput): number | null {
  if (!profile?.weight || !profile?.height) return null;
  const age = ageFromBirthDate(profile.birthDate) ?? 30; // fallback razoável
  const base = 10 * profile.weight + 6.25 * profile.height - 5 * age;
  return Math.round(base + (isFemale(profile.gender) ? -161 : 5));
}

/** Gasto energético total (TDEE = BMR × fator de atividade). */
export function calculateTDEE(profile: BodyProfileInput): number | null {
  const bmr = calculateBMR(profile);
  if (bmr === null) return null;
  const activity = profile.activity && profile.activity > 0 ? profile.activity : 1.2;
  return Math.round((bmr * activity) / 10) * 10; // múltiplo de 10
}

/**
 * Meta calórica sugerida a partir do perfil e do objetivo.
 * Retorna null se não há perfil corporal suficiente.
 */
export function suggestDailyGoal(
  profile: BodyProfileInput | null | undefined,
  objective: NutritionObjective = "MAINTAIN"
): GoalTarget | null {
  if (!profile) return null;
  const tdee = calculateTDEE(profile);
  if (tdee === null) return null;
  const goal = Math.max(1000, Math.round((tdee + OBJECTIVE_DELTA[objective]) / 10) * 10);
  return { tdee, goal };
}
