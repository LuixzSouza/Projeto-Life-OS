"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { getString, generateUniqueSlug } from "./helpers";
import { asParaType, type ParaType } from "@/lib/para";

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
        paraType: asParaType(getString(formData, "paraType")),
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

// Status que o usuário pode definir direto do card (sem abrir o projeto).
const QUICK_STATUSES = ["ACTIVE", "PAUSED", "COMPLETED"] as const;
export type ProjectQuickStatus = (typeof QUICK_STATUSES)[number];

/** Troca o status do projeto direto da listagem (concluir, pausar, reativar). */
export async function setProjectStatus(projectId: string, status: ProjectQuickStatus) {
  if (!QUICK_STATUSES.includes(status)) return;
  const userId = await requireUserId();
  await prisma.project.updateMany({
    where: { id: projectId, userId },
    data: { status },
  });
  revalidatePath("/projects");
}

// Duplica o projeto como "template": copia descrição, cor, PARA e as tarefas
// não excluídas — todas reiniciadas como pendentes (isDone/status/progress
// voltam ao default) e sem prazo, já que a cópia começa um ciclo novo.
export async function duplicateProject(
  projectId: string
): Promise<{ slug?: string; error?: string }> {
  try {
    const userId = await requireUserId();
    const source = await prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
      include: {
        tasks: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
          select: { title: true, description: true, priority: true, estimatedTime: true, order: true },
        },
      },
    });
    if (!source) return { error: "Projeto não encontrado." };

    const title = `${source.title} (cópia)`;
    const slug = await generateUniqueSlug(title);

    const created = await prisma.project.create({
      data: {
        title,
        slug,
        description: source.description,
        color: source.color,
        paraType: asParaType(source.paraType),
        userId,
        tasks: { create: source.tasks.map((t) => ({ ...t, userId })) },
      },
      select: { id: true, slug: true },
    });

    await logActivity({
      action: "CREATE",
      module: "projects",
      entityType: "project",
      entityId: created.id,
      summary: `Duplicou o projeto "${source.title}" (${source.tasks.length} tarefa${source.tasks.length === 1 ? "" : "s"})`,
    });

    revalidatePath("/projects");
    return { slug: created.slug };
  } catch (error) {
    console.error(error);
    return { error: "Erro interno ao duplicar o projeto." };
  }
}

// Gera um Markdown completo do projeto (tarefas pendentes e concluídas) para
// download — backup legível, compartilhamento ou colar em outra ferramenta.
export async function exportProjectMarkdown(
  projectId: string
): Promise<{ filename?: string; content?: string; error?: string }> {
  try {
    const userId = await requireUserId();
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
      include: {
        tasks: {
          where: { deletedAt: null },
          orderBy: [{ isDone: "asc" }, { order: "asc" }],
          select: { title: true, description: true, isDone: true, priority: true, dueDate: true },
        },
      },
    });
    if (!project) return { error: "Projeto não encontrado." };

    const pending = project.tasks.filter((t) => !t.isDone);
    const done = project.tasks.filter((t) => t.isDone);
    const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const priorityTag = (p: string) => (p === "HIGH" ? " 🔴 alta" : p === "MEDIUM" ? " 🟡 média" : "");
    const taskLine = (t: (typeof project.tasks)[number]) => {
      const due = t.dueDate ? ` — vence ${fmtDate(t.dueDate)}` : "";
      const desc = t.description ? `\n  > ${t.description.replace(/\r?\n/g, " ")}` : "";
      return `- [${t.isDone ? "x" : " "}] ${t.title}${priorityTag(t.priority)}${due}${desc}`;
    };

    const lines: string[] = [
      `# ${project.title}`,
      "",
      ...(project.description ? [`> ${project.description}`, ""] : []),
      `**Progresso:** ${done.length}/${project.tasks.length} tarefas concluídas`,
      `**Exportado em:** ${fmtDate(new Date())} · Life OS`,
      "",
    ];
    if (pending.length > 0) {
      lines.push(`## Pendentes (${pending.length})`, "", ...pending.map(taskLine), "");
    }
    if (done.length > 0) {
      lines.push(`## Concluídas (${done.length})`, "", ...done.map(taskLine), "");
    }
    if (project.tasks.length === 0) {
      lines.push("_Sem tarefas ainda._", "");
    }
    if (project.notes) {
      lines.push("## Notas", "", project.notes, "");
    }

    return { filename: `${project.slug}.md`, content: lines.join("\n") };
  } catch (error) {
    console.error(error);
    return { error: "Erro interno ao exportar o projeto." };
  }
}

