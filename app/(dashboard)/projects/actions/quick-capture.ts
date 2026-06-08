"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// =========================================================
// CAPTURA RÁPIDA + REGRA DOS 2 MINUTOS (#1, Fase 0)
// =========================================================
// "Caixa de entrada": jogar tarefas/ideias sem fricção. Reaproveita o modelo Task
// (tarefa sem projeto = inbox). O flag `twoMin` marca a Regra dos 2 minutos.

export interface InboxTask {
  id: string;
  title: string;
  twoMin: boolean;
  createdAt: string;
}

export async function quickCaptureTask(title: string, twoMin = false): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const t = (title || "").trim();
    if (!t) return { success: false, message: "Escreva algo pra capturar." };
    await prisma.task.create({
      data: { userId, title: t.slice(0, 200), twoMin, status: "TODO", priority: "LOW" },
    });
    revalidatePath("/projects");
    return { success: true, message: "Capturado." };
  } catch (error) {
    console.error("Erro na captura rápida:", error);
    return { success: false, message: "Falha ao capturar." };
  }
}

/** Caixa de entrada: tarefas sem projeto, não concluídas (2 min primeiro). */
export async function getInboxTasks(): Promise<InboxTask[]> {
  try {
    const userId = await requireUserId();
    const rows = await prisma.task.findMany({
      where: { userId, isDone: false, deletedAt: null, projectId: null },
      orderBy: [{ twoMin: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: { id: true, title: true, twoMin: true, createdAt: true },
    });
    return rows.map((r) => ({ id: r.id, title: r.title, twoMin: r.twoMin, createdAt: r.createdAt.toISOString() }));
  } catch (error) {
    console.error("Erro ao carregar a caixa de entrada:", error);
    return [];
  }
}

export async function completeInboxTask(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    await prisma.task.updateMany({ where: { id, userId }, data: { isDone: true, status: "DONE", progress: 100 } });
    revalidatePath("/projects");
    return { success: true, message: "Feito! 💪" };
  } catch (error) {
    console.error("Erro ao concluir tarefa da caixa:", error);
    return { success: false, message: "Falha." };
  }
}

export async function deleteInboxTask(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    await prisma.task.updateMany({ where: { id, userId }, data: { deletedAt: new Date() } });
    revalidatePath("/projects");
    return { success: true, message: "Removido." };
  } catch (error) {
    console.error("Erro ao remover tarefa da caixa:", error);
    return { success: false, message: "Falha." };
  }
}
