"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Criar Projeto
export async function createProject(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  await prisma.project.create({
    data: { title, description },
  });

  revalidatePath("/projects");
}

// Criar Tarefa
export async function createTask(formData: FormData) {
  const title = formData.get("title") as string;
  const projectId = formData.get("projectId") as string || null;

  await prisma.task.create({
    data: {
      title,
      projectId: projectId === "inbox" ? null : projectId, // Se for "inbox", salva como null
    },
  });

  revalidatePath("/projects");
}

// Marcar como Feita/Pendente (Toggle)
export async function toggleTask(taskId: string, currentStatus: boolean) {
  await prisma.task.update({
    where: { id: taskId },
    data: { isDone: !currentStatus },
  });

  revalidatePath("/projects");
}

// Deletar Tarefa
export async function deleteTask(taskId: string) {
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/projects");
}