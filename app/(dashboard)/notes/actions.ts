"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";

export interface NoteData {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  tags: string | null;
  isFavorite: boolean;
  subjectId: string | null;
  subjectTitle: string | null;
  subjectColor: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface NoteSubject {
  id: string;
  title: string;
}

// Lê um campo do FormData, normaliza vazio para null.
function field(formData: FormData, key: string): string | null {
  const v = (formData.get(key) as string | null)?.trim();
  return v ? v : null;
}

// Resolve a matéria vinculada garantindo que pertence ao usuário (senão fica solta).
async function resolveSubjectId(formData: FormData, userId: string): Promise<string | null> {
  const subjectId = field(formData, "subjectId");
  if (!subjectId || subjectId === "none") return null;
  const owned = await prisma.studySubject.findFirst({ where: { id: subjectId, userId }, select: { id: true } });
  return owned ? subjectId : null;
}

/** Lista as anotações vivas (não na lixeira) do usuário, com a matéria resolvida. */
export async function getNotes(): Promise<NoteData[]> {
  const userId = await requireUserId();
  const rows = await prisma.studyNote.findMany({
    where: { userId, deletedAt: null },
    orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    include: { subject: { select: { title: true, color: true } } },
  });
  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    summary: n.summary,
    tags: n.tags,
    isFavorite: n.isFavorite,
    subjectId: n.subjectId,
    subjectTitle: n.subject?.title ?? null,
    subjectColor: n.subject?.color ?? null,
    updatedAt: n.updatedAt.toISOString(),
    createdAt: n.createdAt.toISOString(),
  }));
}

/** Matérias do usuário (para o seletor opcional ao criar/editar uma anotação). */
export async function getNoteSubjects(): Promise<NoteSubject[]> {
  const userId = await requireUserId();
  const subjects = await prisma.studySubject.findMany({
    where: { userId },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });
  return subjects;
}

export async function createNote(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const title = field(formData, "title");
    if (!title) return { success: false, message: "O título é obrigatório." };

    const subjectId = await resolveSubjectId(formData, userId);
    const created = await prisma.studyNote.create({
      data: {
        userId,
        title,
        content: field(formData, "content") ?? "",
        tags: field(formData, "tags"),
        isFavorite: formData.get("isFavorite") === "true",
        subjectId,
      },
    });

    await logActivity({
      action: "CREATE",
      module: "studies",
      entityType: "note",
      entityId: created.id,
      summary: `Criou a anotação "${created.title}"`,
    });

    revalidatePath("/notes");
    return { success: true, message: "Anotação criada." };
  } catch (error) {
    console.error("Erro ao criar anotação:", error);
    return { success: false, message: "Falha ao criar a anotação." };
  }
}

export async function updateNote(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const id = field(formData, "id");
    const title = field(formData, "title");
    if (!id || !title) return { success: false, message: "Dados inválidos." };

    const subjectId = await resolveSubjectId(formData, userId);
    await prisma.studyNote.updateMany({
      where: { id, userId },
      data: {
        title,
        content: field(formData, "content") ?? "",
        tags: field(formData, "tags"),
        isFavorite: formData.get("isFavorite") === "true",
        subjectId,
      },
    });

    revalidatePath("/notes");
    return { success: true, message: "Anotação atualizada." };
  } catch (error) {
    console.error("Erro ao atualizar anotação:", error);
    return { success: false, message: "Falha ao atualizar a anotação." };
  }
}

/** Soft-delete: a anotação vai para a Lixeira. Restaurar/excluir: ver /trash. */
export async function deleteNote(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const note = await prisma.studyNote.findFirst({ where: { id, userId, deletedAt: null }, select: { title: true } });
    await prisma.studyNote.updateMany({ where: { id, userId }, data: { deletedAt: new Date() } });

    await logActivity({
      action: "DELETE",
      module: "studies",
      entityType: "note",
      entityId: id,
      summary: note ? `Moveu "${note.title}" para a lixeira` : "Removeu uma anotação",
    });

    revalidatePath("/notes");
    return { success: true, message: "Anotação movida para a lixeira." };
  } catch (error) {
    console.error("Erro ao excluir anotação:", error);
    return { success: false, message: "Falha ao excluir a anotação." };
  }
}

export async function toggleNoteFavorite(id: string, current: boolean): Promise<{ success: boolean }> {
  try {
    const userId = await requireUserId();
    await prisma.studyNote.updateMany({ where: { id, userId }, data: { isFavorite: !current } });
    revalidatePath("/notes");
    return { success: true };
  } catch {
    return { success: false };
  }
}
