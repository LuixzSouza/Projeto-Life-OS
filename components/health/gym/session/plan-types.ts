// Tipos e helpers PUROS da Ficha de treino estruturada (Plano → Divisões A/B/C →
// Exercícios + Metas tipadas). Sem DOM/localStorage — importável por client e server.

import type { Equipment } from "./session-types";
import { uid } from "./session-types";

export type PlanGoal = "hypertrophy" | "strength" | "endurance" | "general";

export const PLAN_GOAL_META: Record<PlanGoal, { label: string }> = {
  hypertrophy: { label: "Hipertrofia" },
  strength: { label: "Força" },
  endurance: { label: "Resistência" },
  general: { label: "Geral" },
};

export type IntensityType = "RIR" | "RPE";
export interface Intensity {
  type: IntensityType;
  value: number; // RIR: reps em reserva (0–6) · RPE: esforço percebido (5–10)
}

/** Meta TIPADA do exercício (nunca string "3x8-12"). */
export interface ExerciseTarget {
  sets: number;          // séries-alvo
  minReps: number;
  maxReps: number;       // == minReps → reps fixas
  intensity?: Intensity; // RIR ou RPE (opcional)
  restSeconds?: number;  // override do descanso da divisão
  technique?: string;    // "drop-set", "rest-pause"… (livre na v1)
}

export interface PlanExercise {
  id: string;
  name: string;
  group?: string;
  equipment?: Equipment;
  target: ExerciseTarget;
  note?: string;
}

export interface PlanDivision {           // Treino A / B / C
  id: string;
  label: string;                          // "A — Peito/Tríceps"
  muscleGroups: string[];
  defaultRestSeconds: number;
  exercises: PlanExercise[];
}

/** Conteúdo serializado no JSON da coluna `WorkoutPlan.content`. */
export interface PlanContent {
  v: 1;
  divisions: PlanDivision[];
}

/** Ficha completa no cliente (colunas + conteúdo). */
export interface WorkoutPlan {
  id: string;
  name: string;
  goal: PlanGoal;
  divisions: PlanDivision[];
  createdAt?: string;
  updatedAt?: string;
}

// ---- Factories ----
export function newTarget(): ExerciseTarget {
  return { sets: 3, minReps: 8, maxReps: 12 };
}
export function newPlanExercise(name: string, group?: string, equipment?: Equipment): PlanExercise {
  return { id: uid("pex"), name: name.trim(), group, equipment, target: newTarget() };
}
export function newDivision(label: string): PlanDivision {
  return { id: uid("div"), label, muscleGroups: [], defaultRestSeconds: 90, exercises: [] };
}
export function newPlan(name: string, goal: PlanGoal = "hypertrophy"): WorkoutPlan {
  return { id: uid("plan"), name: name.trim() || "Nova ficha", goal, divisions: [newDivision("Treino A")] };
}

// ---- Apresentação ----
/** "3 × 8-12 · RIR 2" */
export function formatTarget(t: ExerciseTarget): string {
  const reps = t.minReps === t.maxReps ? `${t.minReps}` : `${t.minReps}-${t.maxReps}`;
  const base = `${t.sets} × ${reps}`;
  return t.intensity ? `${base} · ${t.intensity.type} ${t.intensity.value}` : base;
}

export function totalExercises(plan: WorkoutPlan): number {
  return plan.divisions.reduce((acc, d) => acc + d.exercises.length, 0);
}

// ---- Parse/sanitize defensivo (JSON da coluna ou import) ----
const goals: PlanGoal[] = ["hypertrophy", "strength", "endurance", "general"];
const num = (v: unknown, d: number): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : d;
};

export function coerceGoal(v: unknown): PlanGoal {
  return typeof v === "string" && (goals as string[]).includes(v) ? (v as PlanGoal) : "general";
}

function sanitizeTarget(v: unknown): ExerciseTarget {
  const r = (typeof v === "object" && v ? v : {}) as Record<string, unknown>;
  const sets = Math.max(1, Math.min(20, Math.round(num(r.sets, 3))));
  let minReps = Math.max(1, Math.min(100, Math.round(num(r.minReps, 8))));
  let maxReps = Math.max(1, Math.min(100, Math.round(num(r.maxReps, 12))));
  if (maxReps < minReps) [minReps, maxReps] = [maxReps, minReps];
  let intensity: Intensity | undefined;
  if (r.intensity && typeof r.intensity === "object") {
    const ir = r.intensity as Record<string, unknown>;
    const type = ir.type === "RPE" ? "RPE" : ir.type === "RIR" ? "RIR" : null;
    if (type) intensity = { type, value: Math.max(0, Math.min(10, Math.round(num(ir.value, type === "RPE" ? 8 : 2)))) };
  }
  return {
    sets, minReps, maxReps, intensity,
    restSeconds: r.restSeconds != null ? Math.max(0, Math.round(num(r.restSeconds, 90))) : undefined,
    technique: typeof r.technique === "string" && r.technique.trim() ? r.technique.trim() : undefined,
  };
}

function sanitizeExercise(v: unknown): PlanExercise | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (!name) return null;
  return {
    id: typeof r.id === "string" ? r.id : uid("pex"),
    name,
    group: typeof r.group === "string" ? r.group : undefined,
    equipment: typeof r.equipment === "string" ? (r.equipment as Equipment) : undefined,
    target: sanitizeTarget(r.target),
    note: typeof r.note === "string" && r.note.trim() ? r.note.trim() : undefined,
  };
}

function sanitizeDivision(v: unknown): PlanDivision | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  const label = typeof r.label === "string" && r.label.trim() ? r.label.trim() : "Treino";
  const exercises = Array.isArray(r.exercises)
    ? r.exercises.map(sanitizeExercise).filter((x): x is PlanExercise => x !== null)
    : [];
  return {
    id: typeof r.id === "string" ? r.id : uid("div"),
    label,
    muscleGroups: Array.isArray(r.muscleGroups) ? r.muscleGroups.filter((g): g is string => typeof g === "string") : [],
    defaultRestSeconds: Math.max(0, Math.round(num(r.defaultRestSeconds, 90))),
    exercises,
  };
}

/** Lê as divisões do JSON da coluna `content` com tolerância a dados ruins. */
export function parsePlanDivisions(content: string | null): PlanDivision[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content) as unknown;
    const rec = parsed as Record<string, unknown>;
    const list = Array.isArray(rec?.divisions) ? rec.divisions : Array.isArray(parsed) ? (parsed as unknown[]) : [];
    return list.map(sanitizeDivision).filter((x): x is PlanDivision => x !== null);
  } catch {
    return [];
  }
}

/** Serializa as divisões para a coluna `content`. */
export function stringifyPlanContent(divisions: PlanDivision[]): string {
  const content: PlanContent = { v: 1, divisions };
  return JSON.stringify(content);
}
