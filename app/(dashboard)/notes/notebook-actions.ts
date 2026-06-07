"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface NotebookData {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  isInbox: boolean;
  position: number;
  noteCount: number;
}

const INBOX_NAME = "Entrada";

/** Garante que o usuário tenha um caderno Inbox; devolve o id dele. */
export async function ensureInbox(userId: string): Promise<string> {
  const existing = await prisma.notebook.findFirst({
    where: { userId, isInbox: true },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.notebook.create({
    data: { userId, name: INBOX_NAME, isInbox: true, color: "#64748b", icon: "inbox", position: -1 },
  });
  return created.id;
}

/** Lista os cadernos do usuário (Entrada primeiro) com a contagem de notas vivas. */
export async function getNotebooks(): Promise<NotebookData[]> {
  const userId = await requireUserId();
  const inboxId = await ensureInbox(userId);

  const [rows, counts] = await Promise.all([
    prisma.notebook.findMany({
      where: { userId },
      orderBy: [{ isInbox: "desc" }, { position: "asc" }, { name: "asc" }],
    }),
    prisma.studyNote.groupBy({
      by: ["notebookId"],
      where: { userId, deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const countByNotebook = new Map<string, number>();
  let orphanCount = 0; // notas antigas sem caderno → contam para a Entrada
  for (const c of counts) {
    if (c.notebookId) countByNotebook.set(c.notebookId, c._count._all);
    else orphanCount += c._count._all;
  }

  return rows.map((n) => ({
    id: n.id,
    name: n.name,
    color: n.color,
    icon: n.icon,
    isInbox: n.isInbox,
    position: n.position,
    noteCount: (countByNotebook.get(n.id) ?? 0) + (n.id === inboxId ? orphanCount : 0),
  }));
}

export async function createNotebook(
  name: string,
  color?: string,
  icon?: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const trimmed = name.trim();
    if (!trimmed) return { success: false, message: "Dê um nome ao caderno." };

    const max = await prisma.notebook.aggregate({ where: { userId }, _max: { position: true } });
    await prisma.notebook.create({
      data: { userId, name: trimmed, color: color ?? "#6366f1", icon: icon ?? null, position: (max._max.position ?? 0) + 1 },
    });
    revalidatePath("/notes");
    return { success: true, message: "Caderno criado." };
  } catch (error) {
    console.error("Erro ao criar caderno:", error);
    return { success: false, message: "Falha ao criar o caderno." };
  }
}

export async function updateNotebook(
  id: string,
  data: { name?: string; color?: string; icon?: string | null },
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const patch: { name?: string; color?: string; icon?: string | null } = {};
    if (data.name !== undefined) {
      const trimmed = data.name.trim();
      if (!trimmed) return { success: false, message: "O nome não pode ficar vazio." };
      patch.name = trimmed;
    }
    if (data.color !== undefined) patch.color = data.color;
    if (data.icon !== undefined) patch.icon = data.icon;

    await prisma.notebook.updateMany({ where: { id, userId }, data: patch });
    revalidatePath("/notes");
    return { success: true, message: "Caderno atualizado." };
  } catch (error) {
    console.error("Erro ao atualizar caderno:", error);
    return { success: false, message: "Falha ao atualizar o caderno." };
  }
}

/** Exclui um caderno (exceto a Entrada). As notas dele voltam para a Entrada. */
export async function deleteNotebook(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const nb = await prisma.notebook.findFirst({ where: { id, userId }, select: { isInbox: true } });
    if (!nb) return { success: false, message: "Caderno não encontrado." };
    if (nb.isInbox) return { success: false, message: "O caderno Entrada não pode ser excluído." };

    const inboxId = await ensureInbox(userId);
    await prisma.studyNote.updateMany({ where: { notebookId: id, userId }, data: { notebookId: inboxId } });
    await prisma.notebook.deleteMany({ where: { id, userId } });
    revalidatePath("/notes");
    return { success: true, message: "Caderno excluído. Notas movidas para a Entrada." };
  } catch (error) {
    console.error("Erro ao excluir caderno:", error);
    return { success: false, message: "Falha ao excluir o caderno." };
  }
}

/** Reordena os cadernos conforme a lista de ids (define position = índice). */
export async function reorderNotebooks(orderedIds: string[]): Promise<{ success: boolean }> {
  try {
    const userId = await requireUserId();
    // Garante que só mexemos em cadernos do próprio usuário.
    const owned = await prisma.notebook.findMany({
      where: { id: { in: orderedIds }, userId },
      select: { id: true },
    });
    const ownedSet = new Set(owned.map((n) => n.id));
    await prisma.$transaction(
      orderedIds
        .filter((id) => ownedSet.has(id))
        .map((id, index) =>
          prisma.notebook.update({ where: { id }, data: { position: index } }),
        ),
    );
    revalidatePath("/notes");
    return { success: true };
  } catch (error) {
    console.error("Erro ao reordenar cadernos:", error);
    return { success: false };
  }
}

/** Move uma nota para outro caderno. */
export async function moveNoteToNotebook(
  noteId: string,
  notebookId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const owned = await prisma.notebook.findFirst({ where: { id: notebookId, userId }, select: { id: true } });
    if (!owned) return { success: false, message: "Caderno inválido." };
    await prisma.studyNote.updateMany({ where: { id: noteId, userId }, data: { notebookId } });
    revalidatePath("/notes");
    return { success: true, message: "Nota movida." };
  } catch (error) {
    console.error("Erro ao mover nota:", error);
    return { success: false, message: "Falha ao mover a nota." };
  }
}
