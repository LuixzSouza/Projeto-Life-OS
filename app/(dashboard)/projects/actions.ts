"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { JobApplication } from "@prisma/client";

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
  
  // Tratamento de campos opcionais que podem não vir do Input Rápido
  const priority = formData.get("priority") as string || "MEDIUM";
  const dateStr = formData.get("dueDate") as string; // YYYY-MM-DD
  const image = formData.get("image") as string; // Base64 String
  
  const user = await prisma.user.findFirst();

  await prisma.task.create({
    data: {
      title,
      priority,
      image: image || null, // Se for string vazia ou null, salva null
      dueDate: dateStr ? new Date(dateStr) : null,
      projectId: projectId === "inbox" ? null : projectId,
      // Se necessário: userId: user?.id
    },
  });

  revalidatePath("/projects");
}

export async function updateProject(formData: FormData) {
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    await prisma.project.update({
        where: { id },
        data: { title, description }
    });
    revalidatePath("/projects");
}

export async function deleteProject(projectId: string) {
    // 1. Deleta todas as tarefas associadas (crianças)
    await prisma.task.deleteMany({
        where: { projectId: projectId }
    });

    // 2. Deleta o projeto pai
    await prisma.project.delete({
        where: { id: projectId }
    });

    revalidatePath("/projects");
}

export async function updateTask(formData: FormData) {
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const priority = formData.get("priority") as string;
    const dateStr = formData.get("dueDate") as string;
    const image = formData.get("image") as string; // <--- Novo

    await prisma.task.update({
        where: { id },
        data: {
            title,
            priority,
            dueDate: dateStr ? new Date(dateStr) : null,
            image: image || null // Salva ou limpa
        }
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

// --- ACTIONS DE VAGAS ---

export async function createJob(formData: FormData) {
  const company = formData.get("company") as string;
  const role = formData.get("role") as string;
  const jobUrl = formData.get("jobUrl") as string;
  const salary = formData.get("salary") as string;
  const status = formData.get("status") as string;
  const requirements = formData.get("requirements") as string; // Novo

  const user = await prisma.user.findFirst();

  await prisma.jobApplication.create({
    data: {
      company, role, jobUrl, salary, status, requirements,
      userId: user?.id
    }
  });

  revalidatePath("/projects");
}

export async function updateJob(formData: FormData) {
  const id = formData.get("id") as string;
  const company = formData.get("company") as string;
  const role = formData.get("role") as string;
  const jobUrl = formData.get("jobUrl") as string;
  const salary = formData.get("salary") as string;
  const status = formData.get("status") as string;
  const requirements = formData.get("requirements") as string;

  await prisma.jobApplication.update({
    where: { id },
    data: {
      company, role, jobUrl, salary, status, requirements
    }
  });

  revalidatePath("/projects");
}

export async function deleteJob(jobId: string) {
  await prisma.jobApplication.delete({ where: { id: jobId } });
  revalidatePath("/projects");
}