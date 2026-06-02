"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { ActionResponse } from "./types";

// =========================================================
// GERENCIAMENTO DE MÉTRICAS (METRICS - LEGADO/GENÉRICO)
// =========================================================

export async function logMetric(formData: FormData): Promise<ActionResponse> {
  try {
    const type = formData.get("type") as string;
    const valueRaw = formData.get("value");

    if (!type || !valueRaw) {
      return { success: false, message: "Dados da métrica incompletos." };
    }

    const value = parseFloat(valueRaw.toString());

    const userId = await requireUserId();

    await prisma.healthMetric.create({
      data: {
        type,
        value,
        date: new Date(),
        userId,
      },
    });

    revalidatePath("/health");
    return { success: true, message: "Medida registrada!" };

  } catch (error) {
    console.error("Erro ao registrar métrica:", error);
    return { success: false, message: "Erro ao salvar medida." };
  }
}

/**
 * Registra o sono de uma noite (em horas) numa data específica.
 * Faz upsert por dia: se já houver registro de SLEEP naquele dia, atualiza.
 */
export async function logSleep(formData: FormData): Promise<ActionResponse> {
  try {
    const valueRaw = formData.get("value");
    const hours = valueRaw ? parseFloat(valueRaw.toString()) : NaN;

    if (isNaN(hours) || hours <= 0 || hours > 24) {
      return { success: false, message: "Informe uma duração válida (0–24h)." };
    }

    // Data do registro. "T12:00:00Z" evita o bug de fuso (dia anterior).
    const dateStr = formData.get("date") as string | null;
    const date = dateStr ? new Date(`${dateStr}T12:00:00Z`) : new Date();

    const userId = await requireUserId();

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.healthMetric.findFirst({
      where: { userId, type: "SLEEP", date: { gte: startOfDay, lte: endOfDay } },
    });

    if (existing) {
      await prisma.healthMetric.updateMany({
        where: { id: existing.id, userId },
        data: { value: hours },
      });
    } else {
      await prisma.healthMetric.create({
        data: { type: "SLEEP", value: hours, date, userId },
      });
    }

    revalidatePath("/health");
    revalidatePath("/health/sleep");
    return { success: true, message: "Sono registrado! 💤" };
  } catch (error) {
    console.error("Erro ao registrar sono:", error);
    return { success: false, message: "Erro ao salvar o registro de sono." };
  }
}

export async function deleteMetric(id: string): Promise<ActionResponse> {
  try {
    const userId = await requireUserId();
    await prisma.healthMetric.deleteMany({ where: { id, userId } });
    revalidatePath("/health");
    return { success: true, message: "Registro removido." };
  } catch (error) {
    return { success: false, message: "Erro ao remover registro." };
  }
}
