"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createSubject(formData: FormData) {
  const title = formData.get("title") as string;
  const category = formData.get("category") as string;
  
  await prisma.studySubject.create({
    data: {
      title,
      category,
      color: "blue", // Padrão por enquanto
    },
  });

  revalidatePath("/studies");
}

export async function logSession(subjectId: string, durationMinutes: number, notes: string) {
  if (durationMinutes < 1) return; // Não salva sessões zeradas

  await prisma.studySession.create({
    data: {
      subjectId,
      durationMinutes,
      notes,
      date: new Date(),
    },
  });

  revalidatePath("/studies");
}