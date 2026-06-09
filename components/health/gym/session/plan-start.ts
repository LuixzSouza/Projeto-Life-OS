// Converte uma divisão da Ficha (Treino A/B/C) nas opções de início da sessão ao
// vivo — leva as METAS tipadas (reps min-max, RIR/RPE, descanso por exercício) pros
// "fantasmas" da sessão. Puro (sem DOM), usado pelo builder e pelo "Treinar agora".

import { groupOfExercise } from "../exercise-db";
import type { StartOptions } from "./session-types";
import type { PlanDivision, WorkoutPlan } from "./plan-types";

export function divisionToStart(plan: WorkoutPlan, div: PlanDivision): StartOptions {
  const groups = div.muscleGroups.length
    ? div.muscleGroups
    : Array.from(new Set(div.exercises.map((e) => e.group ?? groupOfExercise(e.name)).filter((g): g is string => !!g)));
  return {
    title: `${plan.name} · ${div.label}`,
    muscleGroups: groups,
    restSeconds: div.defaultRestSeconds,
    exercises: div.exercises.map((e) => ({
      name: e.name,
      group: e.group,
      equipment: e.equipment,
      sets: e.target.sets,
      reps: e.target.minReps === e.target.maxReps ? String(e.target.minReps) : "",
      weight: "",
      // Leva também o override de descanso do exercício (ex.: 120s no agachamento);
      // ausente → a sessão usa o descanso padrão da divisão.
      target: { minReps: e.target.minReps, maxReps: e.target.maxReps, intensity: e.target.intensity, restSeconds: e.target.restSeconds },
    })),
  };
}
