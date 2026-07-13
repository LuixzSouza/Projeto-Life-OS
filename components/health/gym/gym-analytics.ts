// Helpers PUROS de análise de treino (séries de trabalho, volume por músculo,
// 1RM, semanas). Compartilhados pelos cards de progresso — sem DOM/estado.

import { startOfWeek, differenceInCalendarWeeks, format } from "date-fns";
import { loadMultiplier, type Equipment, type MuscleRecovery } from "./session/session-types";
import { groupOfExercise } from "./exercise-db";
import type { Exercise, GymWorkout } from "./gym-types";

export const num = (v: string | undefined): number => parseFloat((v || "").replace(",", ".")) || 0;

export interface WorkSet {
  weight: number; // carga digitada (por mão, se halter)
  reps: number;
  mult: number;   // multiplicador de volume (halter = 2)
}

/** Séries de TRABALHO de um exercício (ignora aquecimento). Usa o setLog real da
 *  sessão ao vivo quando existe; senão expande o resumo sets×reps×peso. */
export function workingSets(ex: Exercise): WorkSet[] {
  const mult = loadMultiplier(ex.equipment as Equipment | undefined);
  if (ex.setLog && ex.setLog.length > 0) {
    return ex.setLog
      .filter((s) => s.done && s.type !== "warmup")
      .map((s) => ({ weight: num(s.weight), reps: num(s.reps), mult }));
  }
  const sets = Math.max(0, Math.round(num(ex.sets)));
  const weight = num(ex.weight);
  const reps = num(ex.reps);
  return Array.from({ length: sets }, () => ({ weight, reps, mult }));
}

/** Grupo muscular do exercício (campo salvo → heurística por nome → "Outros"). */
export function muscleOf(ex: Exercise): string {
  return ex.group || groupOfExercise(ex.name) || "Outros";
}

/** 1RM estimado (Epley) de uma série — mesma fórmula do card de recordes. */
export function epley1RM(weight: number, reps: number, mult: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * mult * (1 + reps / 30);
}

/** Melhor 1RM estimado das séries de trabalho de um exercício. */
export function bestOneRm(ex: Exercise): number {
  let best = 0;
  for (const s of workingSets(ex)) best = Math.max(best, epley1RM(s.weight, s.reps, s.mult));
  return Math.round(best);
}

/** Volume (kg movidos) das séries de trabalho de um exercício. */
export function exerciseVolume(ex: Exercise): number {
  let vol = 0;
  for (const s of workingSets(ex)) vol += s.weight * s.reps * s.mult;
  return vol;
}

/** Segunda-feira 00:00 da semana da data (semana ISO, início na segunda). */
export function weekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/** Quantas semanas ATRÁS (0 = semana atual) a data caiu, relativo a hoje. */
export function weeksAgo(date: Date, now: Date = new Date()): number {
  return differenceInCalendarWeeks(now, date, { weekStartsOn: 1 });
}

// ---- Volume semanal por grupo muscular (MEV/MAV/MRV) ----

/** Marcos de séries semanais por grupo (aproximação da literatura de hipertrofia
 *  — RP/Israetel). MV=manutenção, MEV=mínimo p/ crescer, MAV=ótimo, MRV=máximo. */
export interface Landmarks { mv: number; mev: number; mav: number; mrv: number }
const DEFAULT_LANDMARKS: Landmarks = { mv: 4, mev: 8, mav: 16, mrv: 22 };
const LANDMARKS_BY_GROUP: Record<string, Landmarks> = {
  Peito: { mv: 4, mev: 8, mav: 16, mrv: 22 },
  Costas: { mv: 6, mev: 10, mav: 18, mrv: 25 },
  Pernas: { mv: 6, mev: 8, mav: 16, mrv: 22 },
  Ombros: { mv: 4, mev: 8, mav: 16, mrv: 22 }, // laterais aguentam mais, média aqui
  Biceps: { mv: 4, mev: 6, mav: 14, mrv: 20 },
  Triceps: { mv: 4, mev: 6, mav: 14, mrv: 18 },
  Abdomen: { mv: 0, mev: 6, mav: 16, mrv: 25 },
  Gluteos: { mv: 0, mev: 4, mav: 12, mrv: 16 },
  Antebraco: { mv: 0, mev: 4, mav: 12, mrv: 20 },
};
export function landmarksFor(group: string): Landmarks {
  return LANDMARKS_BY_GROUP[group] ?? DEFAULT_LANDMARKS;
}

