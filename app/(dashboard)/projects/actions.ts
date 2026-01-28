"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// =========================================================
// HELPERS
// =========================================================

function getString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : null;
}

function getBoolean(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  if (typeof value === "string") {
    return value === "true" || value === "on";
  }
  return false;
}

function getNumber(formData: FormData, key: string): number | null {
  const value = formData.get(key);
  if (typeof value === "string") {
    const num = parseInt(value);
    return isNaN(num) ? null : num;
  }
  return null;
}

function getEnumValue<T extends readonly string[]>(
  value: string | null,
  allowed: T,
  fallback?: T[number]
): T[number] | undefined {
  if (value && allowed.includes(value)) return value as T[number];
  return fallback;
}

function getDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

// =========================================================
// SLUG
// =========================================================

function createSlug(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function generateUniqueSlug(title: string, projectId?: string) {
  const base = createSlug(title);
  let slug = base;
  let count = 1;

  while (true) {
    const existing = await prisma.project.findUnique({
      where: { slug },
    });

    if (!existing || existing.id === projectId) break;

    slug = `${base}-${count++}`;
  }

  return slug;
}

// =========================================================
// ENUMS
// =========================================================

const TASK_PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
const TASK_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
const JOB_STATUS = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "TEST",
  "OFFER",
  "ACTIVE",
  "REJECTED",
] as const;
const JOB_TYPES = ["JOB", "FREELANCE"] as const;

// =========================================================
// 1. PROJETOS
// =========================================================

export async function createProject(
  formData: FormData
): Promise<{ error?: string }> {
  try {
    const title = getString(formData, "title");
    const description = getString(formData, "description");
    const color = getString(formData, "color") ?? "#6366f1";

    if (!title) {
      return { error: "O título do projeto é obrigatório." };
    }

    const slug = await generateUniqueSlug(title);

    await prisma.project.create({
      data: {
        title,
        slug,
        description,
        color,
      },
    });

    revalidatePath("/projects");

    return {};
  } catch (error) {
    console.error(error);
    return { error: "Erro interno ao criar projeto." };
  }
}

