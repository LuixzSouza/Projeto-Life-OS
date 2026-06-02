"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { decryptKey } from "@/lib/settings-crypto";
import { callAIProvider } from "@/app/(dashboard)/ai/actions/providers";
import type { AIKeys } from "@/app/(dashboard)/ai/actions/types";

// Resolve o projeto garantindo que pertence ao usuário (senão fica sem projeto = Inbox).
async function resolveProjectId(projectId: string | null | undefined, userId: string): Promise<string | null> {
  if (!projectId || projectId === "inbox") return null;
  const owned = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
  return owned ? projectId : null;
}

export async function createMeeting(input: { title: string; rawNotes?: string; projectId?: string | null }) {
  try {
    const title = input.title?.trim();
    if (!title) return { success: false, message: "Dê um título à reunião." };

    const userId = await requireUserId();
    const projectId = await resolveProjectId(input.projectId, userId);

    const meeting = await prisma.meeting.create({
      data: { title, rawNotes: input.rawNotes?.trim() || "", projectId, userId },
    });

    revalidatePath("/projects");
    return { success: true, message: "Reunião criada!", meetingId: meeting.id };
  } catch (error) {
    console.error("Erro ao criar reunião:", error);
    return { success: false, message: "Falha ao criar reunião." };
  }
}

export async function updateMeeting(input: { id: string; title?: string; rawNotes?: string; image?: string | null }) {
  try {
    if (!input.id) return { success: false, message: "ID inválido." };
    const userId = await requireUserId();

    await prisma.meeting.updateMany({
      where: { id: input.id, userId },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.rawNotes !== undefined ? { rawNotes: input.rawNotes } : {}),
        ...(input.image !== undefined ? { image: input.image || null } : {}),
      },
    });

    revalidatePath("/projects");
    return { success: true, message: "Reunião salva." };
  } catch (error) {
    console.error("Erro ao atualizar reunião:", error);
    return { success: false, message: "Falha ao salvar reunião." };
  }
}

export async function deleteMeeting(id: string) {
  try {
    const userId = await requireUserId();
    await prisma.meeting.deleteMany({ where: { id, userId } });
    revalidatePath("/projects");
    return { success: true, message: "Reunião removida." };
  } catch (error) {
    console.error("Erro ao deletar reunião:", error);
    return { success: false, message: "Falha ao remover reunião." };
  }
}

// Anexa um trecho transcrito às notas (usado quando a gravação roda com o modal fechado).
export async function appendMeetingTranscript(meetingId: string, text: string) {
  try {
    if (!text?.trim()) return { success: false };
    const userId = await requireUserId();
    const m = await prisma.meeting.findFirst({ where: { id: meetingId, userId }, select: { rawNotes: true } });
    if (!m) return { success: false };
    const updated = (m.rawNotes ? m.rawNotes + "\n" : "") + text.trim();
    await prisma.meeting.updateMany({ where: { id: meetingId, userId }, data: { rawNotes: updated } });
    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    console.error("Erro ao anexar transcrição:", error);
    return { success: false };
  }
}

// Lê as notas mais recentes (para o editor abrir já sincronizado com o servidor).
export async function getMeetingNotes(id: string) {
  try {
    const userId = await requireUserId();
    const m = await prisma.meeting.findFirst({
      where: { id, userId },
      select: { rawNotes: true, summary: true, image: true },
    });
    if (!m) return { success: false as const };
    return { success: true as const, rawNotes: m.rawNotes, summary: m.summary, image: m.image };
  } catch (error) {
    console.error("Erro ao carregar reunião:", error);
    return { success: false as const };
  }
}

// Resume as notas da reunião usando a IA configurada pelo usuário.
export async function summarizeMeeting(id: string) {
  try {
    const userId = await requireUserId();
    const meeting = await prisma.meeting.findFirst({ where: { id, userId } });
    if (!meeting) return { success: false, message: "Reunião não encontrada." };
    if (!meeting.rawNotes.trim()) return { success: false, message: "Escreva as notas antes de resumir." };

    const settings = await prisma.settings.findUnique({ where: { userId } });
    const provider = settings?.aiProvider || "openai";
    const s = settings as unknown as Record<string, string | null | undefined>;
    const keys: AIKeys = {
      openai: decryptKey(s?.openaiKey),
      groq: decryptKey(s?.groqKey),
      google: decryptKey(s?.googleKey),
      deepseek: decryptKey(s?.deepseekKey),
      mistral: decryptKey(s?.mistralKey),
    };

    const systemPrompt = `Você é um assistente que organiza notas de reunião do Life OS.
Receba as anotações cruas e produza, em português:
1. Um resumo curto (2-4 linhas) do que foi tratado.
2. Uma seção "Itens de ação:" listando as próximas tarefas, UMA POR LINHA começando com "- " (verbo no infinitivo, objetivas e curtas).
Não invente informações que não estejam nas notas. Não use ferramentas.`;

    const { text: summary } = await callAIProvider(
      provider,
      settings?.aiModel || "",
      systemPrompt,
      `Notas da reunião "${meeting.title}":\n\n${meeting.rawNotes}`,
      [],
      keys,
    );

    await prisma.meeting.updateMany({ where: { id, userId }, data: { summary } });

    revalidatePath("/projects");
    return { success: true, message: "Resumo gerado!", summary };
  } catch (error) {
    console.error("Erro ao resumir reunião:", error);
    const message = error instanceof Error ? error.message : "Falha ao resumir.";
    return { success: false, message };
  }
}

// Converte os "Itens de ação" do resumo em tarefas no projeto da reunião (ou Inbox).
export async function createTasksFromMeeting(id: string) {
  try {
    const userId = await requireUserId();
    const meeting = await prisma.meeting.findFirst({ where: { id, userId } });
    if (!meeting) return { success: false, message: "Reunião não encontrada." };
    if (!meeting.summary) return { success: false, message: "Gere o resumo primeiro." };

    // Extrai linhas que parecem itens de ação (bullets ou numeradas).
    const items = meeting.summary
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^([-*•]|\d+[.)])\s+/.test(l))
      .map((l) => l.replace(/^([-*•]|\d+[.)])\s+/, "").replace(/\*\*/g, "").trim())
      .filter((l) => l.length > 1)
      .slice(0, 30);

    if (items.length === 0) return { success: false, message: "Nenhum item de ação encontrado no resumo." };

    await prisma.task.createMany({
      data: items.map((title) => ({
        title,
        projectId: meeting.projectId,
        userId,
        priority: "MEDIUM",
        status: "TODO",
        progress: 0,
        isPinned: false,
        isStarred: false,
      })),
    });

    revalidatePath("/projects");
    return { success: true, message: `${items.length} tarefa(s) criada(s) a partir da reunião!`, count: items.length };
  } catch (error) {
    console.error("Erro ao gerar tarefas da reunião:", error);
    return { success: false, message: "Falha ao gerar tarefas." };
  }
}
