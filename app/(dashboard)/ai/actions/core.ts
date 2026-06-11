// Núcleo do chat da IA — compartilhado pela Server Action (fallback robusto)
// e pelo route handler de streaming SSE (app/api/ai/chat/route.ts).
// Módulo SERVER-ONLY comum (sem "use server": precisa aceitar callbacks, o que
// uma action serializável não permite).

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/ai-context";
import { revalidatePath } from "next/cache";
import { decryptKey } from "@/lib/settings-crypto";
import { getAiStatus, providerMeta, normalizeProvider, setupMessage, extractPending, stripPending, encodePending, encodeActions, extractModelSuggestions, encodeSuggestions, extractModelClarify, encodeClarify, extractModelNav, encodeNav, encodeImages } from "@/lib/ai-help";
import { isEphemeralServerless } from "@/lib/db-config";
import { callAIProvider } from "./providers";
import { AIKeys, ChatHistoryItem, ChatAttachment, StreamEmitter } from "./types";
import { getMemoriesForPrompt } from "@/lib/ai-data";
import { isSensitiveMessage, isTrivialMessage, cheapModelFor, isOllamaAlive } from "@/lib/ai-router";
import type { SendMessageResult } from "@/types/ai";

// Limites de anexos (visão): contagem e tamanho do data URL por imagem.
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_CHARS = 1_800_000; // ~1,3 MB de imagem real

/** Sanitiza anexos vindos do client: só imagens data-URL dentro do limite. */
export function sanitizeAttachments(atts: ChatAttachment[] | undefined): ChatAttachment[] {
  if (!atts?.length) return [];
  return atts
    .filter((a) => a.kind === "image"
      && /^data:image\/[a-z0-9+.-]+;base64,[A-Za-z0-9+/=]+$/i.test(a.dataUrl)
      && a.dataUrl.length <= MAX_ATTACHMENT_CHARS)
    .slice(0, MAX_ATTACHMENTS);
}

/** Título da conversa a partir da 1ª mensagem: corta em limite de palavra. */
function makeChatTitle(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 48) return clean;
  const cut = clean.slice(0, 48);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 24 ? cut.slice(0, lastSpace) : cut) + "…";
}

/* ============================================================================
   ENVIO DE MENSAGEM (roteamento principal — usado pela action e pelo SSE)
   ============================================================================ */
export async function sendMessageCore(
  userId: string,
  chatId: string | undefined,
  userMessage: string,
  attachments?: ChatAttachment[],
  emit?: StreamEmitter
): Promise<SendMessageResult> {
  const images = sanitizeAttachments(attachments);

  // Settings ANTES de resolver o chat: o provedor/modelo atuais decidem se a
  // conversa continua ou se uma nova começa. Normaliza ids legados ("gemini").
  const settings = await prisma.settings.findUnique({ where: { userId } });
  const provider = normalizeProvider(settings?.aiProvider);
  const currentModel = settings?.aiModel || "";

  let currentChatId = chatId;
  // Cada conversa pertence a UMA IA: trocar de provedor/modelo no meio abriria
  // um histórico "misturado" (e tool-calls de outra IA). Mudou → nova conversa.
  let switched = false;

  if (currentChatId) {
    // Garante que o chat informado pertence ao usuário
    const ownedChat = await prisma.aiChat.findFirst({ where: { id: currentChatId, userId }, select: { id: true } });
    if (!ownedChat) return { success: false, error: "Conversa não encontrada." };

    const lastAi = await prisma.aiMessage.findFirst({
      where: { chatId: currentChatId, userId, role: "assistant" },
      orderBy: { createdAt: "desc" },
      select: { provider: true, model: true },
    });
    if (lastAi) {
      const sameProvider = !lastAi.provider || normalizeProvider(lastAi.provider) === provider;
      const sameModel = !lastAi.model || !currentModel || lastAi.model === currentModel;
      if (!sameProvider || !sameModel) {
        currentChatId = undefined; // força a criação de uma conversa nova abaixo
        switched = true;
      }
    }
  }

  if (!currentChatId) {
    const newChat = await prisma.aiChat.create({ data: { title: makeChatTitle(userMessage), userId } });
    currentChatId = newChat.id;
  }

  // Imagens ficam na própria mensagem como marcador (a UI renderiza a bolha
  // com a foto; o histórico enviado ao modelo nos próximos turnos é só texto).
  await prisma.aiMessage.create({
    data: { chatId: currentChatId, role: "user", content: userMessage + encodeImages(images.map((i) => i.dataUrl)), userId },
  });

  const result = await generateAssistantReply({
    userId,
    chatId: currentChatId,
    settings,
    provider,
    model: settings?.aiModel || "",
    userMessage,
    attachments: images,
    emit,
  });
  // `switched` avisa o client que uma conversa NOVA foi aberta por troca de IA.
  return result.success ? { ...result, switched } : result;
}

