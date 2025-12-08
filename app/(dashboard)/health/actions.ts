"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Registrar Treino
export async function logWorkout(formData: FormData) {
  const title = formData.get("title") as string;
  const type = formData.get("type") as string;
  const duration = parseInt(formData.get("duration") as string);
  const intensity = formData.get("intensity") as string;
  const notes = formData.get("notes") as string;

  await prisma.workout.create({
    data: {
      title,
      type,
      duration,
      intensity,
      notes,
    },
  });

  revalidatePath("/health");
}

// Registrar Métrica (Peso, Água, Sono)
export async function logMetric(formData: FormData) {
  const type = formData.get("type") as string;
  const value = parseFloat(formData.get("value") as string);

  await prisma.healthMetric.create({
    data: {
      type,
      value,
      date: new Date(),
    },
  });

  revalidatePath("/health");
}