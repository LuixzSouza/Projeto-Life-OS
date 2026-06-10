"use server";

// Server Actions do chat da IA. O núcleo (resolução de conversa, loop
// agêntico, persistência, telemetria) vive em ./core.ts — compartilhado com o
// route handler de streaming SSE (app/api/ai/chat/route.ts). Estas actions
// são o caminho SEM streaming (e o fallback automático quando o SSE falha).

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { normalizeProvider, stripPending, extractImages, encodeImages } from "@/lib/ai-help";
import { sendMessageCore, generateAssistantReply } from "./core";
import { ChatAttachment } from "./types";
import type { SendMessageResult } from "@/types/ai";

/* ============================================================================
   SEND MESSAGE (ROTEAMENTO PRINCIPAL DO CHAT — caminho sem streaming)
   ============================================================================ */
export async function sendMessage(chatId: string | undefined, userMessage: string, attachments?: ChatAttachment[]): Promise<SendMessageResult> {
  const userId = await requireUserId();
  return sendMessageCore(userId, chatId, userMessage, attachments);
}

/* ============================================================================
   REGENERAR RESPOSTA (substitui a última resposta da IA no mesmo turno)
   ----------------------------------------------------------------------------
   Não duplica a mensagem do usuário: reaproveita a última já salva, apaga a(s)
   resposta(s) dadas a ela e gera uma nova com a MESMA IA da resposta original
   (mantém a regra "1 conversa = 1 IA").
   ============================================================================ */
export async function regenerateResponse(chatId: string): Promise<SendMessageResult> {
  const userId = await requireUserId();
  if (!chatId) return { success: false as const, error: "Conversa inválida." };

  const chat = await prisma.aiChat.findFirst({ where: { id: chatId, userId }, select: { id: true } });
  if (!chat) return { success: false as const, error: "Conversa não encontrada." };

  const lastUser = await prisma.aiMessage.findFirst({
    where: { chatId, userId, role: "user" },
    orderBy: { createdAt: "desc" },
  });
  if (!lastUser) return { success: false as const, error: "Não há mensagem sua para regenerar." };

  // A resposta substituída define a IA usada; sem resposta anterior, usa a atual.
  const lastAssistant = await prisma.aiMessage.findFirst({
    where: { chatId, userId, role: "assistant", createdAt: { gte: lastUser.createdAt } },
    orderBy: { createdAt: "desc" },
    select: { provider: true, model: true },
  });

  const settings = await prisma.settings.findUnique({ where: { userId } });
  const provider = normalizeProvider(lastAssistant?.provider || settings?.aiProvider);
  const model = lastAssistant?.model || settings?.aiModel || "";

  // Remove a(s) resposta(s) antiga(s) deste turno — serão substituídas.
  await prisma.aiMessage.deleteMany({
    where: { chatId, userId, role: "assistant", createdAt: { gte: lastUser.createdAt } },
  });

  return generateAssistantReply({
    userId,
    chatId,
    settings,
    provider,
    model,
    userMessage: stripPending(lastUser.content),
    // Reaproveita as imagens originalmente anexadas àquela mensagem.
    attachments: extractImages(lastUser.content).map((dataUrl) => ({ kind: "image" as const, dataUrl })),
  });
}

/* ============================================================================
   EDITAR & REENVIAR (corrige a última mensagem do usuário e regenera)
   ----------------------------------------------------------------------------
   Atualiza o texto da última mensagem do usuário no lugar (sem duplicar),
   apaga a(s) resposta(s) dadas a ela e gera uma nova com a IA da conversa.
   ============================================================================ */
export async function editLastMessage(chatId: string, newText: string): Promise<SendMessageResult> {
  const userId = await requireUserId();
  const text = newText.trim();
  if (!chatId || !text) return { success: false, error: "Mensagem vazia." };

  const chat = await prisma.aiChat.findFirst({ where: { id: chatId, userId }, select: { id: true } });
  if (!chat) return { success: false, error: "Conversa não encontrada." };

  const lastUser = await prisma.aiMessage.findFirst({
    where: { chatId, userId, role: "user" },
    orderBy: { createdAt: "desc" },
  });
  if (!lastUser) return { success: false, error: "Nenhuma mensagem sua para editar." };

  // IA da conversa (mesma regra do regenerate: quem respondeu por último manda).
  const lastAssistant = await prisma.aiMessage.findFirst({
    where: { chatId, userId, role: "assistant" },
    orderBy: { createdAt: "desc" },
    select: { provider: true, model: true },
  });

  const settings = await prisma.settings.findUnique({ where: { userId } });
  const provider = normalizeProvider(lastAssistant?.provider || settings?.aiProvider);
  const model = lastAssistant?.model || settings?.aiModel || "";

  // Preserva as imagens anexadas à mensagem original (só o texto foi editado).
  const keptImages = extractImages(lastUser.content);
  await prisma.aiMessage.updateMany({ where: { id: lastUser.id, userId }, data: { content: text + encodeImages(keptImages) } });
  await prisma.aiMessage.deleteMany({
    where: { chatId, userId, role: "assistant", createdAt: { gte: lastUser.createdAt } },
  });

  return generateAssistantReply({
    userId, chatId, settings, provider, model, userMessage: text,
    attachments: keptImages.map((dataUrl) => ({ kind: "image" as const, dataUrl })),
  });
}

/* ============================================================================
   RENOMEAR CONVERSA
   ============================================================================ */
export async function renameChat(chatId: string, title: string) {
  const userId = await requireUserId();
  const clean = title.trim().slice(0, 60);
  if (!chatId || !clean) return { success: false as const };

  await prisma.aiChat.updateMany({ where: { id: chatId, userId }, data: { title: clean } });
  revalidatePath("/ai");
  return { success: true as const };
}

/* ============================================================================
   EXPORTAR CONVERSA EM MARKDOWN
   ============================================================================ */
export async function exportChatMarkdown(chatId: string) {
  const userId = await requireUserId();
  const chat = await prisma.aiChat.findFirst({
    where: { id: chatId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!chat) return { success: false as const, error: "Conversa não encontrada." };

  const title = (chat.title || "Conversa").replace(/\.\.\.$/, "");
  const lines: string[] = [`# ${title}`, ""];
  for (const m of chat.messages) {
    const when = m.createdAt.toLocaleString("pt-BR");
    const who = m.role === "user"
      ? "🧑 Você"
      : `🤖 IA (${m.provider ?? "?"}${m.model ? ` · ${m.model}` : ""})`;
    lines.push(`### ${who} — ${when}`, "", stripPending(m.content), "");
  }
  return { success: true as const, title, markdown: lines.join("\n") };
}

export async function clearChat(chatId: string) {
    if (!chatId) return { success: false };

    try {
        const userId = await requireUserId();
        await prisma.aiChat.deleteMany({ where: { id: chatId, userId } });
        return { success: true };
    } catch (error) {
        console.error("[CÉREBRO DIGITAL]: Erro ao purgar memória", error);
        return { success: false };
    }
}
