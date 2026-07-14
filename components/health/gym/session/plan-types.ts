// Tipos e helpers PUROS da Ficha de treino estruturada (Plano → Divisões A/B/C →
// Exercícios + Metas tipadas). Sem DOM/localStorage — importável por client e server.

import type { Equipment } from "./session-types";
import { guessTimed, uid } from "./session-types";

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
  /** Medido por TEMPO (esteira, prancha, isometria): minReps/maxReps = SEGUNDOS. */
  timed?: boolean;
  target: ExerciseTarget;
  note?: string;
}

export interface PlanDivision {           // Treino A / B / C
  id: string;
  label: string;                          // "A — Peito/Tríceps"
  muscleGroups: string[];
  defaultRestSeconds: number;
  /** Dias da semana agendados (0=domingo … 6=sábado). Vazio/ausente = sem agenda. */
  weekdays?: number[];
  exercises: PlanExercise[];
}

/** Rótulos curtos dos dias (índice = getDay()). */
export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** A divisão está agendada para hoje? */
export function isScheduledToday(div: PlanDivision, now: Date = new Date()): boolean {
  return !!div.weekdays && div.weekdays.includes(now.getDay());
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
  const timed = guessTimed(name);
  return {
    id: uid("pex"), name: name.trim(), group, equipment,
    ...(timed ? { timed: true } : {}),
    // Por tempo, a "faixa" nasce em segundos úteis (30–60s) em vez de 8–12 reps.
    target: timed ? { sets: 3, minReps: 30, maxReps: 60 } : newTarget(),
  };
}
export function newDivision(label: string): PlanDivision {
  return { id: uid("div"), label, muscleGroups: [], defaultRestSeconds: 90, exercises: [] };
}
export function newPlan(name: string, goal: PlanGoal = "hypertrophy"): WorkoutPlan {
  return { id: uid("plan"), name: name.trim() || "Nova ficha", goal, divisions: [newDivision("Treino A")] };
}

// ---- Apresentação ----
/** Segundos legíveis: 40 → "40s"; 600 → "10 min"; 90 → "1min30". */
export function fmtSeconds(n: number): string {
  if (n >= 60 && n % 60 === 0) return `${n / 60} min`;
  if (n > 60) return `${Math.floor(n / 60)}min${String(n % 60).padStart(2, "0")}`;
  return `${n}s`;
}

/** "3 × 8-12 · RIR 2" — por tempo: "3 × 40-60s" / "1 × 10 min". */
export function formatTarget(t: ExerciseTarget, timed = false): string {
  const reps = timed
    ? t.minReps === t.maxReps ? fmtSeconds(t.minReps) : `${t.minReps}-${t.maxReps}s`
    : t.minReps === t.maxReps ? `${t.minReps}` : `${t.minReps}-${t.maxReps}`;
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
  // Teto 3600: metas por TEMPO guardam segundos aqui (ex.: esteira 600s).
  let minReps = Math.max(1, Math.min(3600, Math.round(num(r.minReps, 8))));
  let maxReps = Math.max(1, Math.min(3600, Math.round(num(r.maxReps, 12))));
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
    ...(r.timed === true ? { timed: true } : {}),
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
  const weekdays = Array.isArray(r.weekdays)
    ? Array.from(new Set(r.weekdays
        .map((d) => Math.round(num(d, -1)))
        .filter((d) => d >= 0 && d <= 6)))
        .sort((a, b) => a - b)
    : undefined;
  return {
    id: typeof r.id === "string" ? r.id : uid("div"),
    label,
    muscleGroups: Array.isArray(r.muscleGroups) ? r.muscleGroups.filter((g): g is string => typeof g === "string") : [],
    defaultRestSeconds: Math.max(0, Math.round(num(r.defaultRestSeconds, 90))),
    ...(weekdays && weekdays.length ? { weekdays } : {}),
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
