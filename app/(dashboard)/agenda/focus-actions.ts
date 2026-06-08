"use server";

// Server actions do Modo Foco (Pomodoro / cronômetro) — Fase 1 (Time-Blocking + Foco).
// O timer roda 100% no cliente (local-first, resumível após refresh); aqui só
// PERSISTIMOS o histórico de cada intervalo de foco concluído e servimos os dados
// que o painel precisa (tarefas para vincular + resumo do dia).

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId, getCurrentUserId } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export interface FocusableTask {
  id: string;
  title: string;
  projectTitle: string | null;
  projectColor: string | null;
}

// Tarefas em aberto que podem ancorar uma sessão de foco (vínculo opcional).
export async function getFocusableTasks(): Promise<FocusableTask[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const tasks = await prisma.task.findMany({
    where: { userId, isDone: false, deletedAt: null },
    orderBy: [{ isPinned: "desc" }, { priority: "asc" }, { createdAt: "desc" }],
    take: 40,
    select: {
      id: true,
      title: true,
      project: { select: { title: true, color: true } },
    },
  });

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    projectTitle: t.project?.title ?? null,
    projectColor: t.project?.color ?? null,
  }));
}

export interface LogFocusInput {
  label?: string | null;
  minutes: number;
  mode?: string; // POMODORO | STOPWATCH
  cycles?: number;
  taskId?: string | null;
  eventId?: string | null;
  startedAt: number; // epoch ms
}

export interface FocusTodaySummary {
  minutes: number;
  sessions: number;
  cycles: number;
}

// Registra UM intervalo de foco concluído (não conta pausas). Idempotência não é
// necessária: cada conclusão é um evento real distinto. Retorna o resumo do dia
// para o painel atualizar o contador sem um round-trip extra.
export async function logFocusSession(
  input: LogFocusInput
): Promise<{ success: boolean; today: FocusTodaySummary }> {
  const userId = await requireUserId();

  const minutes = Math.max(0, Math.round(input.minutes));
  const cycles = Math.max(1, Math.round(input.cycles ?? 1));
  const mode = input.mode === "STOPWATCH" ? "STOPWATCH" : "POMODORO";
  const label = input.label?.trim() || null;
  const startedAt = new Date(input.startedAt);

  // Valida o vínculo de tarefa (só guarda o id se for do próprio usuário e existir).
  let taskId: string | null = null;
  if (input.taskId) {
    const task = await prisma.task.findFirst({
      where: { id: input.taskId, userId },
      select: { id: true },
    });
    taskId = task?.id ?? null;
  }

  if (minutes > 0) {
    await prisma.focusSession.create({
      data: {
        userId,
        label,
        minutes,
        mode,
        cycles,
        taskId,
        eventId: input.eventId || null,
        startedAt,
      },
    });

    await logActivity({
      action: "COMPLETE",
      module: "agenda",
      entityType: "focus",
      summary: `Concluiu ${minutes} min de foco${label ? ` · ${label}` : ""}`,
    });
  }

  revalidatePath("/agenda");
  return { success: true, today: await getFocusToday(userId) };
}

// Resumo do dia (00:00 local → agora). Aceita um userId já resolvido para evitar
// uma segunda leitura do JWT quando chamado logo após logFocusSession.
export async function getFocusToday(presolvedUserId?: string): Promise<FocusTodaySummary> {
  const userId = presolvedUserId ?? (await getCurrentUserId());
  if (!userId) return { minutes: 0, sessions: 0, cycles: 0 };

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const rows = await prisma.focusSession.findMany({
    where: { userId, endedAt: { gte: start } },
    select: { minutes: true, cycles: true },
  });

  return {
    minutes: rows.reduce((acc, r) => acc + r.minutes, 0),
    sessions: rows.length,
    cycles: rows.reduce((acc, r) => acc + r.cycles, 0),
  };
}

// ----------------------------------------------------------------------------
// Estatísticas de foco (últimos 7 dias) — alimenta a aba "Foco" da Agenda.
// ----------------------------------------------------------------------------

