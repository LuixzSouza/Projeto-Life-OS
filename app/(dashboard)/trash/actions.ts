"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";

export interface TrashItem {
  id: string;
  type: string; // "task" (extensível a outros modelos com deletedAt)
  title: string;
  deletedAt: string;
}

/** Lista itens na lixeira (soft-deleted). Hoje: tarefas. */
export async function getTrash(): Promise<TrashItem[]> {
  const userId = await requireUserId();
  const tasks = await prisma.task.findMany({
    where: { userId, deletedAt: { not: null } },
    select: { id: true, title: true, deletedAt: true },
    orderBy: { deletedAt: "desc" },
  });
  return tasks.map((t) => ({ id: t.id, type: "task", title: t.title, deletedAt: t.deletedAt!.toISOString() }));
}

/** Restaura um item (limpa deletedAt). */
export async function restoreItem(type: string, id: string): Promise<TrashItem[]> {
  const userId = await requireUserId();
  if (type === "task") {
    await prisma.task.updateMany({ where: { id, userId }, data: { deletedAt: null } });
    await logActivity({ action: "RESTORE", module: "tasks", entityType: "task", entityId: id, summary: "Restaurou uma tarefa da lixeira" });
    revalidatePath("/projects");
  }
  revalidatePath("/trash");
  return getTrash();
}

/** Exclui em definitivo (hard delete) — só itens que já estão na lixeira. */
export async function purgeItem(type: string, id: string): Promise<TrashItem[]> {
  const userId = await requireUserId();
  if (type === "task") {
    await prisma.task.deleteMany({ where: { id, userId, deletedAt: { not: null } } });
  }
  revalidatePath("/trash");
  return getTrash();
}

/** Esvazia a lixeira (hard delete de tudo que está soft-deleted). */
export async function emptyTrash(): Promise<TrashItem[]> {
  const userId = await requireUserId();
  await prisma.task.deleteMany({ where: { userId, deletedAt: { not: null } } });
  revalidatePath("/trash");
  return getTrash();
}