/**
 * Define (ou limpa) o PRAZO do projeto. `date` no formato yyyy-MM-dd do
 * <input type="date"> — T12:00:00Z evita o bug do "dia anterior" (CLAUDE.md).
 */
export async function setProjectDueDate(projectId: string, date: string | null) {
  const userId = await requireUserId();
  const dueDate = date ? new Date(`${date}T12:00:00Z`) : null;
  if (dueDate && isNaN(dueDate.getTime())) return { error: "Data inválida." };
  await prisma.project.updateMany({
    where: { id: projectId, userId },
    data: { dueDate },
  });
  revalidatePath("/projects");
  revalidatePath("/agenda");
  return {};
}

/**
 * Salva o projeto como TEMPLATE (status "TEMPLATE"): cópia com as tarefas
 * reiniciadas, fora da listagem padrão — vira a "biblioteca de modelos".
 */
export async function saveProjectAsTemplate(
  projectId: string
): Promise<{ error?: string }> {
  try {
    const userId = await requireUserId();
    const source = await prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
      include: {
        tasks: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
          select: { title: true, description: true, priority: true, estimatedTime: true, order: true },
        },
      },
    });
    if (!source) return { error: "Projeto não encontrado." };

    const title = `${source.title} (modelo)`;
    const slug = await generateUniqueSlug(title);

    await prisma.project.create({
      data: {
        title,
        slug,
        description: source.description,
        color: source.color,
        status: "TEMPLATE",
        paraType: asParaType(source.paraType),
        userId,
        tasks: { create: source.tasks.map((t) => ({ ...t, userId })) },
      },
    });

    revalidatePath("/projects");
    return {};
  } catch (error) {
    console.error(error);
    return { error: "Erro interno ao salvar como template." };
  }
}

/** Cria um projeto NOVO a partir de um template (tarefas zeradas, status ACTIVE). */
export async function instantiateTemplate(
  templateId: string
): Promise<{ slug?: string; error?: string }> {
  try {
    const userId = await requireUserId();
    const source = await prisma.project.findFirst({
      where: { id: templateId, userId, status: "TEMPLATE", deletedAt: null },
      include: {
        tasks: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
          select: { title: true, description: true, priority: true, estimatedTime: true, order: true },
        },
      },
    });
    if (!source) return { error: "Template não encontrado." };

    const baseTitle = source.title.replace(/\s*\(modelo\)\s*$/i, "").trim() || source.title;
    const slug = await generateUniqueSlug(baseTitle);

    const created = await prisma.project.create({
      data: {
        title: baseTitle,
        slug,
        description: source.description,
        color: source.color,
        status: "ACTIVE",
        paraType: asParaType(source.paraType),
        userId,
        tasks: { create: source.tasks.map((t) => ({ ...t, userId })) },
      },
      select: { id: true, slug: true, title: true },
    });

    await logActivity({
      action: "CREATE",
      module: "projects",
      entityType: "project",
      entityId: created.id,
      summary: `Criou "${created.title}" a partir de um template`,
    });

    revalidatePath("/projects");
    return { slug: created.slug };
  } catch (error) {
    console.error(error);
    return { error: "Erro interno ao usar o template." };
  }
}

/** Define (ou limpa) a classificação PARA de um projeto, direto da listagem. */
export async function setProjectPara(projectId: string, paraType: ParaType | null) {
  const userId = await requireUserId();
  await prisma.project.updateMany({
    where: { id: projectId, userId },
    data: { paraType: asParaType(paraType) },
  });
  revalidatePath("/projects");
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
      data: { notes } // documento rico da aba Notas (separado do "description"/Sobre)
    });

    // Revalida a página para atualizar o cache
    revalidatePath("/projects/[slug]", "page");
    return { success: true };
  } catch (error) {
    return { error: "Falha técnica ao salvar os registros." };
  }
}