export interface FocusDayStat {
  date: string; // ISO (00:00 local do dia)
  weekday: number; // 0=Dom..6=Sáb
  minutes: number;
}
export interface FocusLabelStat {
  label: string;
  minutes: number;
  sessions: number;
}
export interface FocusRecent {
  id: string;
  label: string | null;
  minutes: number;
  endedAt: string; // ISO
  mode: string;
}
export interface FocusStats {
  week: FocusDayStat[]; // 7 dias, do mais antigo ao mais recente
  totalMinutes: number;
  sessions: number;
  cycles: number;
  activeDays: number; // dias com ≥1 sessão de foco
  byLabel: FocusLabelStat[]; // top rótulos por minutos
  recent: FocusRecent[];
}

const localDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function getFocusStats(): Promise<FocusStats> {
  const userId = await getCurrentUserId();
  const empty: FocusStats = { week: [], totalMinutes: 0, sessions: 0, cycles: 0, activeDays: 0, byLabel: [], recent: [] };
  if (!userId) return empty;

  // Janela: hoje e os 6 dias anteriores (7 dias), a partir da meia-noite local.
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  const rows = await prisma.focusSession.findMany({
    where: { userId, endedAt: { gte: start } },
    select: { id: true, label: true, minutes: true, cycles: true, mode: true, endedAt: true },
    orderBy: { endedAt: "desc" },
  });

  // Esqueleto dos 7 dias (garante barras mesmo sem sessão).
  const week: FocusDayStat[] = [];
  const dayIndex = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dayIndex.set(localDayKey(d), i);
    week.push({ date: d.toISOString(), weekday: d.getDay(), minutes: 0 });
  }

  const labelMap = new Map<string, { minutes: number; sessions: number }>();
  let totalMinutes = 0;
  let cycles = 0;

  for (const r of rows) {
    totalMinutes += r.minutes;
    cycles += r.cycles;

    const k = localDayKey(new Date(r.endedAt));
    const idx = dayIndex.get(k);
    if (idx != null) week[idx].minutes += r.minutes;

    const label = r.label?.trim() || "Sem rótulo";
    const cur = labelMap.get(label) ?? { minutes: 0, sessions: 0 };
    cur.minutes += r.minutes;
    cur.sessions += 1;
    labelMap.set(label, cur);
  }

  const byLabel: FocusLabelStat[] = [...labelMap.entries()]
    .map(([label, v]) => ({ label, minutes: v.minutes, sessions: v.sessions }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 6);

  const recent: FocusRecent[] = rows.slice(0, 8).map((r) => ({
    id: r.id,
    label: r.label,
    minutes: r.minutes,
    endedAt: r.endedAt.toISOString(),
    mode: r.mode,
  }));

  return {
    week,
    totalMinutes,
    sessions: rows.length,
    cycles,
    activeDays: week.filter((d) => d.minutes > 0).length,
    byLabel,
    recent,
  };
}

// ----------------------------------------------------------------------------
// Motor de Correlação (#8) — "o que move o seu foco?"
// Cruza, por dia, os minutos de foco com energia, treino, sono e hábitos, e
// compara a média de foco entre os grupos. HONESTO: só mostra um padrão quando há
// amostra mínima dos DOIS lados e a diferença é relevante; nunca afirma causa.
// ----------------------------------------------------------------------------

const DRIVER_WINDOW_DAYS = 30;
const MIN_SAMPLE = 3; // dias mínimos em cada grupo
const MIN_DELTA_PCT = 8; // diferença mínima para virar "padrão"

export type DriverKey = "energy" | "workout" | "sleep" | "habits";

export interface DriverInsight {
  key: DriverKey;
  positiveLabel: string;
  otherLabel: string;
  withMinutes: number; // média de foco no grupo "positivo"
  withoutMinutes: number; // média no grupo de comparação
  deltaPct: number; // diferença assinada (positivo = foca mais no grupo positivo)
  samplePositive: number;
  sampleOther: number;
}