export type VolumeStatus = "low" | "maintenance" | "optimal" | "high" | "over";
export function statusFor(sets: number, lm: Landmarks): VolumeStatus {
  if (sets < lm.mv) return "low";
  if (sets < lm.mev) return "maintenance";
  if (sets <= lm.mav) return "optimal";
  if (sets <= lm.mrv) return "high";
  return "over";
}

export interface MuscleVolume {
  group: string;
  sets: number;
  landmarks: Landmarks;
  status: VolumeStatus;
}

/** Conta séries de trabalho por grupo muscular dentro de uma janela de semanas
 *  (0 = só a semana atual). Cardio é ignorado (não é volume de força). */
export function weeklyMuscleVolume(workouts: GymWorkout[], withinWeeks = 0): MuscleVolume[] {
  const now = new Date();
  const counts: Record<string, number> = {};
  for (const w of workouts) {
    if (weeksAgo(new Date(w.date), now) > withinWeeks) continue;
    for (const ex of w.exercises) {
      const group = muscleOf(ex);
      if (group === "Cardio") continue;
      counts[group] = (counts[group] || 0) + workingSets(ex).length;
    }
  }
  return Object.entries(counts)
    .map(([group, sets]) => {
      const landmarks = landmarksFor(group);
      return { group, sets, landmarks, status: statusFor(sets, landmarks) };
    })
    .sort((a, b) => b.sets - a.sets);
}

// ---- Sobrecarga progressiva (dupla progressão) ----

export interface OverloadHint {
  kind: "up" | "rep";
  message: string;
}

/** Sugestão de progressão para a PRÓXIMA sessão de um exercício, no modelo de
 *  "dupla progressão": no topo da faixa de reps → sobe a carga e volta ao piso;
 *  no meio da faixa → mantém a carga e busca +1 rep. Peso corporal progride por
 *  reps/variação. Retorna null sem histórico útil. */
export function overloadHint(
  last: { weight?: string; reps?: string } | undefined,
  target: { minReps: number; maxReps: number } | undefined,
  opts: { bodyweight: boolean; perHand: boolean; increment?: number },
): OverloadHint | null {
  if (!last) return null;
  const w = num(last.weight);
  const r = num(last.reps);
  if (r <= 0) return null;
  const maxReps = target?.maxReps ?? 12;
  const minReps = target?.minReps ?? Math.max(1, maxReps - 4);
  const unit = opts.perHand ? "kg/mão" : "kg";

  if (r >= maxReps) {
    if (!opts.bodyweight && w > 0) {
      // Halteres sobem em passos menores por mão (2 kg) que barra/máquina (2,5 kg).
      const inc = opts.increment ?? (opts.perHand ? 2 : 2.5);
      const next = Math.round((w + inc) * 100) / 100;
      return { kind: "up", message: `Fechou ${r} reps com ${last.weight}${unit} — hoje tente ${next}${unit} × ${minReps}.` };
    }
    return { kind: "rep", message: `Fechou ${r} reps — busque ${r + 1} hoje ou uma variação mais difícil.` };
  }
  // Meio da faixa: mesma carga, +1 rep (progride reps antes da carga).
  const weightPart = opts.bodyweight || w <= 0 ? "" : ` com ${last.weight}${unit}`;
  return { kind: "rep", message: `Última vez ${r} reps${weightPart} — busque ${r + 1}+ hoje (mesma carga).` };
}

// ---- Frequência diária (heatmap de contribuição) ----

export interface DayTraining {
  sets: number;       // séries de trabalho somadas no dia
  volume: number;     // kg movidos no dia
  sessions: number;   // nº de treinos no dia
  titles: string[];   // títulos dos treinos (tooltip)
}

/** Agrega treinos por DIA local (chave yyyy-MM-dd) para o mapa de frequência. */
export function trainingByDay(workouts: GymWorkout[]): Map<string, DayTraining> {
  const map = new Map<string, DayTraining>();
  for (const w of workouts) {
    const key = format(new Date(w.date), "yyyy-MM-dd");
    let sets = 0;
    let volume = 0;
    for (const ex of w.exercises) {
      sets += workingSets(ex).length;
      volume += exerciseVolume(ex);
    }
    const cur = map.get(key) ?? { sets: 0, volume: 0, sessions: 0, titles: [] };
    cur.sets += sets;
    cur.volume += volume;
    cur.sessions += 1;
    cur.titles.push(w.title);
    map.set(key, cur);
  }
  return map;
}

