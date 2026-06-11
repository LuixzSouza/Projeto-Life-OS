"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { serializeChecklist, type TaskChecklistItem } from "@/lib/task-checklist";
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
    const owned = await prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null }, select: { id: true } });
    resolvedProjectId = owned ? projectId : null;
  }

  const created = await prisma.task.create({
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

  await logActivity({
    action: "CREATE",
    module: "tasks",
    entityType: "task",
    entityId: created.id,
    summary: `Criou a tarefa "${created.title}"`,
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

// `isDone` é o estado DESEJADO (vindo do checkbox), aplicado diretamente.
export async function toggleTask(taskId: string, isDone: boolean) {
  const userId = await requireUserId();
  await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: {
      isDone: isDone,
      status: isDone ? "DONE" : "TODO",
      progress: isDone ? 100 : 0 // Sincroniza progresso com checkbox
    },
  });

  await logActivity({
    action: isDone ? "COMPLETE" : "REOPEN",
    module: "tasks",
    entityType: "task",
    entityId: taskId,
    summary: isDone ? "Concluiu uma tarefa" : "Reabriu uma tarefa",
  });

  revalidatePath("/projects");
}

// Soft-delete: a tarefa vai para a Lixeira (deletedAt) e some das listagens.
// Restaurar/excluir em definitivo: ver app/(dashboard)/trash.
export async function deleteTask(taskId: string) {
  const userId = await requireUserId();
  const task = await prisma.task.findFirst({ where: { id: taskId, userId }, select: { title: true } });
  await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    action: "DELETE",
    module: "tasks",
    entityType: "task",
    entityId: taskId,
    summary: task ? `Moveu "${task.title}" para a lixeira` : "Excluiu uma tarefa",
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

// ----------------------------------------------------------------------------
// CHECKLIST (subtarefas dentro da tarefa — JSON tipado em Task.checklist)
// ----------------------------------------------------------------------------

export async function updateTaskChecklist(
  taskId: string,
  items: TaskChecklistItem[]
): Promise<{ success?: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    await prisma.task.updateMany({
      where: { id: taskId, userId },
      data: { checklist: serializeChecklist(items) },
    });
    revalidatePath("/projects/[slug]", "page");
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar checklist:", error);
    return { error: "Falha ao salvar a checklist." };
  }
}

// ----------------------------------------------------------------------------
// DEPENDÊNCIAS ("bloqueada por") — EntityLink kind BLOCKS, sem schema novo.
// O link é (fromType: task, fromId: BLOQUEADORA) -> (toType: task, toId: bloqueada).
// ----------------------------------------------------------------------------

export interface TaskBlockerInfo {
  taskId: string; // a tarefa BLOQUEADA
  blockerId: string;
  blockerTitle: string;
  blockerDone: boolean;
}

/** Mapa de bloqueios das tarefas de um projeto (null = inbox). */
export async function getTaskBlockers(projectId: string | null): Promise<TaskBlockerInfo[]> {
  const userId = await requireUserId();
  const tasks = await prisma.task.findMany({
    where: { projectId, userId, deletedAt: null },
    select: { id: true },
  });
  const ids = tasks.map((t) => t.id);
  if (ids.length === 0) return [];

  const links = await prisma.entityLink.findMany({
    where: { userId, kind: "BLOCKS", fromType: "task", toType: "task", toId: { in: ids } },
  });
  if (links.length === 0) return [];

  const blockers = await prisma.task.findMany({
    where: { id: { in: links.map((l) => l.fromId) }, userId },
    select: { id: true, title: true, isDone: true },
  });
  const byId = new Map(blockers.map((b) => [b.id, b]));

  return links.flatMap((l) => {
    const blocker = byId.get(l.fromId);
    if (!blocker) return [];
    return [{ taskId: l.toId, blockerId: blocker.id, blockerTitle: blocker.title, blockerDone: blocker.isDone }];
  });
}

export interface TaskDependencyState {
  /** Tarefas do mesmo projeto que podem bloquear esta (exclui a própria). */
  candidates: { id: string; title: string; isDone: boolean }[];
  /** Ids das tarefas que atualmente bloqueiam esta. */
  blockerIds: string[];
}

/** Estado de dependências de UMA tarefa (para o editor no modal). */
export async function getTaskDependencyState(taskId: string): Promise<TaskDependencyState> {
  const userId = await requireUserId();
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { projectId: true },
  });
  if (!task) return { candidates: [], blockerIds: [] };

  const [candidates, links] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: task.projectId, userId, deletedAt: null, id: { not: taskId } },
      orderBy: [{ isDone: "asc" }, { order: "asc" }],
      take: 200,
      select: { id: true, title: true, isDone: true },
    }),
    prisma.entityLink.findMany({
      where: { userId, kind: "BLOCKS", fromType: "task", toType: "task", toId: taskId },
      select: { fromId: true },
    }),
  ]);

  return { candidates, blockerIds: links.map((l) => l.fromId) };
}

/** Define quem bloqueia a tarefa (substitui o conjunto atual). */
export async function setTaskBlockers(
  taskId: string,
  blockerIds: string[]
): Promise<{ success?: boolean; error?: string }> {
  try {
    const userId = await requireUserId();

    // Sanidade: só tarefas do próprio usuário, sem auto-bloqueio.
    const valid = await prisma.task.findMany({
      where: { id: { in: blockerIds.filter((b) => b !== taskId) }, userId, deletedAt: null },
      select: { id: true },
    });

    await prisma.entityLink.deleteMany({
      where: { userId, kind: "BLOCKS", fromType: "task", toType: "task", toId: taskId },
    });
    if (valid.length > 0) {
      await prisma.entityLink.createMany({
        data: valid.map((v) => ({
          userId,
          kind: "BLOCKS",
          fromType: "task",
          fromId: v.id,
          toType: "task",
          toId: taskId,
        })),
      });
    }

    revalidatePath("/projects/[slug]", "page");
    return { success: true };
  } catch (error) {
    console.error("Erro ao definir bloqueios:", error);
    return { error: "Falha ao salvar as dependências." };
  }
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
