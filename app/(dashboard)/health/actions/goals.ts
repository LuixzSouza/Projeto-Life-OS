"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

// Metas de saúde centralizadas no perfil (Settings) — substituem o antigo
// armazenamento por dispositivo (localStorage), garantindo sincronia, backup
// e portabilidade junto do banco SQLite.

export interface HealthGoals {
  sleepGoalHours: number | null;
  calorieGoalOverride: number | null;
}

export async function getHealthGoals(): Promise<HealthGoals> {
  try {
    const userId = await requireUserId();
    const s = await prisma.settings.findUnique({
      where: { userId },
      select: { sleepGoalHours: true, calorieGoalOverride: true },
    });
    return {
      sleepGoalHours: s?.sleepGoalHours ?? null,
      calorieGoalOverride: s?.calorieGoalOverride ?? null,
    };
  } catch {
    return { sleepGoalHours: null, calorieGoalOverride: null };
  }
}

// Meta de sono: 4–14h, passo de 0,5h (igual à validação antiga do hook).
export async function setSleepGoal(hours: number): Promise<{ success: boolean }> {
  try {
    const userId = await requireUserId();
    const safe = Math.max(4, Math.min(14, Math.round((hours || 8) * 2) / 2));
    await prisma.settings.upsert({
      where: { userId },
      update: { sleepGoalHours: safe },
      create: { userId, sleepGoalHours: safe, theme: "system", accentColor: "zinc" },
    });
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar meta de sono:", error);
    return { success: false };
  }
}

// Override calórico: null limpa (volta ao automático pelo perfil); número >= 0 fixa a meta.
export async function setCalorieGoalOverride(kcal: number | null): Promise<{ success: boolean }> {
  try {
    const userId = await requireUserId();
    const safe = kcal == null ? null : Math.max(0, Math.round(kcal));
    await prisma.settings.upsert({
      where: { userId },
      update: { calorieGoalOverride: safe },
      create: { userId, calorieGoalOverride: safe, theme: "system", accentColor: "zinc" },
    });
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar meta calórica:", error);
    return { success: false };
  }
}
