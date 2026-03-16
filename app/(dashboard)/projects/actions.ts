"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// =========================================================
// HELPERS (Utilitários para ler FormData)
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
    // Checkbox envia "on" ou "true"
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
// SLUG GENERATOR
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

    // Se não existe, ou se é o próprio projeto que estamos editando, o slug é válido
    if (!existing || existing.id === projectId) break;

    slug = `${base}-${count++}`;
  }

  return slug;
}

// =========================================================
// ENUMS (Configurações fixas)
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
// 1. AÇÕES DE PROJETOS
// =========================================================

export async function createProject(
  formData: FormData
): Promise<{ error?: string }> {
  try {
    const title = getString(formData, "title");
    const description = getString(formData, "description");
    const color = getString(formData, "color") ?? "#6366f1"; // Cor padrão (Indigo)

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
  const color = getString(formData, "color");

  if (!id || !title)
    throw new Error("ID e título são obrigatórios.");

  const slug = await generateUniqueSlug(title, id);

  await prisma.project.update({
    where: { id },
    data: {
      title,
      slug,
      description,
      color: color ?? undefined, // Atualiza cor se enviada
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

  // Deleta tarefas vinculadas primeiro (se não tiver Cascade no banco)
  await prisma.task.deleteMany({
    where: { projectId },
  });

  await prisma.project.delete({
    where: { id: projectId },
  });

  revalidatePath("/projects");
}

// =========================================================
// 2. AÇÕES DE TAREFAS (CRUD Básico)
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

  const priority = getEnumValue(priorityRaw, TASK_PRIORITIES, "MEDIUM");
  const status = getEnumValue(statusRaw, TASK_STATUSES, "TODO");

  await prisma.task.create({
    data: {
      title,
      description,
      priority,
      status,
      image,
      dueDate: getDate(dueDateRaw),
      projectId: projectId === "inbox" ? null : projectId,
      // Novos campos iniciam com padrão (definido no schema ou aqui)
      isPinned: false,
      isStarred: false,
      progress: 0,
    },
  });

  revalidatePath("/projects");
  if (projectId && projectId !== "inbox") {
    // Tenta revalidar a página específica do projeto se possível, 
    // mas o revalidatePath acima já cobre a maioria dos casos.
  }
}

export async function updateTask(formData: FormData) {
  const id = getString(formData, "id");
  const title = getString(formData, "title");

  if (!id || !title) throw new Error("ID e título são obrigatórios.");

  const priority = getEnumValue(getString(formData, "priority"), TASK_PRIORITIES, "MEDIUM");
  const status = getEnumValue(getString(formData, "status"), TASK_STATUSES, "TODO");

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
      status: !isDone ? "DONE" : "TODO",
      progress: !isDone ? 100 : 0 // Sincroniza progresso com checkbox
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
// 3. AÇÕES RÁPIDAS DE TAREFAS (Interatividade UI)
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
      // Atualiza status automaticamente baseado no progresso
      status: progress === 100 ? "DONE" : progress > 0 ? "IN_PROGRESS" : "TODO",
      isDone: progress === 100
    },
  });
  revalidatePath("/projects");
}

// =========================================================
// 4. JOB TRACKER (Vagas)
// =========================================================

export async function createJob(formData: FormData) {
  const company = getString(formData, "company");
  const role = getString(formData, "role");

  if (!company || !role) throw new Error("Empresa e cargo são obrigatórios.");

  const status = getEnumValue(getString(formData, "status"), JOB_STATUS, "APPLIED") ?? "APPLIED";
  const type = getEnumValue(getString(formData, "type"), JOB_TYPES, "JOB");

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

  if (!id || !company || !role) throw new Error("Campos obrigatórios ausentes.");

  await prisma.jobApplication.update({
    where: { id },
    data: {
      company,
      role,
      jobUrl: getString(formData, "jobUrl"),
      salary: getString(formData, "salary"),
      requirements: getString(formData, "requirements"),
      status: getEnumValue(getString(formData, "status"), JOB_STATUS, "APPLIED"),
      type: getEnumValue(getString(formData, "type"), JOB_TYPES, "JOB"),
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
// 5. MANUTENÇÃO (Sincronização de dados antigos)
// =========================================================

export async function syncExistingTasks() {
  // AVISO: O Prisma Schema diz que esses campos são obrigatórios, 
  // mas estamos buscando por null para corrigir dados antigos/sujos no banco.
  // Usamos 'as unknown' para permitir passar 'null' onde o TS espera boolean/number.
  
  await prisma.task.updateMany({
    where: {
      OR: [
        // Type Assertion: null -> unknown -> boolean
        { isPinned: null as unknown as boolean }, 
        // Type Assertion: null -> unknown -> number
        { progress: null as unknown as number }
      ]
    },
    data: {
      // Nota: Cuidado ao resetar status para "TODO". 
      // Se quiser preservar o status atual de tarefas antigas, remova a linha abaixo.
      status: "TODO", 
      isPinned: false,
      isStarred: false,
      progress: 0,
    },
  });

  revalidatePath("/projects");
}

export async function updateTasksOrder(orderedIds: string[]) {
  try {
    // Atualiza a ordem de cada tarefa em paralelo usando transação
    const transactions = orderedIds.map((id, index) => 
      prisma.task.update({
        where: { id },
        data: { order: index } // Certifique-se de ter um campo 'order: Float' no seu schema.prisma
      })
    );
    
    await prisma.$transaction(transactions);
    return { success: true };
  } catch (error) {
    console.error("Erro ao reordenar tarefas:", error);
    return { error: "Falha na sincronização da ordem." };
  }
}

export async function updateProjectNotes(projectId: string, notes: string) {
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { description: notes } // Aqui você pode usar 'description' ou um campo 'notes' se tiver criado
    });
    
    // Revalida a página para atualizar o cache
    revalidatePath("/projects/[slug]", "page");
    return { success: true };
  } catch (error) {
    return { error: "Falha técnica ao salvar os registros." };
  }
}