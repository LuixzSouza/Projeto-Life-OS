"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { getString, generateUniqueSlug } from "./helpers";

// =========================================================
// AÇÕES DE PROJETOS
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

    const userId = await requireUserId();

    await prisma.project.create({
      data: {
        title,
        slug,
        description,
        color,
        userId,
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

  const userId = await requireUserId();

  await prisma.project.updateMany({
    where: { id, userId },
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

// Soft-delete: o projeto vai para a Lixeira (deletedAt) e some das listagens.
// As tarefas NÃO são apagadas (relação SetNull) — continuam existindo e reaparecem
// no board ao restaurar. Restaurar/excluir em definitivo: ver app/(dashboard)/trash.
export async function deleteProject(projectId: string) {
  const userId = await requireUserId();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
    select: { title: true },
  });

  if (!project) return;

  await prisma.project.updateMany({
    where: { id: projectId, userId },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    action: "DELETE",
    module: "projects",
    entityType: "project",
    entityId: projectId,
    summary: `Moveu o projeto "${project.title}" para a lixeira`,
  });

  revalidatePath("/projects");
}

// Restaura um projeto da lixeira (usado pelo "Desfazer" após mover para a lixeira).
export async function restoreProject(projectId: string) {
  const userId = await requireUserId();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId, deletedAt: { not: null } },
    select: { title: true },
  });

  if (!project) return;

  await prisma.project.updateMany({
    where: { id: projectId, userId },
    data: { deletedAt: null },
  });

  await logActivity({
    action: "RESTORE",
    module: "projects",
    entityType: "project",
    entityId: projectId,
    summary: `Restaurou o projeto "${project.title}" da lixeira`,
  });

  revalidatePath("/projects");
}

export async function updateProjectNotes(projectId: string, notes: string) {
  try {
    const userId = await requireUserId();
    await prisma.project.updateMany({
      where: { id: projectId, userId },
      data: { description: notes } // Aqui você pode usar 'description' ou um campo 'notes' se tiver criado
    });

    // Revalida a página para atualizar o cache
    revalidatePath("/projects/[slug]", "page");
    return { success: true };
  } catch (error) {
    return { error: "Falha técnica ao salvar os registros." };
  }
}
