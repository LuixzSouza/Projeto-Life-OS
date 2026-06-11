// Tradutores de API (roteamento entre provedores) e o LOOP DE PENSAMENTO
// agêntico. A IA pode ler -> agir -> confirmar em vários passos numa mesma
// mensagem (até MAX_STEPS). Módulo server-only (não é "use server").
import { tools, executeTool } from "./tools";
import { AIKeys, ChatHistoryItem, ToolArgs, OpenAIMessage, OpenAIContentPart, OpenAIToolCall, GeminiContent, GeminiPart, AIResponse, TokenUsage, ChatAttachment, StreamEmitter } from "./types";
import { moduleInfo, type PendingAction, type AIAction } from "@/lib/ai-help";

// Quantas rodadas de tool-call a IA pode encadear antes de ser forçada a responder.
const MAX_STEPS = 6;

function parseToolArgs(raw: unknown): ToolArgs {
  // Alguns provedores (ex.: Ollama) já devolvem os argumentos como objeto.
  if (raw && typeof raw === "object") return raw as ToolArgs;
  if (typeof raw !== "string" || !raw.trim()) return {};

  // 1) Caminho feliz: JSON puro.
  try {
    return JSON.parse(raw) as ToolArgs;
  } catch {
    // 2) Reparo: remove cercas ```json e extrai o primeiro objeto {...}
    //    (cobre wrappers tipo <function(name){...}> de modelos locais).
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as ToolArgs;
      } catch {
        /* desiste — devolve vazio abaixo */
      }
    }
    return {};
  }
}

// Groq (e modelos Llama) às vezes geram a tool call num formato que a API não
// consegue validar — erro `tool_use_failed`, com a tentativa crua devolvida em
// `error.failed_generation`. É comum quando os argumentos têm texto longo ou
// multilinha (JSON malformado). Detectamos para poder repetir / responder bem.
function isToolUseFailure(data: { error?: { code?: string; message?: string } }): boolean {
  const e = data?.error;
  if (!e) return false;
  return e.code === "tool_use_failed" || (e.message?.includes("failed_generation") ?? false);
}

// Resposta genérica dos provedores (OpenAI-like + Gemini): só os campos que lemos.
interface ProviderResponse {
  error?: { code?: string; message?: string };
  choices?: { message?: OpenAIMessage }[];
  candidates?: { content?: { parts?: GeminiPart[] } }[];
  // Uso real de tokens — formato OpenAI-like e Gemini, respectivamente.
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
}

// Acumulador de uso real: soma o usage de CADA rodada do loop agêntico
// (cada chamada reenvia o contexto, então o custo do turno é a soma de todas).
function addUsage(acc: TokenUsage, data: ProviderResponse): TokenUsage {
  const u = data.usage;
  const g = data.usageMetadata;
  const input = u?.prompt_tokens ?? g?.promptTokenCount ?? 0;
  const output = u?.completion_tokens ?? g?.candidatesTokenCount ?? 0;
  const total = u?.total_tokens ?? g?.totalTokenCount ?? input + output;
  return { input: acc.input + input, output: acc.output + output, total: acc.total + total };
}

const ZERO_USAGE: TokenUsage = { input: 0, output: 0, total: 0 };

// Conteúdo OpenAI-like → texto puro (respostas do assistente são string, mas
// o tipo aceita array multimodal — normalizamos com segurança).
function contentToText(c: OpenAIMessage["content"]): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((p) => (p.type === "text" ? p.text : "")).join("");
  return "";
}

