"use server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/ai-context";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { decryptKey } from "@/lib/settings-crypto";
import { getAiStatus, providerMeta, setupMessage, extractPending, stripPending, encodePending, encodeActions } from "@/lib/ai-help";
import { isEphemeralServerless } from "@/lib/db-config";
import { callAIProvider } from "./providers";
import { AIKeys, ChatHistoryItem } from "./types";

/* ============================================================================
   SEND MESSAGE (ROTEAMENTO PRINCIPAL DO CHAT)
   ============================================================================ */
export async function sendMessage(chatId: string | undefined, userMessage: string) {
  const userId = await requireUserId();
  let currentChatId = chatId;

  if (!currentChatId) {
    const newChat = await prisma.aiChat.create({ data: { title: userMessage.substring(0, 30) + "...", userId } });
    currentChatId = newChat.id;
  } else {
    // Garante que o chat informado pertence ao usuário
    const ownedChat = await prisma.aiChat.findFirst({ where: { id: currentChatId, userId }, select: { id: true } });
    if (!ownedChat) return { success: false, error: "Conversa não encontrada." };
  }

  await prisma.aiMessage.create({ data: { chatId: currentChatId, role: "user", content: userMessage, userId } });

  try {
    const [systemContext, settings, chatHistory, lastAssistant] = await Promise.all([
        getUserContext(),
        prisma.settings.findUnique({ where: { userId } }),
        prisma.aiMessage.findMany({ where: { chatId: currentChatId, userId }, orderBy: { createdAt: 'desc' }, take: 10, skip: 1 }),
        prisma.aiMessage.findFirst({ where: { chatId: currentChatId, userId, role: "assistant" }, orderBy: { createdAt: "desc" }, select: { content: true } })
    ]);

    // Histórico sem marcadores internos (limpo para o modelo).
    const history: ChatHistoryItem[] = chatHistory.reverse().map(msg => ({ role: msg.role, content: stripPending(msg.content) }));
    // Default alinhado ao schema (@default("ollama")) e à page.tsx, evitando divergência
    // entre o painel exibido e o provedor realmente usado.
    const provider = settings?.aiProvider || "ollama";

    const s = settings as unknown as Record<string, string | null | undefined>;
    // Chaves estão cifradas at-rest; decifra antes de chamar o provedor.
    const keys: AIKeys = {
        openai: decryptKey(s?.openaiKey),
        groq: decryptKey(s?.groqKey),
        google: decryptKey(s?.googleKey),
        deepseek: decryptKey(s?.deepseekKey),
        mistral: decryptKey(s?.mistralKey)
    };

    // --- Verificação centralizada de conexão: feedback claro se faltar configurar ---
    const meta = providerMeta(provider);
    const keyValue = meta.local ? "ok" : keys[meta.id as keyof AIKeys];
    const envFallback = meta.local ? true : !!process.env[`${provider.toUpperCase()}_API_KEY`];
    const hasKey = meta.local ? true : (!!keyValue || envFallback);
    const status = getAiStatus(provider, hasKey, isEphemeralServerless());
    if (!status.configured) {
        return { success: false, error: setupMessage(status) };
    }

    // --- Ação pendente: reconstrói o contexto de uma exclusão aguardando "sim" ---
    const pendingPrev = lastAssistant ? extractPending(lastAssistant.content) : null;
    const pendingBlock = pendingPrev
        ? `\n[AÇÃO PENDENTE DE CONFIRMAÇÃO]\nExiste uma exclusão aguardando confirmação: apagar [${pendingPrev.module}] "${pendingPrev.label}" (id ${pendingPrev.id}). Se o usuário CONFIRMAR agora, chame mutate_system_data com action=DELETE, module=${pendingPrev.module}, id=${pendingPrev.id} e confirm=true. Se ele recusar ou mudar de assunto, ignore esta pendência.\n`
        : "";

    const customPersona: string = settings?.aiPersona && settings.aiPersona.trim() !== ""
        ? settings.aiPersona
        : "Você é o núcleo de inteligência (Cérebro Digital) do sistema Life OS. Responda de forma cirúrgica e prestativa.";

    const fullSystemPrompt: string = `
[IDENTIDADE E PERSONALIDADE]
${customPersona}

[SNAPSHOT DO LIFE OS — visão rápida, NÃO é tudo]
${systemContext}

[DIRETRIZES ESTRITAS DE SISTEMA - NÃO IGNORE]
1. DADOS SOB DEMANDA: o snapshot acima é só um resumo. Para qualquer detalhe, use 'query_system_data'. Prefira mode='summary' para "quanto/quantos/resumo" (é barato) e search+limit para achar um registro específico — NUNCA peça listas enormes.
2. EXECUÇÃO: para criar, editar ou apagar algo use 'mutate_system_data'. UPDATE/DELETE exigem o 'id' — busque o registro com query antes.
3. EXCLUSÃO SEGURA: para apagar, chame DELETE sem confirm primeiro, mostre ao usuário o que será apagado e PEÇA CONFIRMAÇÃO. Só apague de fato com confirm=true depois do "sim".
4. AÇÃO ENCADEADA: você pode usar ferramentas em vários passos (ler → agir → confirmar) antes de responder. Aja, não só descreva.
5. CONCISÃO E TOM: responda curto e útil, usando ${settings?.currency || "R$"} para valores, mantendo a [IDENTIDADE E PERSONALIDADE].
6. ARGUMENTOS LIMPOS NAS FERRAMENTAS: mantenha cada campo curto e em uma única linha; NUNCA cole textos enormes ou com muitas quebras de linha no campo 'description' (resuma). Para listas/checklists, salve um resumo enxuto — isso evita falhas de formatação na chamada da ferramenta.
${pendingBlock}    `;

    const aiResponse = await callAIProvider(provider, settings?.aiModel || "", fullSystemPrompt, userMessage, history, keys);
    const cleanText = aiResponse.text;
    // Persiste marcadores invisíveis: ações concluídas (cards) + ação pendente
    // (confirmação de DELETE no próximo turno). Ambos são removidos na exibição.
    const storedContent =
      cleanText +
      encodeActions(aiResponse.actions) +
      (aiResponse.pending ? encodePending(aiResponse.pending) : "");

    const aiMsg = await prisma.aiMessage.create({
      data: { chatId: currentChatId, role: "assistant", content: storedContent, provider, model: settings?.aiModel, userId }
    });

    // Telemetria de uso (estimativa simples chars/4) — alimenta o HUD da página /ai.
    try {
      const usedTokens = Math.ceil((fullSystemPrompt.length + userMessage.length + cleanText.length) / 4);
      let usage: Record<string, number | string> = {};
      try { usage = settings?.aiUsage ? JSON.parse(settings.aiUsage) : {}; } catch { usage = {}; }
      usage[provider] = (Number(usage[provider]) || 0) + usedTokens;
      if (!usage.lastReset) usage.lastReset = new Date().toISOString();
      await prisma.settings.updateMany({ where: { userId }, data: { aiUsage: JSON.stringify(usage) } });
    } catch { /* telemetria é best-effort; nunca quebra o chat */ }

    revalidatePath("/ai");
    // Devolve a mensagem ao client SEM marcadores, com as ações p/ render dos cards.
    return { success: true, chatId: currentChatId, message: { ...aiMsg, content: stripPending(aiMsg.content), actions: aiResponse.actions } };

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Falha nos sistemas centrais.";
    return { success: false, error: errMessage };
  }
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