export interface FocusDrivers {
  windowDays: number;
  loggedDays: number; // dias com algum sinal registrado
  hasFocus: boolean;
  insights: DriverInsight[];
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function pct(withV: number, withoutV: number): number {
  if (withoutV > 0) return Math.max(-999, Math.min(999, Math.round(((withV - withoutV) / withoutV) * 100)));
  return withV > 0 ? 100 : 0;
}

// Compara a média de foco entre dois grupos de dias e devolve um insight se houver
// amostra e diferença suficientes.
function buildInsight(
  key: DriverKey,
  positiveLabel: string,
  otherLabel: string,
  positiveDays: number[],
  otherDays: number[]
): DriverInsight | null {
  if (positiveDays.length < MIN_SAMPLE || otherDays.length < MIN_SAMPLE) return null;
  const withMinutes = avg(positiveDays);
  const withoutMinutes = avg(otherDays);
  const deltaPct = pct(withMinutes, withoutMinutes);
  if (Math.abs(deltaPct) < MIN_DELTA_PCT) return null;
  return { key, positiveLabel, otherLabel, withMinutes, withoutMinutes, deltaPct, samplePositive: positiveDays.length, sampleOther: otherDays.length };
}

interface DailySignals {
  focusByDay: Map<string, number>;
  energyByDay: Map<string, number>;
  workoutDays: Set<string>;
  sleepByDay: Map<string, number>;
  habitDoneByDay: Map<string, number>;
  activeDays: Set<string>; // dias com algum sinal (evita dias vazios pré-uso)
  sleepGoal: number;
  focusCount: number;
}

// Coleta, por dia, todos os sinais da janela — compartilhado por getFocusDrivers
// e getDailyInsight (uma única passada de queries).
async function collectDailySignals(userId: string, start: Date): Promise<DailySignals> {
  const [focus, energy, workouts, sleeps, habitLogs, settings] = await Promise.all([
    prisma.focusSession.findMany({ where: { userId, endedAt: { gte: start } }, select: { minutes: true, endedAt: true } }),
    prisma.energyCheckin.findMany({ where: { userId, date: { gte: start } }, select: { energy: true, date: true } }),
    prisma.workout.findMany({ where: { userId, date: { gte: start } }, select: { date: true } }),
    prisma.healthMetric.findMany({ where: { userId, type: "SLEEP", date: { gte: start } }, select: { value: true, date: true } }),
    prisma.habitLog.findMany({ where: { userId, date: { gte: start } }, select: { date: true, status: true } }),
    prisma.settings.findUnique({ where: { userId }, select: { sleepGoalHours: true } }),
  ]);

  const focusByDay = new Map<string, number>();
  for (const f of focus) {
    const k = localDayKey(new Date(f.endedAt));
    focusByDay.set(k, (focusByDay.get(k) ?? 0) + f.minutes);
  }

  const energyByDay = new Map<string, number>();
  for (const e of energy) energyByDay.set(localDayKey(new Date(e.date)), e.energy);

  const workoutDays = new Set<string>();
  for (const w of workouts) workoutDays.add(localDayKey(new Date(w.date)));

  const sleepByDay = new Map<string, number>();
  for (const s of sleeps) sleepByDay.set(localDayKey(new Date(s.date)), s.value);

  const habitDoneByDay = new Map<string, number>();
  for (const h of habitLogs) {
    if (h.status !== "DONE") continue;
    const k = localDayKey(new Date(h.date));
    habitDoneByDay.set(k, (habitDoneByDay.get(k) ?? 0) + 1);
  }

  const activeDays = new Set<string>([
    ...focusByDay.keys(), ...energyByDay.keys(), ...workoutDays, ...sleepByDay.keys(), ...habitDoneByDay.keys(),
  ]);

  return {
    focusByDay, energyByDay, workoutDays, sleepByDay, habitDoneByDay, activeDays,
    sleepGoal: settings?.sleepGoalHours ?? 7,
    focusCount: focus.length,
  };
}

export async function getFocusDrivers(): Promise<FocusDrivers> {
  const userId = await getCurrentUserId();
  const empty: FocusDrivers = { windowDays: DRIVER_WINDOW_DAYS, loggedDays: 0, hasFocus: false, insights: [] };
  if (!userId) return empty;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (DRIVER_WINDOW_DAYS - 1));

