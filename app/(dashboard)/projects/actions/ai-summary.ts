"use server";

// Resumo IA do projeto (#roadmap §2): "o que falta, riscos, próxima ação".
// Reusa o one-shot (sem tools) com um snapshot compacto do board — barato e
// suficiente: o contexto inteiro do projeto cabe no prompt.

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { runOneShotAi } from "@/app/(dashboard)/ai/actions/oneshot";

export async function generateProjectAiSummary(
  projectId: string
): Promise<{ text?: string; error?: string }> {
  try {
    const userId = await requireUserId();
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
      include: {
        tasks: {
          where: { deletedAt: null },
          orderBy: [{ isDone: "asc" }, { order: "asc" }],
          select: { title: true, isDone: true, priority: true, dueDate: true, status: true },
        },
      },
    });
    if (!project) return { error: "Projeto não encontrado." };

    const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const today = new Date();
    const lines = project.tasks.map((t) => {
      const flags = [
        t.isDone ? "FEITA" : "PENDENTE",
        t.priority === "HIGH" ? "prioridade alta" : null,
        t.dueDate ? `prazo ${fmt(t.dueDate)}${!t.isDone && t.dueDate < today ? " (VENCIDO)" : ""}` : null,
      ].filter(Boolean).join(", ");
      return `- ${t.title} [${flags}]`;
    });

    const snapshot = [
      `Projeto: ${project.title}`,
      project.description ? `Sobre: ${project.description}` : null,
      project.dueDate ? `Prazo do projeto: ${fmt(project.dueDate)}` : "Sem prazo definido.",
      `Hoje: ${fmt(today)}`,
      "",
      `Tarefas (${project.tasks.length}):`,
      ...lines.slice(0, 80),
      project.notes ? `\nNotas do projeto (trecho):\n${project.notes.slice(0, 1500)}` : null,
    ].filter(Boolean).join("\n");

    const system =
      "Você é o copiloto de projetos do Life OS. Analise o snapshot do projeto e responda em PT-BR, " +
      "em markdown curto com EXATAMENTE estas 3 seções: **O que falta** (2-4 bullets do essencial), " +
      "**Riscos** (1-3 bullets — prazos vencidos/apertados, gargalos, tarefas paradas) e " +
      "**Próxima ação** (UMA ação concreta e específica para destravar o projeto agora). " +
      "Não invente tarefas que não estão no snapshot.";

    const text = await runOneShotAi(userId, system, snapshot);
    if (!text) {
      return { error: "A IA não está configurada — conecte um provedor em Configurações → IA." };
    }
    return { text };
  } catch (error) {
    console.error("Erro no resumo IA do projeto:", error);
    return { error: "Falha ao gerar o resumo." };
  }
}
