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