/** Intensidade 0–4 de um dia (séries de trabalho) para a escala de cor do heatmap. */
export function dayLevel(sets: number, sessions: number): 0 | 1 | 2 | 3 | 4 {
  if (sessions <= 0) return 0;
  if (sets >= 21) return 4;
  if (sets >= 13) return 3;
  if (sets >= 6) return 2;
  return 1; // treinou, mas volume baixo (ou só cardio/leve)
}

// ---- Recomendação "Treino de hoje" ----

// Grupos que entram na recomendação de força (Cardio não é volume de hipertrofia;
// Antebraço costuma ser secundário e sai da sugestão principal).
const TRAINABLE_GROUPS = ["Peito", "Costas", "Pernas", "Ombros", "Biceps", "Triceps", "Abdomen", "Gluteos"];

export interface TodayRec {
  group: string;
  score: number;        // prioridade (maior = treinar hoje)
  sets: number;         // séries desta semana
  status: VolumeStatus;
  recovery: number;     // 0..1 (1 = descansado/sem registro)
  daysSince: number | null;
  reason: string;       // motivo curto e humano
  avoid: boolean;       // fadigado OU saturado de volume → não hoje
}

/** Recomenda o que treinar hoje cruzando: déficit de volume semanal (abaixo do
 *  MEV puxa forte), recuperação muscular (fadigado = evita) e frescor (dias
 *  parado). Ordena do mais prioritário ao menos. */
export function recommendToday(workouts: GymWorkout[], recovery: MuscleRecovery[]): TodayRec[] {
  const vol = new Map(weeklyMuscleVolume(workouts, 0).map((v) => [v.group, v]));
  const rec = new Map(recovery.map((r) => [r.group, r]));
  const out: TodayRec[] = [];

  for (const group of TRAINABLE_GROUPS) {
    const v = vol.get(group);
    const sets = v?.sets ?? 0;
    const lm = v?.landmarks ?? landmarksFor(group);
    const status = v?.status ?? statusFor(0, lm);
    const r = rec.get(group);
    const recoveryVal = r && r.lastTrainedAt ? r.recovery : 1;
    const daysSince = r && r.hoursSince != null ? Math.round(r.hoursSince / 24) : null;

    const fatigued = recoveryVal < 0.7;
    const saturated = status === "high" || status === "over";

    // Déficit de volume (0..1): sem/pouco volume esta semana puxa a prioridade.
    let deficit: number;
    if (sets < lm.mev) deficit = 1 - (Math.max(0, sets) / Math.max(1, lm.mev)) * 0.5; // 0.5..1
    else if (sets <= lm.mav) deficit = 0.35;
    else deficit = 0.05;

    // Frescor (0..1): mais dias parado → maior; sem registro recente = 1.
    const freshness = daysSince == null ? 1 : Math.min(1, daysSince / 4);

    let score = 0.5 * deficit + 0.3 * freshness + 0.2 * recoveryVal;
    if (fatigued) score *= 0.15;   // ainda dolorido → deixa descansar
    if (saturated) score *= 0.3;   // já treinou muito na semana → poupa

    const reason = fatigued
      ? `ainda recuperando (${Math.round(recoveryVal * 100)}%)`
      : saturated
        ? `já bem treinado (${sets} séries/sem)`
        : sets < lm.mev
          ? sets === 0 ? "sem volume esta semana" : `abaixo do ideal (${sets} séries)`
          : daysSince != null && daysSince >= 3
            ? `descansado há ${daysSince}d`
            : "recuperado e pronto";

    out.push({ group, score, sets, status, recovery: recoveryVal, daysSince, reason, avoid: fatigued || saturated });
  }
  return out.sort((a, b) => b.score - a.score);
}

// ---- Equilíbrio de padrões de movimento (push/pull/legs) ----

export type MovementPattern = "push" | "pull" | "legs" | "core";

const PATTERN_OF: Record<string, MovementPattern> = {
  Peito: "push", Ombros: "push", Triceps: "push",
  Costas: "pull", Biceps: "pull", Antebraco: "pull",
  Pernas: "legs", Gluteos: "legs",
  Abdomen: "core",
};

export interface BalancePattern { pattern: MovementPattern; sets: number }
export type BalanceStatus = "balanced" | "push-heavy" | "pull-heavy" | "skip-legs" | "low-data";

