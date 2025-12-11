"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Tipo de Retorno Padrão para facilitar o uso no Frontend
type ActionResponse = {
  success: boolean;
  message: string;
};

// =========================================================
// 1. GERENCIAMENTO DE TREINOS (WORKOUTS)
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
        date: new Date() // Data atual
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

    await prisma.workout.update({
      where: { id },
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

export async function deleteWorkout(id: string): Promise<ActionResponse> {
  try {
    if (!id) return { success: false, message: "ID inválido." };
    
    await prisma.workout.delete({ where: { id }});
    
    revalidatePath("/health");
    return { success: true, message: "Treino removido." };
  } catch (error) {
    console.error("Erro ao deletar treino:", error);
    return { success: false, message: "Erro ao remover treino." };
  }
}


// =========================================================
// 2. GERENCIAMENTO DE MÉTRICAS (METRICS)
// =========================================================

export async function logMetric(formData: FormData): Promise<ActionResponse> {
  try {
    const type = formData.get("type") as string;
    const valueRaw = formData.get("value");
    
    if (!type || !valueRaw) {
      return { success: false, message: "Dados da métrica incompletos." };
    }

    const value = parseFloat(valueRaw.toString());

    // Opcional: Se for peso ou altura, verificar se já existe registro HOJE e atualizar
    // para não poluir o banco com 50 registros no mesmo dia.
    // Mas para histórico detalhado, criar sempre um novo é ok.
    
    await prisma.healthMetric.create({
      data: { 
        type, 
        value, 
        date: new Date() 
      },
    });

    revalidatePath("/health");
    return { success: true, message: "Medida registrada!" };

  } catch (error) {
    console.error("Erro ao registrar métrica:", error);
    return { success: false, message: "Erro ao salvar medida." };
  }
}

export async function deleteMetric(id: string): Promise<ActionResponse> {
  try {
    await prisma.healthMetric.delete({ where: { id } });
    revalidatePath("/health");
    return { success: true, message: "Registro removido." };
  } catch (error) {
    return { success: false, message: "Erro ao remover registro." };
  }
}


// =========================================================
// 3. GERENCIAMENTO DE NUTRIÇÃO (MEALS)
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

    await prisma.meal.create({
      data: {
        title, 
        items: items || "", 
        calories, 
        type: type || "NEUTRAL",
        date: new Date()
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

    await prisma.meal.update({
      where: { id },
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
    await prisma.meal.delete({ where: { id } });
    
    revalidatePath("/health");
    revalidatePath("/health/nutrition");
    return { success: true, message: "Refeição removida." };
  } catch (error) {
    return { success: false, message: "Erro ao deletar refeição." };
  }
}