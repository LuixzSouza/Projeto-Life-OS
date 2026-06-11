// Esforço diário agregado (treinos, estudos, foco, hábitos, tarefas) — a fonte
// dos heatmaps de Constância (Retrospectiva e dashboard). Server-only.

import { prisma } from "@/lib/prisma";

export interface DayCounts {
  workout: number;
  study: number;
  focus: number;
  habit: number;
  task: number;
}

export const EMPTY_DAY: DayCounts = { workout: 0, study: 0, focus: 0, habit: 0, task: 0 };

const pad = (n: number) => String(n).padStart(2, "0");

/** Chave do dia LOCAL (YYYY-MM-DD). */
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const totalOf = (c: DayCounts) => c.workout + c.study + c.focus + c.habit + c.task;

// Intensidade 0–4 → classe estática (Tailwind não enxerga classes dinâmicas).
export const HEAT_LEVELS = [
  "bg-muted/50",   // 0
  "bg-primary/25", // 1–2
  "bg-primary/45", // 3–4
  "bg-primary/70", // 5–7
  "bg-primary",    // 8+
];

export function levelOf(total: number): number {
  if (total <= 0) return 0;
  if (total <= 2) return 1;
  if (total <= 4) return 2;
  if (total <= 7) return 3;
  return 4;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Texto do tooltip nativo: "11/06/2026: 2 treinos · 1 hábito". */
export function dayTitle(d: Date, c: DayCounts): string {
  const parts: string[] = [];
  if (c.workout > 0) parts.push(plural(c.workout, "treino", "treinos"));
  if (c.study > 0) parts.push(plural(c.study, "sessão de estudo", "sessões de estudo"));
  if (c.focus > 0) parts.push(plural(c.focus, "sessão de foco", "sessões de foco"));
  if (c.habit > 0) parts.push(plural(c.habit, "hábito", "hábitos"));
  if (c.task > 0) parts.push(plural(c.task, "tarefa concluída", "tarefas concluídas"));
  const label = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  return parts.length > 0 ? `${label}: ${parts.join(" · ")}` : `${label}: sem registros`;
}

/** Busca e agrega o esforço por dia dentro da janela. */
export async function getActivityDays(
  userId: string,
  start: Date,
  end: Date,
): Promise<Map<string, DayCounts>> {
  const range = { gte: start, lte: end };

  const [workouts, studies, focus, habits, tasks] = await Promise.all([
    prisma.workout.findMany({ where: { userId, date: range }, select: { date: true } }),
    prisma.studySession.findMany({ where: { userId, date: range }, select: { date: true } }),
    prisma.focusSession.findMany({ where: { userId, endedAt: range }, select: { endedAt: true } }),
    prisma.habitLog.findMany({ where: { userId, status: "DONE", date: range }, select: { date: true } }),
    prisma.task.findMany({
      where: { userId, deletedAt: null, isDone: true, updatedAt: range },
      select: { updatedAt: true },
    }),
  ]);

  const days = new Map<string, DayCounts>();
  const bump = (date: Date, field: keyof DayCounts) => {
    const key = dayKey(date);
    const cur = days.get(key) ?? { ...EMPTY_DAY };
    cur[field] += 1;
    days.set(key, cur);
  };
  for (const w of workouts) bump(w.date, "workout");
  for (const s of studies) bump(s.date, "study");
  for (const f of focus) bump(f.endedAt, "focus");
  for (const h of habits) bump(h.date, "habit");
  for (const t of tasks) bump(t.updatedAt, "task");

  return days;
}

/**
 * Sequência atual de dias ativos (terminando hoje, ou ontem — o dia de hoje
 * ainda não acabou, então vazio hoje NÃO quebra a sequência).
 */
export function currentStreak(days: Map<string, DayCounts>, today: Date): number {
  const cursor = new Date(today);
  cursor.setHours(12, 0, 0, 0);
  const todayActive = totalOf(days.get(dayKey(cursor)) ?? EMPTY_DAY) > 0;
  if (!todayActive) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (totalOf(days.get(dayKey(cursor)) ?? EMPTY_DAY) > 0) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