// data:image/webp;base64,XXX → { mimeType, data } (para o inlineData do Gemini).
function splitDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  return m ? { mimeType: m[1], data: m[2] } : null;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// fetch + parse com retry curto para erros TRANSITÓRIOS: rate limit (429) e
// instabilidades de servidor (5xx), além de falha de rede. Erros definitivos
// (401/403 credencial, 400 validação) NÃO são repetidos. Respeita Retry-After.
async function fetchProvider(
  url: string,
  init: RequestInit,
  retries = 2
): Promise<{ ok: boolean; status: number; data: ProviderResponse }> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (networkErr) {
      if (attempt >= retries) throw networkErr;
      await delay(600 * (attempt + 1));
      continue;
    }

    const data = (await res.json().catch(() => ({}))) as ProviderResponse;
    if (res.ok) return { ok: true, status: res.status, data };

    const retriable = res.status === 429 || res.status >= 500;
    if (!retriable || attempt >= retries) return { ok: false, status: res.status, data };

    const retryAfter = Number(res.headers.get("retry-after"));
    await delay(retryAfter > 0 ? retryAfter * 1000 : 600 * (attempt + 1));
  }
}

/* ============================================================================
   STREAMING (SSE) — parsers que transformam o stream do provedor no MESMO
   formato ProviderResponse do caminho não-streamado. Assim o loop agêntico é
   um só: com `emit`, os pedaços do texto chegam ao vivo; sem, nada muda.
   ============================================================================ */

// Rótulo amigável do passo de ferramenta (mostrado no client via evento status).
function toolStatusLabel(name: string): string {
  switch (name) {
    case "query_system_data": return "Consultando seus dados...";
    case "mutate_system_data": return "Executando ações...";
    case "analyze_system_data": return "Cruzando os números...";
    case "manage_memory": return "Atualizando memórias...";
    case "semantic_search": return "Buscando por significado...";
    case "find_correlations": return "Procurando padrões na sua vida...";
    case "project_future": return "Simulando o futuro...";
    case "generate_flashcards": return "Criando flashcards...";
    case "expert_council": return "Reunindo o conselho de especialistas...";
    case "curate_media": return "Vasculhando seu catálogo...";
    case "audit_subscriptions": return "Caçando assinaturas...";
    case "game_master": return "Consultando o placar da sua vida...";
    case "system_cleanup_scan": return "Procurando o que faxinar...";
    case "explain_feature": return "Consultando o manual...";
    case "web_search": return "Pesquisando na web...";
    case "read_url": return "Lendo a página...";
    default: return "Executando ferramenta...";
  }
}

/** Lê um corpo SSE linha a linha e entrega cada payload `data: {...}`. */
async function readSse(res: Response, onData: (json: string) => void): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      onData(payload);
    }
  }
}

// Delta de tool call no formato OpenAI (chunks de stream).
interface OpenAIToolCallDelta {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}
interface OpenAIStreamChunk {
  choices?: { delta?: { content?: string | null; tool_calls?: OpenAIToolCallDelta[] } }[];
  usage?: ProviderResponse["usage"];
  error?: { code?: string; message?: string };
}

/**
 * POST com stream:true (OpenAI-like). Monta a mensagem completa a partir dos
 * deltas e devolve no formato ProviderResponse. Texto é emitido ao vivo;
 * se o turno revelar tool_calls, um `reset` descarta o provisório no client.
 */