  const sig = await collectDailySignals(userId, start);
  const { energyByDay, workoutDays, sleepByDay, habitDoneByDay, activeDays, sleepGoal } = sig;
  const focusOf = (day: string) => sig.focusByDay.get(day) ?? 0;

  const insights: DriverInsight[] = [];

  // 1) Energia alta (4–5) vs baixa (1–2)
  {
    const hi: number[] = [], lo: number[] = [];
    for (const [day, e] of energyByDay) {
      if (e >= 4) hi.push(focusOf(day));
      else if (e <= 2) lo.push(focusOf(day));
    }
    const ins = buildInsight("energy", "energia alta (4–5)", "energia baixa (1–2)", hi, lo);
    if (ins) insights.push(ins);
  }

  // 2) Treino vs descanso (sobre dias ativos)
  {
    const withW: number[] = [], without: number[] = [];
    for (const day of activeDays) (workoutDays.has(day) ? withW : without).push(focusOf(day));
    const ins = buildInsight("workout", "dias com treino", "dias sem treino", withW, without);
    if (ins) insights.push(ins);
  }

  // 3) Sono ≥ meta vs abaixo
  {
    const good: number[] = [], poor: number[] = [];
    for (const [day, h] of sleepByDay) (h >= sleepGoal ? good : poor).push(focusOf(day));
    const ins = buildInsight("sleep", `sono ≥ ${sleepGoal}h`, "sono curto", good, poor);
    if (ins) insights.push(ins);
  }

  // 4) Hábitos feitos vs nenhum (sobre dias ativos)
  {
    const withH: number[] = [], without: number[] = [];
    for (const day of activeDays) ((habitDoneByDay.get(day) ?? 0) > 0 ? withH : without).push(focusOf(day));
    const ins = buildInsight("habits", "dias com hábitos em dia", "dias sem hábitos", withH, without);
    if (ins) insights.push(ins);
  }

  insights.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));

  return {
    windowDays: DRIVER_WINDOW_DAYS,
    loggedDays: activeDays.size,
    hasFocus: sig.focusCount > 0,
    insights,
  };
}

// ----------------------------------------------------------------------------
// Insight do dia (Home) — o padrão MAIS FORTE entre vários alvos (foco e energia).
// Mesma honestidade (amostra + diferença mínima). Pensado para um único card.
// ----------------------------------------------------------------------------

export interface DailyInsight {
  driver: DriverKey; // o que varia (treino/sono/hábitos/energia)
  target: "focus" | "energy"; // o que é medido
  unit: "min" | "pts"; // minutos de foco ou pontos de energia (1–5)
  positiveLabel: string;
  otherLabel: string;
  withValue: number;
  withoutValue: number;
  deltaPct: number;
  samplePositive: number;
  sampleOther: number;
}

export interface DailyInsightResult {
  windowDays: number;
  loggedDays: number;
  insight: DailyInsight | null;
}

// Compara dois grupos para um alvo qualquer (foco em min ou energia em pontos).
function compare(
  driver: DriverKey, target: "focus" | "energy", unit: "min" | "pts",
  positiveLabel: string, otherLabel: string, positiveDays: number[], otherDays: number[]
): DailyInsight | null {
  if (positiveDays.length < MIN_SAMPLE || otherDays.length < MIN_SAMPLE) return null;
  const withValue = unit === "pts"
    ? Math.round((positiveDays.reduce((a, b) => a + b, 0) / positiveDays.length) * 10) / 10
    : avg(positiveDays);
  const withoutValue = unit === "pts"
    ? Math.round((otherDays.reduce((a, b) => a + b, 0) / otherDays.length) * 10) / 10
    : avg(otherDays);
  const deltaPct = pct(withValue, withoutValue);
  if (Math.abs(deltaPct) < MIN_DELTA_PCT) return null;
  return { driver, target, unit, positiveLabel, otherLabel, withValue, withoutValue, deltaPct, samplePositive: positiveDays.length, sampleOther: otherDays.length };
}

