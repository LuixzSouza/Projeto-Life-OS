"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { ActionResponse } from "./types";

// =========================================================
// GERENCIAMENTO DE TREINOS (WORKOUTS)
// =========================================================

export async function logWorkout(formData: FormData): Promise<ActionResponse> {
  try {
    const title = formData.get("title") as string;
    const type = formData.get("type") as string;
    const intensity = formData.get("intensity") as string;
    const feeling = formData.get("feeling") as string;
    const notes = formData.get("notes") as string;

    // Tratamento e Validação de Números
    const durationRaw = formData.get("duration");
    const duration = durationRaw ? parseInt(durationRaw.toString()) : 0;

    const distanceRaw = formData.get("distance");
    const distance = distanceRaw ? parseFloat(distanceRaw.toString()) : null;

    // Campos Específicos
    const pace = formData.get("pace") as string;
    const muscleGroup = formData.get("muscleGroup") as string;
    const exercises = formData.get("exercises") as string; // JSON String

    // Validação Básica
    if (!title || !type || duration <= 0) {
      return { success: false, message: "Preencha os campos obrigatórios (Título, Tipo e Duração)." };
    }

    const userId = await requireUserId();

    await prisma.workout.create({
      data: {
        title,
        type,
        duration,
        intensity,
        feeling,
        notes,
        distance,
        pace,
        muscleGroup,
        exercises,
        date: new Date(), // Data atual
        userId,
      },
    });

    revalidatePath("/health");
    return { success: true, message: "Treino registrado com sucesso! 💪" };

  } catch (error) {
    console.error("Erro ao registrar treino:", error);
    return { success: false, message: "Erro ao salvar no banco de dados." };
  }
}

export async function updateWorkout(formData: FormData): Promise<ActionResponse> {
  try {
    const id = formData.get("id") as string;
    if (!id) return { success: false, message: "ID do treino não encontrado." };

    const title = formData.get("title") as string;
    const type = formData.get("type") as string;
    const intensity = formData.get("intensity") as string;
    const feeling = formData.get("feeling") as string;
    const notes = formData.get("notes") as string;

    const durationRaw = formData.get("duration");
    const duration = durationRaw ? parseInt(durationRaw.toString()) : 0;

    const distanceRaw = formData.get("distance");
    const distance = distanceRaw ? parseFloat(distanceRaw.toString()) : null;

    const pace = formData.get("pace") as string;
    const muscleGroup = formData.get("muscleGroup") as string;
    const exercises = formData.get("exercises") as string;

    const userId = await requireUserId();

    await prisma.workout.updateMany({
      where: { id, userId },
      data: {
        title,
        type,
        duration,
        intensity,
        feeling,
        notes,
        distance,
        pace,
        muscleGroup,
        exercises
      },
    });

    revalidatePath("/health");
    return { success: true, message: "Treino atualizado!" };

  } catch (error) {
    console.error("Erro ao atualizar treino:", error);
    return { success: false, message: "Falha ao atualizar o treino." };
  }
}

// --- IMPORTAÇÃO DE CORRIDAS (GPX/TCX/CSV) ---

export interface ImportRunInput {
  title: string;
  date: string; // ISO
  distanceKm: number;
  durationMin: number;
  paceStr: string;
  externalId: string;
  source: string;
}

export async function importRuns(
  runs: ImportRunInput[]
): Promise<ActionResponse & { imported?: number; skipped?: number }> {
  try {
    if (!Array.isArray(runs) || runs.length === 0) {
      return { success: false, message: "Nenhuma corrida válida no arquivo." };
    }

    const userId = await requireUserId();

    // Deduplicação: ignora corridas com externalId já importado.
    const ids = runs.map((r) => r.externalId).filter(Boolean);
    const existing = await prisma.workout.findMany({
      where: { userId, externalId: { in: ids } },
      select: { externalId: true },
    });
    const existingIds = new Set(existing.map((e) => e.externalId));

    const toCreate = runs.filter((r) => !existingIds.has(r.externalId));

    if (toCreate.length > 0) {
      await prisma.workout.createMany({
        data: toCreate.map((r) => ({
          title: r.title || "Corrida importada",
          type: "RUNNING",
          duration: Math.max(0, Math.round(r.durationMin)),
          intensity: "MODERATE",
          distance: r.distanceKm,
          pace: r.paceStr,
          source: r.source,
          externalId: r.externalId,
          date: new Date(r.date),
          userId,
        })),
      });
    }

    revalidatePath("/health");
    revalidatePath("/health/running");

    const skipped = runs.length - toCreate.length;
    return {
      success: true,
      message: `${toCreate.length} corrida(s) importada(s)${skipped ? `, ${skipped} ignorada(s) (já existiam)` : ""}.`,
      imported: toCreate.length,
      skipped,
    };
  } catch (error) {
    console.error("Erro ao importar corridas:", error);
    return { success: false, message: "Falha ao importar o arquivo." };
  }
}

export async function deleteWorkout(id: string): Promise<ActionResponse> {
  try {
    if (!id) return { success: false, message: "ID inválido." };

    const userId = await requireUserId();
    await prisma.workout.deleteMany({ where: { id, userId }});

    revalidatePath("/health");
    return { success: true, message: "Treino removido." };
  } catch (error) {
    console.error("Erro ao deletar treino:", error);
    return { success: false, message: "Erro ao remover treino." };
  }
}
