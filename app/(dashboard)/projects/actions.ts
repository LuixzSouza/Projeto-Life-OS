"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// =========================================================
// 1. GERENCIAMENTO DE PROJETOS
// =========================================================

export async function createProject(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  await prisma.project.create({
    data: { title, description },
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
  // 1. Deleta todas as tarefas associadas primeiro (Limpeza)
  await prisma.task.deleteMany({
    where: { projectId: projectId }
  });

  // 2. Deleta o projeto pai
  await prisma.project.delete({
    where: { id: projectId }
  });

  revalidatePath("/projects");
}


// =========================================================
// 2. GERENCIAMENTO DE TAREFAS
// =========================================================

export async function createTask(formData: FormData) {
  const title = formData.get("title") as string;
  const projectId = formData.get("projectId") as string || null;
  const priority = formData.get("priority") as string || "MEDIUM";
  const dateStr = formData.get("dueDate") as string;
  const image = formData.get("image") as string; 

  await prisma.task.create({
    data: {
      title,
      priority,
      image: image || null, 
      dueDate: dateStr ? new Date(dateStr) : null,
      projectId: projectId === "inbox" ? null : projectId,
    },
  });

  revalidatePath("/projects");
}

export async function updateTask(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const priority = formData.get("priority") as string;
  const dateStr = formData.get("dueDate") as string;
  const image = formData.get("image") as string;

  await prisma.task.update({
    where: { id },
    data: {
      title,
      priority,
      dueDate: dateStr ? new Date(dateStr) : null,
      image: image || null 
    }
  });

  revalidatePath("/projects");
}

export async function toggleTask(taskId: string, currentStatus: boolean) {
  await prisma.task.update({
    where: { id: taskId },
    data: { isDone: !currentStatus },
  });
  revalidatePath("/projects");
}

export async function deleteTask(taskId: string) {
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/projects");
}


// =========================================================
// 3. GERENCIAMENTO DE VAGAS & SERVIÇOS (JOB TRACKER)
// =========================================================

export async function createJob(formData: FormData) {
  const company = formData.get("company") as string;
  const role = formData.get("role") as string;
  const jobUrl = formData.get("jobUrl") as string;
  const salary = formData.get("salary") as string;
  const status = formData.get("status") as string;
  const requirements = formData.get("requirements") as string;
  const type = formData.get("type") as string || "JOB"; // Padrão para Vaga

  const user = await prisma.user.findFirst();

  await prisma.jobApplication.create({
    data: {
      company,
      role,
      jobUrl: jobUrl || null,
      salary: salary || null,
      status,
      requirements: requirements || null,
      type,
      userId: user?.id
    }
  });

  revalidatePath("/projects");
}

export async function updateJob(formData: FormData) {
  const id = formData.get("id") as string;
  
  await prisma.jobApplication.update({
    where: { id },
    data: {
      company: formData.get("company") as string,
      role: formData.get("role") as string,
      jobUrl: (formData.get("jobUrl") as string) || null,
      salary: (formData.get("salary") as string) || null,
      status: formData.get("status") as string,
      requirements: (formData.get("requirements") as string) || null,
      type: formData.get("type") as string
    }
  });

  revalidatePath("/projects");
}

export async function deleteJob(jobId: string) {
  await prisma.jobApplication.delete({ where: { id: jobId } });
  revalidatePath("/projects");
}