export async function getDailyInsight(presolvedUserId?: string): Promise<DailyInsightResult> {
  const userId = presolvedUserId ?? (await getCurrentUserId());
  const empty: DailyInsightResult = { windowDays: DRIVER_WINDOW_DAYS, loggedDays: 0, insight: null };
  if (!userId) return empty;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (DRIVER_WINDOW_DAYS - 1));

  const sig = await collectDailySignals(userId, start);
  const { energyByDay, workoutDays, sleepByDay, habitDoneByDay, activeDays, sleepGoal } = sig;
  const focusOf = (day: string) => sig.focusByDay.get(day) ?? 0;

  const candidates: (DailyInsight | null)[] = [];

  // --- Alvo FOCO (minutos) ---
  {
    const hi: number[] = [], lo: number[] = [];
    for (const [day, e] of energyByDay) { if (e >= 4) hi.push(focusOf(day)); else if (e <= 2) lo.push(focusOf(day)); }
    candidates.push(compare("energy", "focus", "min", "dias de energia alta", "dias de energia baixa", hi, lo));

    const wW: number[] = [], wO: number[] = [];
    for (const day of activeDays) (workoutDays.has(day) ? wW : wO).push(focusOf(day));
    candidates.push(compare("workout", "focus", "min", "dias com treino", "dias sem treino", wW, wO));

    const sG: number[] = [], sP: number[] = [];
    for (const [day, h] of sleepByDay) (h >= sleepGoal ? sG : sP).push(focusOf(day));
    candidates.push(compare("sleep", "focus", "min", `dias bem dormidos (≥${sleepGoal}h)`, "dias de sono curto", sG, sP));

    const hW: number[] = [], hO: number[] = [];
    for (const day of activeDays) ((habitDoneByDay.get(day) ?? 0) > 0 ? hW : hO).push(focusOf(day));
    candidates.push(compare("habits", "focus", "min", "dias com hábitos em dia", "dias sem hábitos", hW, hO));
  }

  // --- Alvo ENERGIA (pontos 1–5) — só dias com check-in de energia ---
  {
    const bucket = (predicate: (day: string) => boolean) => {
      const yes: number[] = [], no: number[] = [];
      for (const [day, e] of energyByDay) (predicate(day) ? yes : no).push(e);
      return [yes, no] as const;
    };

    const [wYes, wNo] = bucket((day) => workoutDays.has(day));
    candidates.push(compare("workout", "energy", "pts", "dias com treino", "dias sem treino", wYes, wNo));

    const [hYes, hNo] = bucket((day) => (habitDoneByDay.get(day) ?? 0) > 0);
    candidates.push(compare("habits", "energy", "pts", "dias com hábitos em dia", "dias sem hábitos", hYes, hNo));

    // Sono ≥ meta vs abaixo (só dias que têm sono E energia)
    const sYes: number[] = [], sNo: number[] = [];
    for (const [day, e] of energyByDay) {
      const h = sleepByDay.get(day);
      if (h == null) continue;
      (h >= sleepGoal ? sYes : sNo).push(e);
    }
    candidates.push(compare("sleep", "energy", "pts", `noites ≥ ${sleepGoal}h`, "noites curtas", sYes, sNo));
  }

  const insight = candidates
    .filter((c): c is DailyInsight => c !== null)
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))[0] ?? null;

  return { windowDays: DRIVER_WINDOW_DAYS, loggedDays: activeDays.size, insight };
}
