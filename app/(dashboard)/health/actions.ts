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
// 2. GERENCIAMENTO DE MÉTRICAS (METRICS - LEGADO/GENÉRICO)
// =========================================================

export async function logMetric(formData: FormData): Promise<ActionResponse> {
  try {
    const type = formData.get("type") as string;
    const valueRaw = formData.get("value");
    
    if (!type || !valueRaw) {
      return { success: false, message: "Dados da métrica incompletos." };
    }

    const value = parseFloat(valueRaw.toString());

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

export async function getWeeklyPlan() {
  // Busca o plano do usuário (mock de userId por enquanto)
  return await prisma.mealPlan.findMany({
    where: { userId: "user" }, // Substituir pelo ID real da sessão
    orderBy: { dayOfWeek: "asc" }
  });
}

export async function saveMealPlanSlot(formData: FormData) {
  const dayOfWeek = parseInt(formData.get("dayOfWeek") as string);
  const mealType = formData.get("mealType") as string;
  const title = formData.get("title") as string;
  const items = formData.get("items") as string;
  const calories = parseInt(formData.get("calories") as string) || 0;

  // Verifica se já existe um slot nesse dia/horário e atualiza ou cria
  const existing = await prisma.mealPlan.findFirst({
    where: { userId: "user", dayOfWeek, mealType }
  });

  if (existing) {
    await prisma.mealPlan.update({
      where: { id: existing.id },
      data: { title, items, calories }
    });
  } else {
    await prisma.mealPlan.create({
      data: { userId: "user", dayOfWeek, mealType, title, items, calories }
    });
  }

  revalidatePath("/health/nutrition");
}

export async function clearDayPlan(dayOfWeek: number) {
  await prisma.mealPlan.deleteMany({
    where: { userId: "user", dayOfWeek }
  });
  revalidatePath("/health/nutrition");
}

// =========================================================
// 4. MEDIDAS CORPORAIS COMPLETAS (SNAPSHOT)
// =========================================================

// app/(dashboard)/health/actions.ts

export async function saveBodyMeasurements(formData: FormData): Promise<ActionResponse> {
  try {
    const getFloat = (key: string) => {
      const val = formData.get(key);
      return val && val.toString().trim() !== "" ? parseFloat(val.toString()) : null;
    };

    // Dados Obrigatórios
    const weight = getFloat("weight");
    const height = getFloat("height");
    const gender = formData.get("gender") as string;
    const activity = getFloat("activityFactor") || 1.2;
    
    // --- NOVO: Captura a data de nascimento ---
    const birthDateString = formData.get("birthDate") as string;
    // Converte string "YYYY-MM-DD" para objeto Date do Javascript
    const birthDate = birthDateString ? new Date(birthDateString) : null;

    if (!weight || !height) {
      return { success: false, message: "Peso e Altura são obrigatórios." };
    }

    // Criar o registro completo
    await prisma.bodyMeasurement.create({
      data: {
        weight,
        height,
        gender: gender || "MALE",
        activity,
        birthDate, // <--- Salvando no banco!
        
        // Medidas
        neck: getFloat("neck"),
        waist: getFloat("waist"),
        hip: getFloat("hip"),
        shoulders: getFloat("shoulders"),
        chest: getFloat("chest"),
        armLeft: getFloat("armLeft"),
        armRight: getFloat("armRight"),
        forearmLeft: getFloat("forearmLeft"),
        forearmRight: getFloat("forearmRight"),
        thighLeft: getFloat("thighLeft"),
        thighRight: getFloat("thighRight"),
        calfLeft: getFloat("calfLeft"),
        calfRight: getFloat("calfRight"),
        
        // userId: session.user.id (Se tiver auth)
      }
    });

    // Backup para gráficos simples
    await prisma.healthMetric.create({
      data: { type: "WEIGHT", value: weight, date: new Date() }
    });

    revalidatePath("/health");
    return { success: true, message: "Medidas salvas com sucesso!" };

  } catch (error) {
    console.error("Erro ao salvar medidas:", error);
    return { success: false, message: "Erro ao salvar no banco de dados." };
  }
}