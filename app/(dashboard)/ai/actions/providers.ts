// Tradutores de API (roteamento entre provedores) e o LOOP DE PENSAMENTO
// agêntico. A IA pode ler -> agir -> confirmar em vários passos numa mesma
// mensagem (até MAX_STEPS). Módulo server-only (não é "use server").
import { tools, executeTool } from "./tools";
import { AIKeys, ChatHistoryItem, ToolArgs, OpenAIMessage, GeminiContent, GeminiPart, AIResponse } from "./types";
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

// Constrói um "card de ação" a partir de uma mutação CONCLUÍDA (CREATE/UPDATE/
// DELETE confirmado). Ignora previews de exclusão pendente e falhas.
function captureAction(name: string, args: ToolArgs, resultJson: string): AIAction | null {
  if (name !== "mutate_system_data" || !args.module || !args.action) return null;
  try {
    const r = JSON.parse(resultJson) as { ok?: boolean; pending?: boolean };
    if (!r.ok || r.pending) return null;
    const info = moduleInfo(args.module);
    const label = String(args.title || args.description || info.name).slice(0, 60);
    return { module: args.module, action: args.action, label, href: info.href };
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
async function handleGeminiProvider(modelConfig: string, systemPrompt: string, userMessage: string, history: ChatHistoryItem[], apiKey: string): Promise<AIResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig || "gemini-1.5-flash"}:generateContent?key=${apiKey}`;

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
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  let pending: PendingAction | null = null;
  const actions: AIAction[] = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    const init = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction, contents, tools: geminiTools }) };
    const { ok, data } = await fetchProvider(url, init);
    if (!ok) throw new Error(data.error?.message || "Erro na API do Gemini");

    const parts: GeminiPart[] | undefined = data.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) return { text: "Sem resposta válida do Gemini.", pending, actions };

    const fnCalls = parts.filter((p) => p.functionCall);
    if (fnCalls.length === 0) {
      return { text: parts.map((p) => p.text ?? "").join("").trim() || "", pending, actions };
    }

    contents.push({ role: "model", parts });
    const responseParts: GeminiPart[] = [];
    for (const p of fnCalls) {
      const fc = p.functionCall!;
      const fcArgs = fc.args as unknown as ToolArgs;
      const result = await executeTool(fc.name, fcArgs);
      pending = capturePending(fc.name, result, pending);
      const act = captureAction(fc.name, fcArgs, result);
      if (act) actions.push(act);
      responseParts.push({ functionResponse: { name: fc.name, response: { result } } });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  const finalInit = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction, contents }) };
  const { data: finalData } = await fetchProvider(url, finalInit);
  const fparts: GeminiPart[] | undefined = finalData.candidates?.[0]?.content?.parts;
  return { text: fparts?.map((p) => p.text ?? "").join("").trim() || "Cheguei ao limite de passos sem concluir. Pode detalhar o pedido?", pending, actions };
}

/* ============================================================================
   OPENAI-LIKE (OpenAI, Groq, DeepSeek, Mistral, Ollama) — loop agêntico
   ============================================================================ */
async function handleOpenAILikeProvider(url: string, finalModel: string, apiKey: string, systemPrompt: string, userMessage: string, history: ChatHistoryItem[]): Promise<AIResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: "user", content: userMessage },
  ];

  let pending: PendingAction | null = null;
  const actions: AIAction[] = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    const init = { method: "POST", headers, body: JSON.stringify({ model: finalModel, messages, tools, tool_choice: "auto" }) };

    let { ok, data } = await fetchProvider(url, init);

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
      };
    }
    if (!ok) throw new Error(data.error?.message || "Erro na comunicação com a API.");

    const aiMsg = data.choices?.[0]?.message;
    if (!aiMsg) return { text: "Sem resposta da rede neural.", pending, actions };

    if (!aiMsg.tool_calls || aiMsg.tool_calls.length === 0) return { text: aiMsg.content || "", pending, actions };

    messages.push(aiMsg);
    for (const call of aiMsg.tool_calls) {
      const args = parseToolArgs(call.function.arguments);
      const result = await executeTool(call.function.name, args);
      pending = capturePending(call.function.name, result, pending);
      const act = captureAction(call.function.name, args, result);
      if (act) actions.push(act);
      messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: result });
    }
  }

  const finalInit = { method: "POST", headers, body: JSON.stringify({ model: finalModel, messages }) };
  const { ok: finalOk, data: finalData } = await fetchProvider(url, finalInit);
  if (!finalOk) throw new Error(finalData.error?.message || "Erro na geração final.");
  return { text: finalData.choices?.[0]?.message?.content || "Cheguei ao limite de passos sem concluir. Pode detalhar o pedido?", pending, actions };
}

/* ============================================================================
   ROTEADOR DE PROVEDOR
   ============================================================================ */
export async function callAIProvider(provider: string, modelConfig: string, systemPrompt: string, userMessage: string, history: ChatHistoryItem[], keys: AIKeys): Promise<AIResponse> {

  if (provider === "google") {
    const apiKey = keys.google || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Credencial ausente. Cadastre sua API Key do Google Gemini.");
    return await handleGeminiProvider(modelConfig, systemPrompt, userMessage, history, apiKey);
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
      url = "http://localhost:11434/v1/chat/completions";
      finalModel = modelConfig || "llama3.1";
      break;
    default:
      throw new Error("Provedor não suportado para chamadas autônomas.");
  }

  if (!apiKey && provider !== "ollama") {
    throw new Error(`Credencial ausente. Cadastre sua API Key para ${provider.toUpperCase()} nas configurações.`);
  }

  return await handleOpenAILikeProvider(url, finalModel, apiKey, systemPrompt, userMessage, history);
}