async function fetchOpenAIStream(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  emit: StreamEmitter
): Promise<{ ok: boolean; status: number; data: ProviderResponse }> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ ...body, stream: true }) });
  } catch {
    return { ok: false, status: 0, data: { error: { message: "Falha de rede no streaming." } } };
  }
  if (!res.ok || !res.headers.get("content-type")?.includes("text/event-stream")) {
    const data = (await res.json().catch(() => ({}))) as ProviderResponse;
    return { ok: false, status: res.status, data };
  }

  let content = "";
  let emitted = false;
  let usage: ProviderResponse["usage"];
  const calls = new Map<number, { id: string; name: string; arguments: string }>();

  await readSse(res, (payload) => {
    let chunk: OpenAIStreamChunk;
    try { chunk = JSON.parse(payload) as OpenAIStreamChunk; } catch { return; }
    if (chunk.usage) usage = chunk.usage;
    const delta = chunk.choices?.[0]?.delta;
    if (!delta) return;

    for (const tc of delta.tool_calls ?? []) {
      const i = tc.index ?? 0;
      const cur = calls.get(i) ?? { id: tc.id ?? `call_${i}`, name: "", arguments: "" };
      if (tc.id) cur.id = tc.id;
      if (tc.function?.name) cur.name += tc.function.name;
      if (tc.function?.arguments) cur.arguments += tc.function.arguments;
      calls.set(i, cur);
    }
    if (calls.size > 0 && emitted) {
      // Texto provisório era preâmbulo de um turno de ferramenta — descarta.
      emit({ type: "reset" });
      emitted = false;
      content = "";
      return;
    }
    if (typeof delta.content === "string" && delta.content && calls.size === 0) {
      content += delta.content;
      emitted = true;
      emit({ type: "delta", text: delta.content });
    }
  });

  const tool_calls: OpenAIToolCall[] | undefined = calls.size
    ? [...calls.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.arguments } }))
    : undefined;

  return {
    ok: true,
    status: res.status,
    data: { choices: [{ message: { role: "assistant", content, ...(tool_calls ? { tool_calls } : {}) } }], usage },
  };
}

interface GeminiStreamChunk {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
  usageMetadata?: ProviderResponse["usageMetadata"];
  error?: { code?: string; message?: string };
}

/** streamGenerateContent (alt=sse) do Gemini, agregado para ProviderResponse. */
async function fetchGeminiStream(
  url: string,
  body: Record<string, unknown>,
  emit: StreamEmitter
): Promise<{ ok: boolean; status: number; data: ProviderResponse }> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    return { ok: false, status: 0, data: { error: { message: "Falha de rede no streaming." } } };
  }
  if (!res.ok || !res.headers.get("content-type")?.includes("text/event-stream")) {
    const data = (await res.json().catch(() => ({}))) as ProviderResponse;
    return { ok: false, status: res.status, data };
  }

  let text = "";
  let emitted = false;
  const fnCalls: GeminiPart[] = [];
  let usageMetadata: ProviderResponse["usageMetadata"];

  await readSse(res, (payload) => {
    let chunk: GeminiStreamChunk;
    try { chunk = JSON.parse(payload) as GeminiStreamChunk; } catch { return; }
    if (chunk.usageMetadata) usageMetadata = chunk.usageMetadata;
    const parts = chunk.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      if (p.functionCall) {
        fnCalls.push(p);
        if (emitted) {
          emit({ type: "reset" });
          emitted = false;
          text = "";
        }
      } else if (p.text && fnCalls.length === 0) {
        text += p.text;
        emitted = true;
        emit({ type: "delta", text: p.text });
      }
    }
  });

  const parts: GeminiPart[] = [...(text ? [{ text }] : []), ...fnCalls];
  return { ok: true, status: res.status, data: { candidates: [{ content: { parts } }], usageMetadata } };
}

// Constrói um "card de ação" a partir de uma mutação CONCLUÍDA (CREATE/UPDATE/
// DELETE confirmado). Ignora previews de exclusão pendente e falhas.
function captureAction(name: string, args: ToolArgs, resultJson: string): AIAction | null {
  if (name !== "mutate_system_data" || !args.module) return null;
  // Narrowing: ToolArgs.action também cobre as ações de memória (SAVE/LIST).
  const action = args.action;
  if (action !== "CREATE" && action !== "UPDATE" && action !== "DELETE") return null;
  try {
    const r = JSON.parse(resultJson) as { ok?: boolean; pending?: boolean };
    if (!r.ok || r.pending) return null;
    const info = moduleInfo(args.module);
    const label = String(args.title || args.description || info.name).slice(0, 60);
    return { module: args.module, action, label, href: info.href };
  } catch {
    return null;
  }
}

