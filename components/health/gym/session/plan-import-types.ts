// Tipos do import de ficha por foto. Vivem FORA da server action (plan-vision.ts,
// "use server") porque componentes client importam `ImportedPlan` como tipo — e
// um arquivo "use server" só deveria exportar funções async. Módulo puro (sem DOM
// nem server), importável por qualquer lado.

import type { PlanGoal, PlanDivision } from "./plan-types";

export interface ImportedPlan {
  name: string;
  goal: PlanGoal;
  divisions: PlanDivision[];
}

export interface ImportPlanResult {
  success: boolean;
  message: string;
  plan?: ImportedPlan;
}
