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

// ----------------------------------------------------------------------------
// Busca global (Ctrl+K): contatos, treinos, decks e links num lugar só.
// Uma action única = 1 round-trip quando o palette abre.
// ----------------------------------------------------------------------------

export interface PaletteContact {
  id: string;
  name: string;
  nickname: string | null;
  company: string | null;
}

export interface PaletteWorkoutPlan {
  id: string;
  name: string;
  goal: string;
}

export interface PaletteDeck {
  id: string;
  title: string;
}

export interface PaletteLink {
  id: string;
  title: string;
  url: string;
  category: string | null;
}

export interface PaletteGoal {
  id: string;
  title: string;
  subjectTitle: string | null;
}

export interface PaletteExtras {
  contacts: PaletteContact[];
  workoutPlans: PaletteWorkoutPlan[];
  decks: PaletteDeck[];
  links: PaletteLink[];
  goals: PaletteGoal[];
}

export async function getPaletteExtras(): Promise<PaletteExtras> {
  const userId = await requireUserId();

  const [contacts, workoutPlans, decks, links, goalRows] = await Promise.all([
    prisma.friend.findMany({
      where: { userId, deletedAt: null },
      orderBy: { name: "asc" },
      take: 80,
      select: { id: true, name: true, nickname: true, company: true },
    }),
    prisma.workoutPlan.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, name: true, goal: true },
    }),
    prisma.flashcardDeck.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, title: true },
    }),
    prisma.savedLink.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, title: true, url: true, category: true },
    }),
    prisma.learningGoal.findMany({
      where: { userId, deletedAt: null, status: { not: "DONE" } },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, title: true, subject: { select: { title: true } } },
    }),
  ]);

  const goals: PaletteGoal[] = goalRows.map((g) => ({
    id: g.id,
    title: g.title,
    subjectTitle: g.subject?.title ?? null,
  }));

  return { contacts, workoutPlans, decks, links, goals };
}