// Detecta uma exclusão aguardando confirmação a partir do resultado de uma mutação.
function capturePending(name: string, resultJson: string, current: PendingAction | null): PendingAction | null {
  if (name !== "mutate_system_data") return current;
  try {
    const r = JSON.parse(resultJson) as { pending?: boolean; ok?: boolean; module?: string; id?: string; label?: string };
    if (r.pending && r.module && r.id) return { module: r.module, id: r.id, label: r.label ?? "" };
    if (r.ok) return null; // ação concluída cancela qualquer pendência
    return current;
  } catch {
    return current;
  }
}

/* ============================================================================
   GEMINI (Google) — loop agêntico
   ============================================================================ */

// Fallback quando o Gemini devolve candidato vazio 2× seguidas: conta ao usuário
// o que JÁ foi executado (as ações não se perdem) em vez de um erro críptico.
function emptyGeminiFallback(actions: AIAction[]): string {
  if (actions.length > 0) {
    const done = actions.map((a) => `- ${a.label}`).join("\n");
    return `Executei o que você pediu:\n${done}\n\n(O Gemini não devolveu o texto final — falha esporádica do provedor. As ações acima foram concluídas; se faltou algo, é só pedir.)`;
  }
  return "O Gemini devolveu uma resposta vazia (falha esporádica do provedor — acontece de vez em quando no free tier). Clique em Regenerar ou reformule a pergunta.";
}
async function handleGeminiProvider(modelConfig: string, systemPrompt: string, userMessage: string, history: ChatHistoryItem[], apiKey: string, attachments: ChatAttachment[] = [], emit?: StreamEmitter): Promise<AIResponse> {
  // Fallback 2.5: o free tier do Google zerou a cota do 2.0-flash ("limit: 0").
  const model = modelConfig || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const geminiTools = [{
    functionDeclarations: tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    })),
  }];

  const systemInstruction = { parts: [{ text: systemPrompt }] };
  const contents: GeminiContent[] = history.map(h => ({
    role: h.role === "assistant" ? "model" : "user",
    parts: [{ text: h.content }],
  }));
  // Visão: as imagens anexadas viajam como inlineData junto do texto do turno.
  const userParts: GeminiPart[] = [{ text: userMessage }];
  for (const att of attachments) {
    const img = splitDataUrl(att.dataUrl);
    if (img) userParts.push({ inlineData: img });
  }
  contents.push({ role: "user", parts: userParts });

  let pending: PendingAction | null = null;
  const actions: AIAction[] = [];
  let usage: TokenUsage = ZERO_USAGE;
  // O Gemini às vezes devolve candidato VAZIO (finishReason MALFORMED_FUNCTION_CALL/
  // SAFETY/etc.), principalmente após rodadas de ferramenta. Uma repetição costuma
  // resolver; se persistir, devolvemos um fallback honesto (com o que JÁ foi feito)
  // em vez do críptico "Sem resposta válida do Gemini.".
  let retriedEmpty = false;

  for (let step = 0; step < MAX_STEPS; step++) {
    const requestBody = { systemInstruction, contents, tools: geminiTools };
    const init = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) };
    const { ok, data } = emit
      ? await fetchGeminiStream(streamUrl, requestBody, emit)
      : await fetchProvider(url, init);
    if (!ok) throw new Error(data.error?.message || "Erro na API do Gemini");
    usage = addUsage(usage, data);

    const parts: GeminiPart[] | undefined = data.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      const reason = (data.candidates?.[0] as { finishReason?: string } | undefined)?.finishReason ?? "sem candidato";
      console.warn(`[GEMINI] candidato vazio (${reason}) no passo ${step + 1} — ${retriedEmpty ? "desistindo" : "tentando de novo"}.`);
      if (!retriedEmpty) {
        retriedEmpty = true;
        emit?.({ type: "status", label: "Resposta vazia do Gemini — tentando de novo..." });
        continue;
      }
      return { text: emptyGeminiFallback(actions), pending, actions, usage };
    }

    const fnCalls = parts.filter((p) => p.functionCall);
    if (fnCalls.length === 0) {
      return { text: parts.map((p) => p.text ?? "").join("").trim() || "", pending, actions, usage };
    }

    contents.push({ role: "model", parts });
    const responseParts: GeminiPart[] = [];
    for (const p of fnCalls) {
      const fc = p.functionCall!;
      const fcArgs = fc.args as unknown as ToolArgs;
      emit?.({ type: "status", label: toolStatusLabel(fc.name) });
      const result = await executeTool(fc.name, fcArgs);
      pending = capturePending(fc.name, result, pending);
      const act = captureAction(fc.name, fcArgs, result);
      if (act) actions.push(act);
      responseParts.push({ functionResponse: { name: fc.name, response: { result } } });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  const finalBody = { systemInstruction, contents };
  const finalInit = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(finalBody) };
  const { data: finalData } = emit
    ? await fetchGeminiStream(streamUrl, finalBody, emit)
    : await fetchProvider(url, finalInit);
  usage = addUsage(usage, finalData);
  const fparts: GeminiPart[] | undefined = finalData.candidates?.[0]?.content?.parts;
  return { text: fparts?.map((p) => p.text ?? "").join("").trim() || "Cheguei ao limite de passos sem concluir. Pode detalhar o pedido?", pending, actions, usage };
}

