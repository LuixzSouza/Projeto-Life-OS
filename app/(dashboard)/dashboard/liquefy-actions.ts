"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { runOneShotAi } from "@/app/(dashboard)/ai/actions/oneshot";

// =========================================================
// LIQUEFAÇÃO DE TAREFAS (#18, Fase 4)
// =========================================================
// Tarefa cujo bloco de tempo venceu 2+ vezes sem conclusão está "congelada":
// grande demais para começar. A Liquefação derrete ela em micro-passos (o
// primeiro sempre cabe na Regra dos 2 Minutos). IA redige os passos quando
// configurada; sem IA, uma decomposição padrão de destravamento faz o papel.

/** Marca no description da tarefa-mãe (evita oferecer liquefação de novo). */
const LIQUEFIED_MARK = "[liquefeita em micro-passos]";
/** Blocos vencidos sem conclusão para considerar a tarefa congelada. */
const MISSED_BLOCKS_THRESHOLD = 2;

export interface StuckTask {
  id: string;
  title: string;
  missedBlocks: number;
  projectTitle: string | null;
}

/** Tarefas congeladas: 2+ blocos agendados já passaram e ela segue aberta. */
export async function getStuckTasks(): Promise<StuckTask[]> {
  try {
    const userId = await requireUserId();
    const pastBlocks = await prisma.event.findMany({
      where: { userId, deletedAt: null, taskId: { not: null }, startTime: { lt: new Date() } },
      select: { taskId: true },
    });

    const missed = new Map<string, number>();
    for (const b of pastBlocks) {
      if (b.taskId) missed.set(b.taskId, (missed.get(b.taskId) ?? 0) + 1);
    }
    const candidateIds = Array.from(missed.entries())
      .filter(([, count]) => count >= MISSED_BLOCKS_THRESHOLD)
      .map(([id]) => id);
    if (candidateIds.length === 0) return [];

    const tasks = await prisma.task.findMany({
      where: { id: { in: candidateIds }, userId, isDone: false, deletedAt: null },
      select: { id: true, title: true, description: true, project: { select: { title: true } } },
    });

    return tasks
      .filter((t) => !(t.description ?? "").includes(LIQUEFIED_MARK))
      .map((t) => ({
        id: t.id,
        title: t.title,
        missedBlocks: missed.get(t.id) ?? 0,
        projectTitle: t.project?.title ?? null,
      }))
      .sort((a, b) => b.missedBlocks - a.missedBlocks)
      .slice(0, 6);
  } catch (error) {
    console.error("Erro ao buscar tarefas congeladas:", error);
    return [];
  }
}

/** Decomposição padrão (sem IA): o objetivo é DESTRAVAR, não planejar perfeito. */
function defaultSteps(title: string): string[] {
  return [
    `Preparar o terreno para "${title}" (abrir arquivos/material, 2 min)`,
    `Fazer SÓ os primeiros 10 minutos de "${title}"`,
    `Escrever qual é o menor próximo passo concreto`,
    `Continuar de onde parou por 25 minutos`,
  ];
}

/** Tenta extrair 2–6 passos de uma resposta da IA (um por linha). */
function parseSteps(text: string): string[] | null {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length >= 5 && l.length <= 140);
  if (lines.length < 2) return null;
  return lines.slice(0, 6);
}

export async function liquefyTask(taskId: string): Promise<{ success: boolean; created: number; message: string }> {
  try {
    const userId = await requireUserId();
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId, isDone: false, deletedAt: null },
      select: { id: true, title: true, description: true, projectId: true, priority: true },
    });
    if (!task) return { success: false, created: 0, message: "Tarefa não encontrada." };

    const system = `Você divide tarefas travadas em micro-passos executáveis. Responda APENAS com os passos, um por linha, sem numeração nem comentários. Regras: 3 a 5 passos; cada um começa com um verbo no infinitivo; o primeiro deve caber em 2 minutos; cada passo cabe em no máximo 25 minutos; português.`;
    const user = `Tarefa travada: "${task.title}"${task.description ? `\nContexto: ${task.description.slice(0, 300)}` : ""}`;
    const aiText = await runOneShotAi(userId, system, user);
    const steps = (aiText && parseSteps(aiText)) || defaultSteps(task.title);

    await prisma.$transaction([
      ...steps.map((step, i) =>
        prisma.task.create({
          data: {
            userId,
            title: `⚗️ ${i + 1}/${steps.length} · ${step}`.slice(0, 200),
            projectId: task.projectId,
            priority: task.priority,
            twoMin: i === 0, // o primeiro passo entra na Regra dos 2 Minutos
            status: "TODO",
          },
        }),
      ),
      prisma.task.updateMany({
        where: { id: task.id, userId },
        data: { description: `${task.description ? `${task.description}\n\n` : ""}${LIQUEFIED_MARK}` },
      }),
    ]);

    revalidatePath("/projects");
    return {
      success: true,
      created: steps.length,
      message: `"${task.title}" derretida em ${steps.length} micro-passos${aiText ? " (pela sua IA)" : ""}. O 1º já está na Caixa de Entrada como ⚡ 2 min.`,
    };
  } catch (error) {
    console.error("Erro ao liquefazer tarefa:", error);
    return { success: false, created: 0, message: "Falha ao liquefazer a tarefa." };
  }
}