export async function updateProject(formData: FormData) {
  const id = getString(formData, "id");
  const title = getString(formData, "title");
  const description = getString(formData, "description");

  if (!id || !title)
    throw new Error("ID e título são obrigatórios.");

  const slug = await generateUniqueSlug(title, id);

  await prisma.project.update({
    where: { id },
    data: {
      title,
      slug,
      description,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${slug}`);
}

export async function deleteProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) return;

  await prisma.task.deleteMany({
    where: { projectId },
  });

  await prisma.project.delete({
    where: { id: projectId },
  });

  revalidatePath("/projects");
}

// =========================================================
// 2. TAREFAS - FUNÇÕES ATUALIZADAS
// =========================================================

export async function createTask(formData: FormData) {
  const title = getString(formData, "title");
  const projectId = getString(formData, "projectId");
  const priorityRaw = getString(formData, "priority");
  const statusRaw = getString(formData, "status");
  const dueDateRaw = getString(formData, "dueDate");
  const image = getString(formData, "image");
  const description = getString(formData, "description");

  if (!title) throw new Error("O título da tarefa é obrigatório.");

  const priority = getEnumValue(
    priorityRaw,
    TASK_PRIORITIES,
    "MEDIUM"
  );

  const status = getEnumValue(
    statusRaw,
    TASK_STATUSES,
    "TODO"
  );

  await prisma.task.create({
    data: {
      title,
      description,
      priority,
      status,
      image,
      dueDate: getDate(dueDateRaw),
      projectId: projectId === "inbox" ? null : projectId,
    },
  });

  revalidatePath("/projects");
}

export async function updateTask(formData: FormData) {
  const id = getString(formData, "id");
  const title = getString(formData, "title");

  if (!id || !title)
    throw new Error("ID e título são obrigatórios.");

  const priority = getEnumValue(
    getString(formData, "priority"),
    TASK_PRIORITIES,
    "MEDIUM"
  );

  const status = getEnumValue(
    getString(formData, "status"),
    TASK_STATUSES,
    "TODO"
  );

  const isPinned = getBoolean(formData, "isPinned");
  const isStarred = getBoolean(formData, "isStarred");
  const progress = getNumber(formData, "progress") ?? 0;
  const estimatedTime = getNumber(formData, "estimatedTime");

  await prisma.task.update({
    where: { id },
    data: {
      title,
      description: getString(formData, "description"),
      priority,
      status,
      dueDate: getDate(getString(formData, "dueDate")),
      image: getString(formData, "image"),
      isPinned,
      isStarred,
      progress,
      estimatedTime,
    },
  });

  revalidatePath("/projects");
}

export async function toggleTask(taskId: string, isDone: boolean) {
  await prisma.task.update({
    where: { id: taskId },
    data: { 
      isDone: !isDone,
      status: !isDone ? "DONE" : "TODO"
    },
  });

  revalidatePath("/projects");
}

export async function deleteTask(taskId: string) {
  await prisma.task.delete({
    where: { id: taskId },
  });

  revalidatePath("/projects");
}

// =========================================================
// 3. FUNÇÕES ADICIONAIS PARA NOVAS FUNCIONALIDADES
// =========================================================

export async function toggleTaskPin(taskId: string, isPinned: boolean) {
  await prisma.task.update({
    where: { id: taskId },
    data: { isPinned: !isPinned },
  });

  revalidatePath("/projects");
}

export async function toggleTaskStar(taskId: string, isStarred: boolean) {
  await prisma.task.update({
    where: { id: taskId },
    data: { isStarred: !isStarred },
  });

  revalidatePath("/projects");
}

export async function updateTaskProgress(taskId: string, progress: number) {
  await prisma.task.update({
    where: { id: taskId },
    data: { 
      progress,
      status: progress === 100 ? "DONE" : progress > 0 ? "IN_PROGRESS" : "TODO"
    },
  });

  revalidatePath("/projects");
}

// =========================================================
// 4. JOB TRACKER
// =========================================================

export async function createJob(formData: FormData) {
  const company = getString(formData, "company");
  const role = getString(formData, "role");

  if (!company || !role)
    throw new Error("Empresa e cargo são obrigatórios.");

  const status =
    getEnumValue(
      getString(formData, "status"),
      JOB_STATUS,
      "APPLIED"
    ) ?? "APPLIED";

  const type = getEnumValue(
    getString(formData, "type"),
    JOB_TYPES,
    "JOB"
  );

  const user = await prisma.user.findFirst();

  await prisma.jobApplication.create({
    data: {
      company,
      role,
      jobUrl: getString(formData, "jobUrl"),
      salary: getString(formData, "salary"),
      requirements: getString(formData, "requirements"),
      status,
      type,
      userId: user?.id,
    },
  });

  revalidatePath("/projects");
}

export async function updateJob(formData: FormData) {
  const id = getString(formData, "id");
  const company = getString(formData, "company");
  const role = getString(formData, "role");

  if (!id || !company || !role)
    throw new Error("Campos obrigatórios ausentes.");

  await prisma.jobApplication.update({
    where: { id },
    data: {
      company,
      role,
      jobUrl: getString(formData, "jobUrl"),
      salary: getString(formData, "salary"),
      requirements: getString(formData, "requirements"),
      status: getEnumValue(
        getString(formData, "status"),
        JOB_STATUS,
        "APPLIED"
      ),
      type: getEnumValue(
        getString(formData, "type"),
        JOB_TYPES,
        "JOB"
      ),
    },
  });

  revalidatePath("/projects");
}

export async function deleteJob(jobId: string) {
  await prisma.jobApplication.delete({
    where: { id: jobId },
  });

  revalidatePath("/projects");
}

// =========================================================
// 5. FUNÇÕES DE SINCRONIZAÇÃO PARA DADOS EXISTENTES
// =========================================================

export async function syncExistingTasks() {
  // Atualiza todas as tarefas existentes para terem os novos campos com valores padrão
  await prisma.task.updateMany({
    data: {
      status: "TODO",
      isPinned: false,
      isStarred: false,
      progress: 0,
    },
  });

  revalidatePath("/projects");
}