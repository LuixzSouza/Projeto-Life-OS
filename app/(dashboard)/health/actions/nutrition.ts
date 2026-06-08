"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId, getCurrentUserId } from "@/lib/auth";
import { ActionResponse } from "./types";

// =========================================================
// GERENCIAMENTO DE NUTRIÇÃO (MEALS)
// =========================================================

// Macro opcional (gramas): vazio/inválido → null (não força 0 falso no banco).
function parseMacro(form: FormData, key: string): number | null {
  const raw = form.get(key);
  if (raw == null || raw.toString().trim() === "") return null;
  const n = parseFloat(raw.toString().replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function logMeal(formData: FormData): Promise<ActionResponse> {
  try {
    const title = formData.get("title") as string;
    const items = formData.get("items") as string;
    const type = formData.get("type") as string;

    const caloriesRaw = formData.get("calories");
    const calories = caloriesRaw ? parseInt(caloriesRaw.toString()) : 0;

    if (!title) {
        return { success: false, message: "O título da refeição é obrigatório." };
    }

    const userId = await requireUserId();

    await prisma.meal.create({
      data: {
        title,
        items: items || "",
        calories,
        protein: parseMacro(formData, "protein"),
        carbs: parseMacro(formData, "carbs"),
        fat: parseMacro(formData, "fat"),
        type: type || "NEUTRAL",
        date: new Date(),
        userId,
      }
    });

    revalidatePath("/health");
    revalidatePath("/health/nutrition"); // Revalida também a página de detalhes
    return { success: true, message: "Refeição registrada! 🥗" };

  } catch (error) {
    console.error("Erro ao registrar refeição:", error);
    return { success: false, message: "Erro ao salvar refeição." };
  }
}

export async function updateMeal(formData: FormData): Promise<ActionResponse> {
  try {
    const id = formData.get("id") as string;
    if (!id) return { success: false, message: "ID da refeição ausente." };

    const title = formData.get("title") as string;
    const items = formData.get("items") as string;
    const type = formData.get("type") as string;

    const caloriesRaw = formData.get("calories");
    const calories = caloriesRaw ? parseInt(caloriesRaw.toString()) : 0;

    const userId = await requireUserId();

    await prisma.meal.updateMany({
      where: { id, userId },
      data: {
        title,
        items,
        calories,
        protein: parseMacro(formData, "protein"),
        carbs: parseMacro(formData, "carbs"),
        fat: parseMacro(formData, "fat"),
        type
      }
    });

    revalidatePath("/health");
    revalidatePath("/health/nutrition");
    return { success: true, message: "Refeição atualizada." };

  } catch (error) {
    console.error("Erro ao atualizar refeição:", error);
    return { success: false, message: "Erro ao editar refeição." };
  }
}

// Copia todas as refeições de ONTEM para hoje (fast-logging: a base do café/lanche
// costuma se repetir). Cria registros novos com a data de agora.
export async function copyYesterdayMeals(): Promise<ActionResponse & { count?: number }> {
  try {
    const userId = await requireUserId();

    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    const endYesterday = new Date(startToday.getTime() - 1); // 23:59:59.999 de ontem

    const yesterday = await prisma.meal.findMany({
      where: { userId, date: { gte: startYesterday, lte: endYesterday } },
      orderBy: { date: "asc" },
    });

    if (yesterday.length === 0) {
      return { success: false, message: "Nenhuma refeição registrada ontem para copiar." };
    }

    const now = new Date();
    await prisma.meal.createMany({
      data: yesterday.map((m) => ({
        title: m.title,
        items: m.items,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
        type: m.type,
        date: now,
        userId,
      })),
    });

    revalidatePath("/health");
    revalidatePath("/health/nutrition");
    return {
      success: true,
      message: `${yesterday.length} refeição${yesterday.length > 1 ? "ões" : ""} copiada${yesterday.length > 1 ? "s" : ""} de ontem! 🍽️`,
      count: yesterday.length,
    };
  } catch (error) {
    console.error("Erro ao copiar refeições de ontem:", error);
    return { success: false, message: "Não foi possível copiar as refeições de ontem." };
  }
}

export async function deleteMeal(id: string): Promise<ActionResponse> {
  try {
    const userId = await requireUserId();
    await prisma.meal.deleteMany({ where: { id, userId } });

    revalidatePath("/health");
    revalidatePath("/health/nutrition");
    return { success: true, message: "Refeição removida." };
  } catch (error) {
    return { success: false, message: "Erro ao deletar refeição." };
  }
}

export async function getWeeklyPlan() {
  const userId = await getCurrentUserId();
  return await prisma.mealPlan.findMany({
    where: { userId: userId ?? "" },
    orderBy: { dayOfWeek: "asc" }
  });
}

export async function saveMealPlanSlot(formData: FormData) {
  const dayOfWeek = parseInt(formData.get("dayOfWeek") as string);
  const mealType = formData.get("mealType") as string;
  const title = formData.get("title") as string;
  const items = formData.get("items") as string;
  const calories = parseInt(formData.get("calories") as string) || 0;

  const userId = await requireUserId();

  // Verifica se já existe um slot nesse dia/horário e atualiza ou cria
  const existing = await prisma.mealPlan.findFirst({
    where: { userId, dayOfWeek, mealType }
  });

  if (existing) {
    await prisma.mealPlan.updateMany({
      where: { id: existing.id, userId },
      data: { title, items, calories }
    });
  } else {
    await prisma.mealPlan.create({
      data: { userId, dayOfWeek, mealType, title, items, calories }
    });
  }

  revalidatePath("/health/nutrition");
}

export async function clearDayPlan(dayOfWeek: number) {
  const userId = await requireUserId();
  await prisma.mealPlan.deleteMany({
    where: { userId, dayOfWeek }
  });
  revalidatePath("/health/nutrition");
}

// Copia todas as refeições de um dia para outro (substituindo o destino).
export async function copyDayPlan(fromDay: number, toDay: number) {
  if (fromDay === toDay) return;
  const userId = await requireUserId();

  const source = await prisma.mealPlan.findMany({
    where: { userId, dayOfWeek: fromDay }
  });

  // Limpa o destino antes de colar para evitar duplicatas por mealType.
  await prisma.mealPlan.deleteMany({ where: { userId, dayOfWeek: toDay } });

  if (source.length > 0) {
    await prisma.mealPlan.createMany({
      data: source.map(s => ({
        userId,
        dayOfWeek: toDay,
        mealType: s.mealType,
        title: s.title,
        items: s.items,
        calories: s.calories,
      }))
    });
  }

  revalidatePath("/health/nutrition");
}
