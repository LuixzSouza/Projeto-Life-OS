"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// =========================================================
// 1. GERENCIAMENTO DE TREINOS (WORKOUTS)
// =========================================================

// CRIAR TREINO
export async function logWorkout(formData: FormData) {
  const title = formData.get("title") as string;
  const type = formData.get("type") as string;
  const intensity = formData.get("intensity") as string;
  const feeling = formData.get("feeling") as string;
  const notes = formData.get("notes") as string;
  
  // Tratamento de Números
  const duration = parseInt(formData.get("duration") as string) || 0;
  const distance = formData.get("distance") ? parseFloat(formData.get("distance") as string) : null;
  
  // Campos Específicos
  const pace = formData.get("pace") as string;
  const muscleGroup = formData.get("muscleGroup") as string;
  const exercises = formData.get("exercises") as string; // JSON String

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
      exercises
    },
  });

  revalidatePath("/health");
}

// ATUALIZAR TREINO (Novo)
export async function updateWorkout(formData: FormData) {
  const id = formData.get("id") as string;
  
  const title = formData.get("title") as string;
  const type = formData.get("type") as string;
  const intensity = formData.get("intensity") as string;
  const feeling = formData.get("feeling") as string;
  const notes = formData.get("notes") as string;
  
  const duration = parseInt(formData.get("duration") as string) || 0;
  const distance = formData.get("distance") ? parseFloat(formData.get("distance") as string) : null;
  
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
}

// DELETAR TREINO
export async function deleteWorkout(id: string) {
    await prisma.workout.delete({ where: { id }});
    revalidatePath("/health");
}


// =========================================================
// 2. GERENCIAMENTO DE MÉTRICAS (METRICS)
// =========================================================

// REGISTRAR MÉTRICA (Peso, Água, Altura, Sono)
export async function logMetric(formData: FormData) {
  const type = formData.get("type") as string;
  const value = parseFloat(formData.get("value") as string);

  // Se for altura ou peso, podemos querer atualizar o registro mais recente do dia
  // ou simplesmente criar um novo histórico (histórico é melhor para gráficos).
  await prisma.healthMetric.create({
    data: { 
        type, 
        value, 
        date: new Date() 
    },
  });

  revalidatePath("/health");
}

// DELETAR MÉTRICA (Caso precise limpar histórico)
export async function deleteMetric(id: string) {
    await prisma.healthMetric.delete({ where: { id } });
    revalidatePath("/health");
}

// NOVA ACTION: REGISTRAR REFEIÇÃO
// REGISTRAR REFEIÇÃO (CREATE) - Mantido
export async function logMeal(formData: FormData) {
  const title = formData.get("title") as string;
  const items = formData.get("items") as string;
  const calories = parseInt(formData.get("calories") as string) || 0;
  const type = formData.get("type") as string; 

  await prisma.meal.create({
    data: {
      title, items, calories, type, date: new Date()
    }
  });

  revalidatePath("/health");
}

export async function updateMeal(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const items = formData.get("items") as string;
  const calories = parseInt(formData.get("calories") as string) || 0;
  const type = formData.get("type") as string;

  await prisma.meal.update({
    where: { id },
    data: {
      title, items, calories, type
    }
  });

  revalidatePath("/health");
}

export async function deleteMeal(id: string) {
    await prisma.meal.delete({ where: { id } });
    revalidatePath("/health");
}

