"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { ActionResponse } from "./types";

// =========================================================
// HÁBITOS RECORRENTES (Fase 0) + captura de fricção na FALHA
// =========================================================
// Diferente de Challenge (finito): hábito é contínuo, com streak indefinido.
// A data vem do cliente como "YYYY-MM-DD" (dia local) e é ancorada em T12:00:00Z.

export type HabitLogStatus = "DONE" | "FAILED";
export type FrictionReason = "TIME" | "ENERGY" | "ENVIRONMENT" | "EMERGENCY";

export interface SerializedHabitLog {
  date: string; // YYYY-MM-DD
  status: HabitLogStatus;
  reason: string | null;
}
export interface SerializedHabit {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  logs: SerializedHabitLog[];
}

function dayDate(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T12:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

export async function createHabit(name: string, icon?: string, color?: string): Promise<ActionResponse> {
  try {
    const userId = await requireUserId();
    if (!name?.trim()) return { success: false, message: "O hábito precisa de um nome." };
    await prisma.habit.create({
      data: { userId, name: name.trim().slice(0, 60), icon: icon || null, color: color || null },
    });
    return { success: true, message: "Hábito criado." };
  } catch (error) {
    console.error("Erro ao criar hábito:", error);
    return { success: false, message: "Falha ao criar o hábito." };
  }
}

export async function deleteHabit(id: string): Promise<ActionResponse> {
  try {
    const userId = await requireUserId();
    await prisma.habit.deleteMany({ where: { id, userId } });
    return { success: true, message: "Hábito removido." };
  } catch (error) {
    console.error("Erro ao remover hábito:", error);
    return { success: false, message: "Falha ao remover o hábito." };
  }
}

/**
 * Define o status do hábito num dia. `status: null` limpa (volta a pendente).
 * Para FALHA, `reason` registra a fricção (o porquê) — base do Vetor de Fricção (#15).
 */
export async function setHabitLog(
  habitId: string,
  dateStr: string,
  status: HabitLogStatus | null,
  reason?: FrictionReason | null,
): Promise<ActionResponse> {
  try {
    const userId = await requireUserId();
    const date = dayDate(dateStr);
    if (!date) return { success: false, message: "Data inválida." };

    // Garante posse do hábito.
    const habit = await prisma.habit.findFirst({ where: { id: habitId, userId }, select: { id: true } });
    if (!habit) return { success: false, message: "Hábito não encontrado." };

    if (status === null) {
      await prisma.habitLog.deleteMany({ where: { habitId, date, userId } });
      return { success: true, message: "Registro limpo." };
    }
    const cleanReason = status === "FAILED" ? reason ?? null : null;
    await prisma.habitLog.upsert({
      where: { habitId_date: { habitId, date } },
      update: { status, reason: cleanReason },
      create: { userId, habitId, date, status, reason: cleanReason },
    });
    return { success: true, message: status === "DONE" ? "Feito! 💪" : "Registrado." };
  } catch (error) {
    console.error("Erro ao registrar hábito:", error);
    return { success: false, message: "Falha ao registrar." };
  }
}

// =========================================================
// VETOR DE FRICÇÃO (#15) — por que os hábitos falham?
// =========================================================
// Agrega os logs de FALHA (com motivo) dos últimos 30 dias para revelar o
// obstáculo dominante (TEMPO/ENERGIA/AMBIENTE/EMERGÊNCIA), no geral e por hábito.

export interface FrictionReasonStat {
  reason: FrictionReason;
  count: number;
  pct: number; // % sobre as falhas COM motivo
}
export interface FrictionHabitStat {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  failures: number;
  topReason: FrictionReason | null;
}
export interface FrictionVector {
  windowDays: number;
  totalFailures: number; // falhas (com ou sem motivo)
  reasonedFailures: number; // falhas com motivo
  reasons: FrictionReasonStat[]; // só motivos com count > 0, desc
  dominant: FrictionReason | null;
  habits: FrictionHabitStat[]; // top por nº de falhas
}

const FRICTION_REASONS: FrictionReason[] = ["TIME", "ENERGY", "ENVIRONMENT", "EMERGENCY"];
const isFrictionReason = (r: string | null): r is FrictionReason =>
  r != null && (FRICTION_REASONS as string[]).includes(r);

export async function getFrictionVector(): Promise<FrictionVector> {
  const empty: FrictionVector = {
    windowDays: 30, totalFailures: 0, reasonedFailures: 0, reasons: [], dominant: null, habits: [],
  };
  try {
    const userId = await requireUserId();
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 29);

    const logs = await prisma.habitLog.findMany({
      where: { userId, status: "FAILED", date: { gte: since } },
      select: { reason: true, habitId: true, habit: { select: { name: true, icon: true, color: true } } },
    });

    if (logs.length === 0) return empty;

    const reasonCounts = new Map<FrictionReason, number>();
    const perHabit = new Map<string, { name: string; icon: string | null; color: string | null; failures: number; reasons: Map<FrictionReason, number> }>();

    for (const l of logs) {
      const h = perHabit.get(l.habitId) ?? { name: l.habit.name, icon: l.habit.icon, color: l.habit.color, failures: 0, reasons: new Map() };
      h.failures += 1;
      if (isFrictionReason(l.reason)) {
        reasonCounts.set(l.reason, (reasonCounts.get(l.reason) ?? 0) + 1);
        h.reasons.set(l.reason, (h.reasons.get(l.reason) ?? 0) + 1);
      }
      perHabit.set(l.habitId, h);
    }

    const reasonedFailures = [...reasonCounts.values()].reduce((a, b) => a + b, 0);
    const reasons: FrictionReasonStat[] = [...reasonCounts.entries()]
      .map(([reason, count]) => ({ reason, count, pct: reasonedFailures ? Math.round((count / reasonedFailures) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    const habits: FrictionHabitStat[] = [...perHabit.entries()]
      .map(([id, v]) => {
        const top = [...v.reasons.entries()].sort((a, b) => b[1] - a[1])[0];
        return { id, name: v.name, icon: v.icon, color: v.color, failures: v.failures, topReason: top?.[0] ?? null };
      })
      .sort((a, b) => b.failures - a.failures)
      .slice(0, 3);

    return {
      windowDays: 30,
      totalFailures: logs.length,
      reasonedFailures,
      reasons,
      dominant: reasons[0]?.reason ?? null,
      habits,
    };
  } catch (error) {
    console.error("Erro ao calcular vetor de fricção:", error);
    return empty;
  }
}

/** Hábitos ativos + logs dos últimos ~35 dias (p/ streak e status de hoje). */
export async function getHabits(): Promise<SerializedHabit[]> {
  try {
    const userId = await requireUserId();
    const since = new Date();
    since.setDate(since.getDate() - 35);
    const habits = await prisma.habit.findMany({
      where: { userId, archived: false },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { logs: { where: { date: { gte: since } }, orderBy: { date: "desc" } } },
    });
    return habits.map((h) => ({
      id: h.id,
      name: h.name,
      icon: h.icon,
      color: h.color,
      logs: h.logs.map((l) => ({
        date: l.date.toISOString().slice(0, 10),
        status: l.status as HabitLogStatus,
        reason: l.reason,
      })),
    }));
  } catch (error) {
    console.error("Erro ao carregar hábitos:", error);
    return [];
  }
}