/* ============================================================================
   NÚCLEO DE GERAÇÃO (compartilhado por sendMessage e regenerateResponse)
   ----------------------------------------------------------------------------
   Pré-requisito: a mensagem do usuário JÁ está persistida como a mais recente
   do chat (o histórico interno usa skip:1 para excluí-la).
   ============================================================================ */
export interface GenerateReplyOptions {
  userId: string;
  chatId: string;
  settings: Awaited<ReturnType<typeof prisma.settings.findUnique>>;
  /** Provedor normalizado a usar na chamada e gravar na resposta. */
  provider: string;
  /** Modelo a usar; vazio cai no default do provedor. */
  model: string;
  /** Texto do usuário que origina a resposta (sem marcadores internos). */
  userMessage: string;
  /** Imagens anexadas NESTE turno (visão multimodal). */
  attachments?: ChatAttachment[];
  /** Emissor de eventos SSE (deltas/status) — presente só no streaming. */
  emit?: StreamEmitter;
}

export async function generateAssistantReply({ userId, chatId: currentChatId, settings, provider, model, userMessage, attachments = [], emit }: GenerateReplyOptions): Promise<SendMessageResult> {
  try {
    const [systemContext, chatHistory, lastAssistant, memories] = await Promise.all([
        getUserContext(),
        prisma.aiMessage.findMany({ where: { chatId: currentChatId, userId }, orderBy: { createdAt: 'desc' }, take: 10, skip: 1 }),
        prisma.aiMessage.findFirst({ where: { chatId: currentChatId, userId, role: "assistant" }, orderBy: { createdAt: "desc" }, select: { content: true } }),
        getMemoriesForPrompt(userId),
    ]);

    // Histórico sem marcadores internos (limpo para o modelo).
    const history: ChatHistoryItem[] = chatHistory.reverse().map(msg => ({ role: msg.role, content: stripPending(msg.content) }));

    const s = settings as unknown as Record<string, string | null | undefined>;
    // Chaves estão cifradas at-rest; decifra antes de chamar o provedor.
    const keys: AIKeys = {
        openai: decryptKey(s?.openaiKey),
        groq: decryptKey(s?.groqKey),
        google: decryptKey(s?.googleKey),
        deepseek: decryptKey(s?.deepseekKey),
        mistral: decryptKey(s?.mistralKey),
        anthropic: decryptKey(s?.anthropicKey),
        xai: decryptKey(s?.xaiKey),
        openrouter: decryptKey(s?.openrouterKey)
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

    // Memórias persistentes (curtas) — o "lembre-se disso" entre conversas.
    const memoryBlock = memories.length
        ? `\n[MEMÓRIAS DO USUÁRIO — fatos salvos em conversas anteriores]\n${memories.map((m) => `- ${m.content}`).join("\n")}\n`
        : "";

    const fullSystemPrompt: string = `
[IDENTIDADE E PERSONALIDADE]
${customPersona}

[SNAPSHOT DO LIFE OS — visão rápida, NÃO é tudo]
${systemContext}
${memoryBlock}
[DIRETRIZES ESTRITAS DE SISTEMA - NÃO IGNORE]
1. DADOS SOB DEMANDA: o snapshot acima é só um resumo. Para qualquer detalhe, use 'query_system_data'. Prefira mode='summary' para "quanto/quantos/resumo" (é barato) e search+limit para achar um registro específico — NUNCA peça listas enormes. Para COMPARAR meses, ver TENDÊNCIA ou AGRUPAR dados, use 'analyze_system_data' (1 chamada agregada) em vez de vários query.
2. EXECUÇÃO: para criar, editar ou apagar algo use 'mutate_system_data'. UPDATE/DELETE exigem o 'id' — busque o registro com query antes. Crie SOMENTE o que o usuário pediu NESTE turno — nunca registre dados por iniciativa própria (peso, medição, refeição, gasto...) ao responder uma pergunta, e nunca crie o mesmo registro duas vezes: se a ferramenta já confirmou (ok=true), NÃO repita a chamada.
3. EXCLUSÃO SEGURA: para apagar, chame DELETE sem confirm primeiro, mostre ao usuário o que será apagado e PEÇA CONFIRMAÇÃO. Só apague de fato com confirm=true depois do "sim".
4. AÇÃO ENCADEADA: você pode usar ferramentas em vários passos (ler → agir → confirmar) antes de responder. Aja, não só descreva.
5. CONCISÃO E TOM: responda curto e útil, usando ${settings?.currency || "R$"} para valores, mantendo a [IDENTIDADE E PERSONALIDADE].
6. ARGUMENTOS LIMPOS NAS FERRAMENTAS: mantenha cada campo curto e em uma única linha; NUNCA cole textos enormes ou com muitas quebras de linha no campo 'description' (resuma). Para listas/checklists, salve um resumo enxuto — isso evita falhas de formatação na chamada da ferramenta.
7. SUGESTÕES DE CONTINUAÇÃO: encerre TODA resposta com a linha <!--SUGGEST:["...","..."]--> contendo 2 a 3 continuações CURTAS (máx. 7 palavras cada), escritas na voz do usuário (ex.: "E comparado ao mês passado?", "Registra isso pra mim"). Devem ser o próximo passo natural da conversa, ancoradas no que acabou de ser dito. É um marcador invisível: nunca o mencione nem o formate como código.
8. MEMÓRIA: quando o usuário pedir "lembre que..." (ou revelar preferência durável importante), salve com manage_memory action=SAVE. Quando pedir para esquecer, use LIST para achar o id e DELETE. As memórias atuais já estão no bloco [MEMÓRIAS DO USUÁRIO] acima — não chame LIST só para conferi-las.
9. PEDIDOS COMPOSTOS (planejamento explícito): quando o pedido tiver várias partes ("organize minha semana", "registre X, Y e Z"), comece a resposta com um mini-plano em checklist (- [x] item feito · - [ ] item pendente) e execute as ações na MESMA resposta, marcando cada item conforme conclui. Se algo não couber nos passos disponíveis, deixe o item desmarcado e diga o porquê. RETOMADA: se sobrar item desmarcado (- [ ]), a PRIMEIRA sugestão do SUGGEST deve ser "Continue o plano" — ao recebê-la, releia o último checklist da conversa e execute SÓ os itens ainda abertos, repetindo o checklist atualizado.
10. PERGUNTE ANTES DE CHUTAR: se faltar informação ESSENCIAL para executar o pedido, NÃO invente nem registre pela metade — explique em 1 frase o que falta e encerre a resposta com a linha <!--ASK:[{"question":"pergunta curta?","options":["resposta provável",{"label":"outra","hint":"contexto curto"}]}]--> (a UI vira um painel de respostas de 1 toque). NUNCA se chuta: valor de gasto/receita (jamais crie com 0 e corrija depois), dia/hora de evento, qual registro quando a busca achar vários, empresa de uma vaga, URL de um link. Se uma ferramenta retornar erro dizendo que falta um dado, NÃO repita a chamada com um valor inventado — pergunte com ASK. EXEMPLO: usuário diz "registra um gasto de mercado" → NÃO chame mutate ainda; responda "Quanto ficou o mercado?" e encerre com <!--ASK:[{"question":"Quanto ficou o mercado?","options":["R$ 50","R$ 100","R$ 200","R$ 300"]}]-->. Regras do ASK: 1 a 3 perguntas, cada uma com 2 a 4 opções CURTAS (máx. 5 palavras, na voz do usuário); "hint" é opcional (contexto de até 8 palavras); use "multi":true quando várias opções puderem valer ao mesmo tempo. Se faltarem DOIS dados (ex.: valor E conta), prefira UMA chamada com as duas perguntas a dois turnos. O usuário também pode digitar livremente. Não pergunte o que dá para estimar bem (ex.: kcal de uma refeição descrita) nem detalhes opcionais. Ao usar ASK, não execute a ação ainda, não use SUGGEST nesse turno e nunca mencione o marcador. Quando a resposta chegar (pode vir como "Pergunta: resposta" por linha), execute direto sem perguntar de novo.
11. NAVEGAÇÃO: quando a resposta falar de uma área do app (ou o usuário perguntar "onde vejo/fica X"), ofereça atalhos encerrando com <!--GOTO:[{"label":"Ver meu funil de vagas","href":"/jobs"}]--> — 1 a 3 atalhos, label curto em voz de convite ("Abrir...", "Ver..."). Rotas válidas: /dashboard · /agenda · /finance (lançamentos: /finance/transactions · investimentos: /finance/investments) · /projects (tarefas/projetos) · /jobs (vagas) · /business (CRM) · /social (conexões) · /notes (notas) · /studies (estudos) · /flashcards · /goals (metas) · /health (saúde; /health/nutrition · /health/sleep · /health/body · /health/gym) · /entertainment · /wardrobe (closet) · /links · /access (cofre) · /cms (sites) · /connect (tags) · /timeline · /settings (configurações) · /trash (lixeira). Query/deep-link é permitido (ex.: /settings?tab=intelligence). Use só quando agregar — não em toda resposta. É um marcador invisível: nunca o mencione.
${pendingBlock}    `;

    // --- Roteadores opt-in (#27 privacidade · #28 custo) ---
    // Roteiam só a CHAMADA; a mensagem persiste com o provedor/modelo da
    // conversa para não disparar a regra "trocou de IA → conversa nova".
    let callProvider = provider;
    let callModel = model;
    if (settings?.aiPrivacyRouting && provider !== "ollama" && isSensitiveMessage(userMessage) && !isEphemeralServerless()) {
      if (await isOllamaAlive()) {
        callProvider = "ollama";
        callModel = "";
        emit?.({ type: "status", label: "Assunto sensível — processando localmente..." });
      }
    } else if (settings?.aiCostRouting && isTrivialMessage(userMessage) && attachments.length === 0) {
      callModel = cheapModelFor(provider, model);
    }

    const aiResponse = await callAIProvider(callProvider, callModel, fullSystemPrompt, userMessage, history, keys, attachments, emit);
    // O modelo encerra com <!--SUGGEST:[...]--> (diretriz 7), <!--ASK:{...}-->
    // (diretriz 10) e/ou <!--GOTO:[...]--> (diretriz 11): extrai os chips de
    // continuação, a pergunta de esclarecimento e os atalhos de navegação,
    // limpando o texto antes de persistir/exibir.
    const { text: withoutSuggest, suggestions: rawSuggestions } = extractModelSuggestions(aiResponse.text);
    const { text: withoutClarify, clarify } = extractModelClarify(withoutSuggest);
    const { text: cleanText, nav } = extractModelNav(withoutClarify);
    // Pergunta pendente domina o turno: os chips de continuação dariam dois
    // grupos de botões com papéis diferentes — fica só a pergunta.
    const suggestions = clarify ? [] : rawSuggestions;
    // Persiste marcadores invisíveis: ações concluídas (cards) + sugestões de
    // continuação + pergunta de esclarecimento + atalhos de navegação + ação
    // pendente (confirmação de DELETE no próximo turno). Removidos na exibição.
    const storedContent =
      cleanText +
      encodeActions(aiResponse.actions) +
      encodeSuggestions(suggestions) +
      encodeClarify(clarify) +
      encodeNav(nav) +
      (aiResponse.pending ? encodePending(aiResponse.pending) : "");

    const aiMsg = await prisma.aiMessage.create({
      data: { chatId: currentChatId, role: "assistant", content: storedContent, provider, model: model || null, userId }
    });

    // Telemetria de uso — alimenta o HUD da página /ai. Usa o consumo REAL
    // informado pelo provedor (campo usage somado em todas as rodadas do loop);
    // só cai na estimativa chars/4 se o provedor não devolver usage.
    try {
      const realTokens = aiResponse.usage?.total ?? 0;
      const usedTokens = realTokens > 0
        ? realTokens
        : Math.ceil((fullSystemPrompt.length + userMessage.length + cleanText.length) / 4);
      let usage: Record<string, number | string> = {};
      try { usage = settings?.aiUsage ? JSON.parse(settings.aiUsage) : {}; } catch { usage = {}; }
      usage[provider] = (Number(usage[provider]) || 0) + usedTokens;
      if (!usage.lastReset) usage.lastReset = new Date().toISOString();
      await prisma.settings.updateMany({ where: { userId }, data: { aiUsage: JSON.stringify(usage) } });
    } catch { /* telemetria é best-effort; nunca quebra o chat */ }

    revalidatePath("/ai");
    // Devolve a mensagem ao client SEM marcadores, com as ações p/ render dos
    // cards e as sugestões p/ os chips de continuação.
    return { success: true, chatId: currentChatId, message: { ...aiMsg, role: "assistant", content: stripPending(aiMsg.content), actions: aiResponse.actions, suggestions, clarify: clarify ?? undefined, nav } };

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Falha nos sistemas centrais.";
    return { success: false as const, error: errMessage };
  }
}
