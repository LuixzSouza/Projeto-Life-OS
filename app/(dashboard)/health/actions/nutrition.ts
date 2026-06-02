"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId, getCurrentUserId } from "@/lib/auth";
import { ActionResponse } from "./types";

// =========================================================
// GERENCIAMENTO DE NUTRIÇÃO (MEALS)
// =========================================================

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