/* ============================================================================
   OPENAI-LIKE (OpenAI, Groq, DeepSeek, Mistral, Ollama) — loop agêntico
   ============================================================================ */
async function handleOpenAILikeProvider(url: string, finalModel: string, apiKey: string, systemPrompt: string, userMessage: string, history: ChatHistoryItem[], attachments: ChatAttachment[] = [], emit?: StreamEmitter): Promise<AIResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  // Visão: com anexos, o conteúdo do turno vira array multimodal (texto+imagens).
  const userContent: string | OpenAIContentPart[] = attachments.length
    ? [
        { type: "text", text: userMessage },
        ...attachments.map((att): OpenAIContentPart => ({ type: "image_url", image_url: { url: att.dataUrl } })),
      ]
    : userMessage;

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: "user", content: userContent },
  ];

  let pending: PendingAction | null = null;
  const actions: AIAction[] = [];
  let usage: TokenUsage = ZERO_USAGE;

  for (let step = 0; step < MAX_STEPS; step++) {
    const requestBody = { model: finalModel, messages, tools, tool_choice: "auto" };
    const init = { method: "POST", headers, body: JSON.stringify(requestBody) };

    let { ok, data } = emit
      ? await fetchOpenAIStream(url, headers, requestBody, emit)
      : await fetchProvider(url, init);

    // tool_use_failed (400): a geração é amostrada — repetir uma vez costuma sair válida.
    if (!ok && isToolUseFailure(data)) {
      ({ ok, data } = await fetchProvider(url, init, 0));
    }
    // Se persistiu, devolve mensagem amigável em vez do erro técnico em inglês.
    if (!ok && isToolUseFailure(data)) {
      return {
        text: "Tentei registrar isso, mas a IA gerou a ação num formato inválido — costuma acontecer com textos longos ou com muitas linhas. Tente pedir de forma mais curta (ou divida em partes) que eu salvo de novo. 🙂",
        pending,
        actions,
        usage,
      };
    }
    if (!ok) throw new Error(data.error?.message || "Erro na comunicação com a API.");
    usage = addUsage(usage, data);

    const aiMsg = data.choices?.[0]?.message;
    if (!aiMsg) return { text: "Sem resposta da rede neural.", pending, actions, usage };

    if (!aiMsg.tool_calls || aiMsg.tool_calls.length === 0) return { text: contentToText(aiMsg.content), pending, actions, usage };

    messages.push(aiMsg);
    for (const call of aiMsg.tool_calls) {
      const args = parseToolArgs(call.function.arguments);
      emit?.({ type: "status", label: toolStatusLabel(call.function.name) });
      const result = await executeTool(call.function.name, args);
      pending = capturePending(call.function.name, result, pending);
      const act = captureAction(call.function.name, args, result);
      if (act) actions.push(act);
      messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: result });
    }
  }

  const finalBody = { model: finalModel, messages };
  const finalInit = { method: "POST", headers, body: JSON.stringify(finalBody) };
  const { ok: finalOk, data: finalData } = emit
    ? await fetchOpenAIStream(url, headers, finalBody, emit)
    : await fetchProvider(url, finalInit);
  if (!finalOk) throw new Error(finalData.error?.message || "Erro na geração final.");
  usage = addUsage(usage, finalData);
  return { text: contentToText(finalData.choices?.[0]?.message?.content) || "Cheguei ao limite de passos sem concluir. Pode detalhar o pedido?", pending, actions, usage };
}