export interface MuscleBalance {
  patterns: BalancePattern[];  // sempre push, pull, legs, core nesta ordem
  pushPull: number | null;     // razão push/pull (null se pull = 0)
  status: BalanceStatus;
  insight: string;             // mensagem acionável
  weeks: number;
}

/** Equilíbrio empurrar/puxar/pernas nas últimas `weeks` semanas. Empurrar demais
 *  (peito/ombro/tríceps) sem puxar (costas/bíceps) puxa o ombro à frente — risco
 *  postural clássico; pular pernas cria desproporção. Ratio push:pull ideal ≈ 1. */
export function muscleBalance(workouts: GymWorkout[], weeks = 2): MuscleBalance {
  const now = new Date();
  const acc: Record<MovementPattern, number> = { push: 0, pull: 0, legs: 0, core: 0 };
  for (const w of workouts) {
    if (weeksAgo(new Date(w.date), now) >= weeks) continue;
    for (const ex of w.exercises) {
      const p = PATTERN_OF[muscleOf(ex)];
      if (!p) continue;
      acc[p] += workingSets(ex).length;
    }
  }
  const patterns: BalancePattern[] = (["push", "pull", "legs", "core"] as MovementPattern[]).map((pattern) => ({ pattern, sets: acc[pattern] }));
  const upper = acc.push + acc.pull;
  const pushPull = acc.pull > 0 ? acc.push / acc.pull : acc.push > 0 ? Infinity : null;

  let status: BalanceStatus;
  let insight: string;
  if (upper + acc.legs < 8) {
    status = "low-data";
    insight = "Registre mais treinos para analisar o equilíbrio empurrar/puxar.";
  } else if (pushPull !== null && (pushPull === Infinity || pushPull >= 1.4)) {
    status = "push-heavy";
    insight = "Você empurra bem mais do que puxa — inclua remadas/puxadas para equilibrar o ombro e as costas.";
  } else if (pushPull !== null && pushPull <= 0.72) {
    status = "pull-heavy";
    insight = "Você puxa bem mais do que empurra — adicione supino/desenvolvimento para equilibrar.";
  } else if (upper >= 10 && acc.legs < upper / 3) {
    status = "skip-legs";
    insight = "Membros inferiores ficando pra trás — não pule o dia de perna! 🦵";
  } else {
    status = "balanced";
    insight = "Empurrar, puxar e pernas bem equilibrados. Mandou bem! 👏";
  }

  return { patterns, pushPull, status, insight, weeks };
}

// ---- Consistência / streak ----

export interface Consistency {
  streakWeeks: number;     // semanas consecutivas (terminando na atual/anterior) com ≥1 treino
  thisWeek: number;        // treinos na semana atual
  lastWeek: number;        // treinos na semana passada
  weeklyAvg: number;       // média de treinos/semana nas últimas ~8 semanas ativas
  totalWorkouts: number;
}

export function consistency(workouts: GymWorkout[]): Consistency {
  const now = new Date();
  const perWeek = new Map<number, number>(); // weeksAgo → contagem
  for (const w of workouts) {
    const wa = weeksAgo(new Date(w.date), now);
    if (wa < 0) continue;
    perWeek.set(wa, (perWeek.get(wa) || 0) + 1);
  }
  const thisWeek = perWeek.get(0) || 0;
  const lastWeek = perWeek.get(1) || 0;

  // Streak: semanas consecutivas com ≥1 treino. A semana atual só conta se já
  // treinou nela; senão o streak é medido a partir da semana passada (não punir
  // por ainda não ter treinado hoje).
  let streak = 0;
  const start = thisWeek > 0 ? 0 : 1;
  for (let wk = start; ; wk++) {
    if ((perWeek.get(wk) || 0) > 0) streak++;
    else break;
  }
  // Se começou em 1 (semana atual vazia) e a semana passada também estava vazia,
  // não há streak vivo.
  if (start === 1 && streak === 0) streak = 0;

  // Média nas últimas 8 semanas contando a partir da 1ª semana com treino.
  const active = [...perWeek.keys()];
  const oldest = active.length ? Math.min(8, Math.max(...active) + 1) : 0;
  let sum = 0;
  for (let wk = 0; wk < oldest; wk++) sum += perWeek.get(wk) || 0;
  const weeklyAvg = oldest > 0 ? sum / oldest : 0;

  return { streakWeeks: streak, thisWeek, lastWeek, weeklyAvg, totalWorkouts: workouts.length };
}
