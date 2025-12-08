"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Função para criar evento, combinando data e hora
export async function createEvent(formData: FormData) {
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const dateStr = formData.get("date") as string;
    const timeStr = formData.get("time") as string;
    
    if (!title || !dateStr || !timeStr) throw new Error("Dados incompletos.");

    // Combina data e hora
    const startTime = new Date(`${dateStr}T${timeStr}:00`);

    await prisma.event.create({
        data: {
            title,
            description: description || null,
            startTime,
            // Assume category="general" e isAllDay=false como defaults do Prisma
        }
    });

    revalidatePath("/agenda");
}

// Função para deletar evento (usada no modal)
export async function deleteEvent(eventId: string) {
    await prisma.event.delete({ where: { id: eventId } });
    revalidatePath("/agenda");
}

// NOVA FUNÇÃO: Alternar o status de uma tarefa
export async function toggleTaskDone(taskId: string) {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { isDone: true }
    });

    if (!task) return;

    await prisma.task.update({
        where: { id: taskId },
        data: { isDone: !task.isDone }
    });

    revalidatePath("/agenda");
}