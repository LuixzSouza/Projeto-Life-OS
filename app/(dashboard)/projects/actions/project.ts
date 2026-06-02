"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
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

export async function deleteProject(projectId: string) {
  const userId = await requireUserId();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) return;

  // Deleta tarefas vinculadas primeiro (se não tiver Cascade no banco)
  await prisma.task.deleteMany({
    where: { projectId, userId },
  });

  await prisma.project.deleteMany({
    where: { id: projectId, userId },
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
