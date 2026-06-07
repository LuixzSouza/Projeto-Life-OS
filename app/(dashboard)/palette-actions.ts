"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export interface PaletteTask {
  id: string;
  title: string;
  projectSlug: string;
}

/** Tarefas pendentes para a command palette (abre o board do projeto). */
export async function getPaletteTasks(): Promise<PaletteTask[]> {
  const userId = await requireUserId();
  const tasks = await prisma.task.findMany({
    where: { userId, deletedAt: null, isDone: false },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, title: true, project: { select: { slug: true } } },
  });
  return tasks.map((t) => ({ id: t.id, title: t.title, projectSlug: t.project?.slug ?? "inbox" }));
}