/* ============================================================================
   ROTEADOR DE PROVEDOR
   ============================================================================ */
export async function callAIProvider(provider: string, modelConfig: string, systemPrompt: string, userMessage: string, history: ChatHistoryItem[], keys: AIKeys, attachments: ChatAttachment[] = [], emit?: StreamEmitter): Promise<AIResponse> {

  if (provider === "google") {
    const apiKey = keys.google || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Credencial ausente. Cadastre sua API Key do Google Gemini.");
    return await handleGeminiProvider(modelConfig, systemPrompt, userMessage, history, apiKey, attachments, emit);
  }

  let apiKey = "";
  let url = "";
  let finalModel = modelConfig;

  switch (provider) {
    case "openai":
      apiKey = keys.openai || process.env.OPENAI_API_KEY || "";
      url = "https://api.openai.com/v1/chat/completions";
      finalModel = modelConfig || "gpt-4o-mini";
      break;
    case "anthropic":
      // Endpoint de compatibilidade OpenAI da Anthropic (suporta tool-calling).
      apiKey = keys.anthropic || process.env.ANTHROPIC_API_KEY || "";
      url = "https://api.anthropic.com/v1/chat/completions";
      finalModel = modelConfig || "claude-sonnet-4-6";
      break;
    case "xai":
      apiKey = keys.xai || process.env.XAI_API_KEY || "";
      url = "https://api.x.ai/v1/chat/completions";
      finalModel = modelConfig || "grok-3";
      break;
    case "openrouter":
      // Agregador: acessa dezenas de modelos com uma chave só ("provedor/modelo").
      apiKey = keys.openrouter || process.env.OPENROUTER_API_KEY || "";
      url = "https://openrouter.ai/api/v1/chat/completions";
      finalModel = modelConfig || "openai/gpt-4o-mini";
      break;
    case "groq":
      apiKey = keys.groq || process.env.GROQ_API_KEY || "";
      url = "https://api.groq.com/openai/v1/chat/completions";
      finalModel = modelConfig || "llama-3.3-70b-versatile";
      break;
    case "deepseek":
      apiKey = keys.deepseek || process.env.DEEPSEEK_API_KEY || "";
      url = "https://api.deepseek.com/chat/completions";
      finalModel = modelConfig || "deepseek-chat";
      break;
    case "mistral":
      apiKey = keys.mistral || process.env.MISTRAL_API_KEY || "";
      url = "https://api.mistral.ai/v1/chat/completions";
      finalModel = modelConfig || "mistral-large-latest";
      break;
    case "ollama":
      // Endpoint compatível com OpenAI do Ollama (suporta tool-calling).
      // OLLAMA_URL no .env permite apontar p/ outra máquina (ex.: PC da rede).
      url = `${(process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "")}/v1/chat/completions`;
      finalModel = modelConfig || "llama3.1";
      break;
    default:
      throw new Error("Provedor não suportado para chamadas autônomas.");
  }

  if (!apiKey && provider !== "ollama") {
    throw new Error(`Credencial ausente. Cadastre sua API Key para ${provider.toUpperCase()} nas configurações.`);
  }

  return await handleOpenAILikeProvider(url, finalModel, apiKey, systemPrompt, userMessage, history, attachments, emit);
}
