"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// =========================================================
// DIGITAL ROT / LIMPEZA FANTASMA (#21, Fase 4)
// =========================================================
// Tarefas e notas não tocadas há muito tempo "apodrecem": o card da Home as
// lista desbotando com a idade e oferece duas saídas — reviver (toca o
// updatedAt) ou arquivar (soft-delete → Lixeira, reversível). Nada é apagado
// em silêncio: o usuário sempre confirma com um clique.

/** Tarefa aberta sem toque há este nº de dias = apodrecendo. */
const TASK_ROT_DAYS = 45;
/** Nota sem toque há este nº de dias = apodrecendo (notas têm vida mais longa). */
const NOTE_ROT_DAYS = 90;
/** Limite por tipo — o card é uma faxina, não um inventário. */
const MAX_PER_KIND = 12;

export type RotKind = "task" | "note";

export interface RottenItem {
  id: string;
  kind: RotKind;
  title: string;
  /** Dias desde o último toque. */
  ageDays: number;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function ageInDays(updatedAt: Date): number {
  return Math.floor((Date.now() - updatedAt.getTime()) / 864e5);
}

/** Itens apodrecendo: mais velho primeiro. Pinada/favorita nunca apodrece. */
export async function getRottenItems(): Promise<RottenItem[]> {
  try {
    const userId = await requireUserId();
    const [tasks, notes] = await Promise.all([
      prisma.task.findMany({
        where: {
          userId, isDone: false, deletedAt: null, isPinned: false, isStarred: false,
          updatedAt: { lt: daysAgo(TASK_ROT_DAYS) },
        },
        orderBy: { updatedAt: "asc" },
        take: MAX_PER_KIND,
        select: { id: true, title: true, updatedAt: true },
      }),
      prisma.studyNote.findMany({
        where: {
          userId, deletedAt: null, isFavorite: false,
          updatedAt: { lt: daysAgo(NOTE_ROT_DAYS) },
        },
        orderBy: { updatedAt: "asc" },
        take: MAX_PER_KIND,
        select: { id: true, title: true, updatedAt: true },
      }),
    ]);

    return [
      ...tasks.map((t): RottenItem => ({ id: t.id, kind: "task", title: t.title, ageDays: ageInDays(t.updatedAt) })),
      ...notes.map((n): RottenItem => ({ id: n.id, kind: "note", title: n.title, ageDays: ageInDays(n.updatedAt) })),
    ].sort((a, b) => b.ageDays - a.ageDays);
  } catch (error) {
    console.error("Erro ao buscar itens apodrecendo:", error);
    return [];
  }
}

/** "Ainda importa": toca o updatedAt e o item volta a contar como vivo. */
export async function reviveRottenItem(kind: RotKind, id: string): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const touch = { updatedAt: new Date() };
    if (kind === "task") await prisma.task.updateMany({ where: { id, userId }, data: touch });
    else await prisma.studyNote.updateMany({ where: { id, userId }, data: touch });
    return { success: true, message: "Revivido — o relógio zerou." };
  } catch (error) {
    console.error("Erro ao reviver item:", error);
    return { success: false, message: "Falha ao reviver." };
  }
}

/** Arquiva (soft-delete → Lixeira). Reversível em /trash. */
export async function archiveRottenItem(kind: RotKind, id: string): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const bury = { deletedAt: new Date() };
    if (kind === "task") await prisma.task.updateMany({ where: { id, userId }, data: bury });
    else await prisma.studyNote.updateMany({ where: { id, userId }, data: bury });
    revalidatePath("/projects");
    revalidatePath("/studies");
    return { success: true, message: "Arquivado na Lixeira." };
  } catch (error) {
    console.error("Erro ao arquivar item:", error);
    return { success: false, message: "Falha ao arquivar." };
  }
}

/** Limpeza Fantasma: arquiva TODOS os itens apodrecendo de uma vez (reversível). */
export async function archiveAllRotten(): Promise<{ success: boolean; message: string; archived: number }> {
  try {
    const userId = await requireUserId();
    const bury = { deletedAt: new Date() };
    const [tasks, notes] = await Promise.all([
      prisma.task.updateMany({
        where: {
          userId, isDone: false, deletedAt: null, isPinned: false, isStarred: false,
          updatedAt: { lt: daysAgo(TASK_ROT_DAYS) },
        },
        data: bury,
      }),
      prisma.studyNote.updateMany({
        where: { userId, deletedAt: null, isFavorite: false, updatedAt: { lt: daysAgo(NOTE_ROT_DAYS) } },
        data: bury,
      }),
    ]);
    const archived = tasks.count + notes.count;
    revalidatePath("/projects");
    revalidatePath("/studies");
    return { success: true, message: `${archived} item(ns) arquivado(s) na Lixeira.`, archived };
  } catch (error) {
    console.error("Erro na limpeza fantasma:", error);
    return { success: false, message: "Falha na limpeza.", archived: 0 };
  }
}
