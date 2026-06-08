"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { ActionResponse } from "./types";

// =========================================================
// DESAFIOS & PROGRAMAS DE TREINO
// =========================================================

export interface CreateChallengeInput {
  title: string;
  description?: string;
  category?: string; // STRENGTH | CARDIO | MOBILITY | HABIT
  durationDays?: number;
  color?: string;
  icon?: string; // emoji de destaque
}

export async function createChallenge(input: CreateChallengeInput): Promise<ActionResponse> {
  try {
    if (!input?.title?.trim()) {
      return { success: false, message: "O desafio precisa de um título." };
    }

    const userId = await requireUserId();

    await prisma.challenge.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        category: input.category || "HABIT",
        durationDays: input.durationDays && input.durationDays > 0 ? Math.min(input.durationDays, 365) : 30,
        color: input.color || "#6366f1",
        icon: input.icon?.trim() || null,
        userId,
      },
    });

    revalidatePath("/health/gym");
    return { success: true, message: "Desafio iniciado! Bora? 🔥" };
  } catch (error) {
    console.error("Erro ao criar desafio:", error);
    return { success: false, message: "Falha ao criar o desafio." };
  }
}

// Marca/desmarca o check-in de um dia específico do desafio.
export async function toggleCheckin(challengeId: string, dayIndex: number): Promise<ActionResponse & { done?: boolean }> {
  try {
    const userId = await requireUserId();

    // Garante que o desafio pertence ao usuário.
    const challenge = await prisma.challenge.findFirst({
      where: { id: challengeId, userId },
      select: { id: true, durationDays: true, startDate: true },
    });
    if (!challenge) return { success: false, message: "Desafio não encontrado." };
    if (dayIndex < 0 || dayIndex >= challenge.durationDays) {
      return { success: false, message: "Dia inválido." };
    }
    // Não dá pra concluir um dia que ainda não chegou (evita "marcar o futuro").
    // Dias passados continuam liberados para preencher retroativamente.
    const startMs = new Date(challenge.startDate).setHours(0, 0, 0, 0);
    const todayMs = new Date().setHours(0, 0, 0, 0);
    const currentDay = Math.floor((todayMs - startMs) / 86_400_000);
    if (dayIndex > currentDay) {
      return { success: false, message: "Esse dia ainda não chegou. Volte quando for o dia 😉" };
    }

    const existing = await prisma.challengeCheckin.findUnique({
      where: { challengeId_dayIndex: { challengeId, dayIndex } },
      select: { id: true },
    });

    if (existing) {
      await prisma.challengeCheckin.delete({ where: { id: existing.id } });
      revalidatePath("/health/gym");
      return { success: true, message: "Check-in desmarcado.", done: false };
    }

    await prisma.challengeCheckin.create({
      data: { challengeId, dayIndex, userId },
    });
    revalidatePath("/health/gym");
    return { success: true, message: "Dia concluído! 💪", done: true };
  } catch (error) {
    console.error("Erro no check-in:", error);
    return { success: false, message: "Falha ao registrar o check-in." };
  }
}

export async function deleteChallenge(id: string): Promise<ActionResponse> {
  try {
    const userId = await requireUserId();
    await prisma.challenge.deleteMany({ where: { id, userId } });
    revalidatePath("/health/gym");
    return { success: true, message: "Desafio removido." };
  } catch (error) {
    console.error("Erro ao remover desafio:", error);
    return { success: false, message: "Falha ao remover o desafio." };
  }
}
