"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import {
  getString, getBoolean, getNumber, getEnumValue, getDate,
  TASK_PRIORITIES, TASK_STATUSES,
} from "./helpers";

// =========================================================
// AÇÕES DE TAREFAS (CRUD Básico)
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

  const userId = await requireUserId();

  // Resolve o projeto: só aceita se pertencer ao usuário (senão cai no Inbox)
  let resolvedProjectId: string | null = null;
  if (projectId && projectId !== "inbox") {
    const owned = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
    resolvedProjectId = owned ? projectId : null;
  }

  await prisma.task.create({
    data: {
      title,
      description,
      priority,
      status,
      image,
      dueDate: getDate(dueDateRaw),
      projectId: resolvedProjectId,
      userId,
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

  const userId = await requireUserId();

  await prisma.task.updateMany({
    where: { id, userId },
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
  const userId = await requireUserId();
  await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: {
      isDone: !isDone,
      status: !isDone ? "DONE" : "TODO",
      progress: !isDone ? 100 : 0 // Sincroniza progresso com checkbox
    },
  });

  revalidatePath("/projects");
}

export async function deleteTask(taskId: string) {
  const userId = await requireUserId();
  await prisma.task.deleteMany({
    where: { id: taskId, userId },
  });

  revalidatePath("/projects");
}

// =========================================================
// AÇÕES RÁPIDAS DE TAREFAS (Interatividade UI)
// =========================================================

export async function toggleTaskPin(taskId: string, isPinned: boolean) {
  const userId = await requireUserId();
  await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: { isPinned: !isPinned },
  });
  revalidatePath("/projects");
}

export async function toggleTaskStar(taskId: string, isStarred: boolean) {
  const userId = await requireUserId();
  await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: { isStarred: !isStarred },
  });
  revalidatePath("/projects");
}

// Move uma tarefa entre colunas do Kanban (sincroniza isDone/progress).
export async function updateTaskStatus(taskId: string, statusRaw: string) {
  const status = getEnumValue(statusRaw, TASK_STATUSES, "TODO")!;
  const userId = await requireUserId();

  const isDone = status === "DONE";
  await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: {
      status,
      isDone,
      // DONE → 100%; outros mantêm progresso anterior, exceto TODO que zera.
      ...(isDone ? { progress: 100 } : status === "TODO" ? { progress: 0 } : {}),
    },
  });

  revalidatePath("/projects");
  return { success: true };
}

export async function updateTaskProgress(taskId: string, progress: number) {
  const userId = await requireUserId();
  await prisma.task.updateMany({
    where: { id: taskId, userId },
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
// MANUTENÇÃO (Sincronização de dados antigos)
// =========================================================

export async function syncExistingTasks() {
  // AVISO: O Prisma Schema diz que esses campos são obrigatórios,
  // mas estamos buscando por null para corrigir dados antigos/sujos no banco.
  // Usamos 'as unknown' para permitir passar 'null' onde o TS espera boolean/number.

  const userId = await requireUserId();

  await prisma.task.updateMany({
    where: {
      userId,
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
    const userId = await requireUserId();
    // Atualiza a ordem de cada tarefa em paralelo usando transação (escopada ao usuário)
    const transactions = orderedIds.map((id, index) =>
      prisma.task.updateMany({
        where: { id, userId },
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
