"use server";

// Reset Semanal — resumo reflexivo dos últimos 7 dias (foco, energia, hábitos,
// fricção) COM tendência vs a semana anterior, e uma direção para a próxima.
// Fecha o loop: capturar (Fase 0) → entender (#8/#15) → agir (#13) → revisar.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface WeekMetric {
  value: number;
  prev: number;
  deltaPct: number | null; // null = sem base de comparação
}

export interface WeeklyReset {
  hasData: boolean;
  focusMinutes: WeekMetric;
  avgEnergy: WeekMetric; // 1 casa decimal
  habitsDone: WeekMetric;
  activeDays: number;
  bestFocusDay: { weekday: number; minutes: number } | null;
  topFriction: { reason: string; count: number } | null;
  suggestion: string;
}

function metric(value: number, prev: number): WeekMetric {
  const deltaPct = prev > 0 ? Math.round(((value - prev) / prev) * 100) : null;
  return { value, prev, deltaPct };
}

export async function getWeeklyReset(): Promise<WeeklyReset> {
  const empty: WeeklyReset = {
    hasData: false,
    focusMinutes: { value: 0, prev: 0, deltaPct: null },
    avgEnergy: { value: 0, prev: 0, deltaPct: null },
    habitsDone: { value: 0, prev: 0, deltaPct: null },
    activeDays: 0,
    bestFocusDay: null,
    topFriction: null,
    suggestion: "",
  };

  const userId = await getCurrentUserId();
  if (!userId) return empty;

  const now = new Date();
  const start7 = new Date(now); start7.setHours(0, 0, 0, 0); start7.setDate(start7.getDate() - 6);
  const start14 = new Date(start7); start14.setDate(start14.getDate() - 7);

  // "this" = [start7, now]; "prev" = [start14, start7)
  const inThis = (d: Date) => d >= start7;

  const [focus, energy, doneLogs, failLogs] = await Promise.all([
    prisma.focusSession.findMany({ where: { userId, endedAt: { gte: start14 } }, select: { minutes: true, endedAt: true } }),
    prisma.energyCheckin.findMany({ where: { userId, date: { gte: start14 } }, select: { energy: true, date: true } }),
    prisma.habitLog.findMany({ where: { userId, status: "DONE", date: { gte: start14 } }, select: { date: true } }),
    prisma.habitLog.findMany({ where: { userId, status: "FAILED", date: { gte: start7 }, reason: { not: null } }, select: { reason: true } }),
  ]);

  // Foco
  let focusThis = 0, focusPrev = 0;
  const focusByDay = new Map<string, number>();
  for (const f of focus) {
    const d = new Date(f.endedAt);
    if (inThis(d)) { focusThis += f.minutes; focusByDay.set(dayKey(d), (focusByDay.get(dayKey(d)) ?? 0) + f.minutes); }
    else focusPrev += f.minutes;
  }

  // Energia (média)
  const eThis: number[] = [], ePrev: number[] = [];
  for (const e of energy) (inThis(new Date(e.date)) ? eThis : ePrev).push(e.energy);
  const avg = (a: number[]) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : 0);

  // Hábitos concluídos
  let doneThis = 0, donePrev = 0;
  for (const l of doneLogs) {
    if (inThis(new Date(l.date))) doneThis++;
    else donePrev++;
  }

  // Dias ativos (algum sinal nesta semana)
  const active = new Set<string>();
  for (const f of focus) if (inThis(new Date(f.endedAt))) active.add(dayKey(new Date(f.endedAt)));
  for (const e of energy) if (inThis(new Date(e.date))) active.add(dayKey(new Date(e.date)));
  for (const l of doneLogs) if (inThis(new Date(l.date))) active.add(dayKey(new Date(l.date)));

  // Melhor dia de foco
  let bestFocusDay: WeeklyReset["bestFocusDay"] = null;
  for (const [k, mins] of focusByDay) {
    if (!bestFocusDay || mins > bestFocusDay.minutes) {
      const [y, m, d] = k.split("-").map(Number);
      bestFocusDay = { weekday: new Date(y, m - 1, d).getDay(), minutes: mins };
    }
  }

  // Fricção da semana
  const reasonCounts = new Map<string, number>();
  for (const l of failLogs) if (l.reason) reasonCounts.set(l.reason, (reasonCounts.get(l.reason) ?? 0) + 1);
  const topFrictionEntry = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topFriction = topFrictionEntry ? { reason: topFrictionEntry[0], count: topFrictionEntry[1] } : null;

  const focusMinutes = metric(focusThis, focusPrev);
  const avgEnergy = metric(avg(eThis), avg(ePrev));
  const habitsDone = metric(doneThis, donePrev);

  const hasData = focusThis > 0 || eThis.length > 0 || doneThis > 0;

  // Direção para a próxima semana (rule-based, transparente).
  let suggestion = "Boa semana — mantenha o ritmo e ajuste 1% de cada vez.";
  if (topFriction?.reason === "TIME") suggestion = "Próxima semana: blinde um horário fixo para os hábitos antes do dia encher.";
  else if (topFriction?.reason === "ENERGY") suggestion = "Próxima semana: faça os hábitos no seu pico de energia (veja o Regulador).";
  else if (topFriction?.reason === "ENVIRONMENT") suggestion = "Próxima semana: prepare o ambiente na véspera para reduzir o atrito.";
  else if (focusMinutes.deltaPct != null && focusMinutes.deltaPct < 0) suggestion = "Próxima semana: tente +1 bloco de foco por dia para retomar o ritmo.";
  else if (doneThis > 0 && doneThis < donePrev) suggestion = "Próxima semana: escolha 1 hábito-chave e proteja a sequência dele.";

  return { hasData, focusMinutes, avgEnergy, habitsDone, activeDays: active.size, bestFocusDay, topFriction, suggestion };
}
