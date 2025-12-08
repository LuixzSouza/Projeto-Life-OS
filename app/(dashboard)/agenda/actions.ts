"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createEvent(formData: FormData) {
  const title = formData.get("title") as string;
  const dateStr = formData.get("date") as string; // Vem como YYYY-MM-DD
  const timeStr = formData.get("time") as string; // Vem como HH:MM
  
  // Montar o objeto Date combinando data e hora
  const startTime = new Date(`${dateStr}T${timeStr}:00`);
  
  await prisma.event.create({
    data: {
      title,
      startTime,
      category: "personal",
    },
  });

  revalidatePath("/agenda");
}

export async function deleteEvent(id: string) {
  await prisma.event.delete({ where: { id } });
  revalidatePath("/agenda");
}