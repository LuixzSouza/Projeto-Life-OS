// Fonte ÚNICA e centralizada da configuração/ajuda da IA do Life OS:
// provedores, status de conexão, capacidades (onboarding) e o marcador de
// "ação pendente" (confirmação de DELETE). Módulo PURO — sem prisma, sem
// server-only — pode ser usado tanto no servidor quanto no client.

/* ----------------------------------------------------------------------------
   PROVEDORES
   ---------------------------------------------------------------------------- */
export interface ProviderMeta {
  id: string;
  label: string;
  local?: boolean;      // true = roda localmente (Ollama), sem API key
  keyField?: string;    // nome do campo em Settings que guarda a chave
  getKeyUrl?: string;   // onde gerar a chave
}

export const AI_PROVIDERS: ProviderMeta[] = [
  { id: "openai", label: "OpenAI (GPT)", keyField: "openaiKey", getKeyUrl: "https://platform.openai.com/api-keys" },
  { id: "anthropic", label: "Claude (Anthropic)", keyField: "anthropicKey", getKeyUrl: "https://console.anthropic.com/settings/keys" },
  { id: "google", label: "Google Gemini", keyField: "googleKey", getKeyUrl: "https://aistudio.google.com/app/apikey" },
  { id: "groq", label: "Groq (Llama)", keyField: "groqKey", getKeyUrl: "https://console.groq.com/keys" },
  { id: "deepseek", label: "DeepSeek", keyField: "deepseekKey", getKeyUrl: "https://platform.deepseek.com/api_keys" },
  { id: "mistral", label: "Mistral", keyField: "mistralKey", getKeyUrl: "https://console.mistral.ai/api-keys" },
  { id: "xai", label: "Grok (xAI)", keyField: "xaiKey", getKeyUrl: "https://console.x.ai/" },
  { id: "openrouter", label: "OpenRouter (multi)", keyField: "openrouterKey", getKeyUrl: "https://openrouter.ai/settings/keys" },
  { id: "ollama", label: "Ollama (Local)", local: true },
];

// Normaliza ids legados: o setup wizard antigo gravava "gemini" em vez de "google".
export function normalizeProvider(id: string | null | undefined): string {
  if (id === "gemini") return "google";
  return id || "ollama";
}

export function providerMeta(id: string | null | undefined): ProviderMeta {
  const norm = normalizeProvider(id);
  return AI_PROVIDERS.find((p) => p.id === norm) ?? AI_PROVIDERS[0];
}

/* ----------------------------------------------------------------------------
   STATUS DE CONEXÃO
   ---------------------------------------------------------------------------- */
export interface AiStatus {
  configured: boolean;
  provider: string;
  label: string;
  local: boolean;
  reason?: string;     // por que não está pronto (ou nota do modo local)
  setup?: string;      // o que o usuário precisa fazer
  getKeyUrl?: string;  // link para gerar a chave
}

export function getAiStatus(provider: string | null | undefined, hasKey: boolean, serverless = false): AiStatus {
  const meta = providerMeta(provider);

  if (meta.local) {
    // Em deploy serverless (Vercel) NÃO existe Ollama em localhost — usá-lo
    // resultaria num "fetch failed" críptico. Tratamos como não-configurado e
    // orientamos a trocar para um provedor de nuvem direto pelas Configurações.
    if (serverless) {
      return {
        configured: false, provider: meta.id, label: meta.label, local: true,
        reason: "O provedor atual é o Ollama (local), mas o app está rodando em um servidor (deploy) sem Ollama disponível.",
        setup: "Vá em Configurações → IA, escolha um provedor de nuvem (OpenAI, Groq, Google Gemini, DeepSeek ou Mistral) e cole sua API Key.",
      };
    }
    return {
      configured: true, provider: meta.id, label: meta.label, local: true,
      reason: "Modo local (Ollama). Requer o Ollama rodando em localhost:11434.",
      setup: "Instale o Ollama, rode `ollama serve` e baixe um modelo (ex.: `ollama pull llama3.1`). Sem isso, troque para um provedor de nuvem em Configurações → IA.",
    };
  }

  if (!hasKey) {
    return {
      configured: false, provider: meta.id, label: meta.label, local: false,
      reason: `Nenhuma API Key configurada para ${meta.label}.`,
      setup: `Vá em Configurações → IA, selecione ${meta.label} e cole sua API Key.`,
      getKeyUrl: meta.getKeyUrl,
    };
  }

  return { configured: true, provider: meta.id, label: meta.label, local: false };
}

// Mensagem amigável (texto) usada quando o usuário tenta usar a IA sem conexão.
export function setupMessage(status: AiStatus): string {
  const parts = [`⚠️ A IA ainda não está conectada (${status.label}).`, "", status.setup ?? ""];
  if (status.getKeyUrl) parts.push("", `🔑 Gere sua chave aqui: ${status.getKeyUrl}`);
  return parts.filter(Boolean).join("\n");
}

/* ----------------------------------------------------------------------------
   CAPACIDADES (onboarding — "o que dá pra fazer com a IA")
   ---------------------------------------------------------------------------- */
export interface AiCapability {
  area: string;
  icon: string;   // chave de ícone (mapeada na UI)
  can: string;
  example: string;
}

export const AI_CAPABILITIES: AiCapability[] = [
  { area: "Finanças", icon: "wallet", can: "lançar gastos/receitas, ver saldo e resumo do mês", example: "Registre R$50 de mercado hoje" },
  { area: "Tarefas", icon: "check", can: "criar, concluir e listar tarefas e prazos", example: "Crie a tarefa Pagar aluguel pra sexta" },
  { area: "Agenda", icon: "calendar", can: "agendar e consultar eventos", example: "Agende dentista dia 20 às 15h" },
  { area: "Saúde", icon: "activity", can: "registrar treinos, peso, refeições, sono e marcar hábitos", example: "Dormi 7h e almocei frango com arroz (600 kcal)" },
  { area: "Estudos", icon: "book", can: "logar sessões e anotações", example: "Estudei 1h de inglês" },
  { area: "Entretenimento", icon: "film", can: "adicionar filmes/séries e status", example: "Adicione o filme Duna como Quero ver" },
  { area: "CRM & Conexões", icon: "users", can: "cadastrar clientes e contatos", example: "Salve o cliente Acme Ltda" },
  { area: "Projetos & mais", icon: "box", can: "criar/gerenciar projetos, closet e cofre", example: "Crie o projeto Site novo" },
];

/* ----------------------------------------------------------------------------
   MÓDULOS — nome amigável + rota (para cards de ação e links)
   ---------------------------------------------------------------------------- */
const MODULE_INFO: Record<string, { name: string; href: string }> = {
  FINANCE: { name: "Lançamento", href: "/finance" },
  TASKS: { name: "Tarefa", href: "/projects" },
  PROJECTS: { name: "Projeto", href: "/projects" },
  HEALTH: { name: "Saúde", href: "/health" },
  STUDIES: { name: "Estudo", href: "/studies" },
  ENTERTAINMENT: { name: "Mídia", href: "/entertainment" },
  CRM: { name: "Cliente", href: "/business" },
  FRIENDS: { name: "Contato", href: "/social" },
  VAULT: { name: "Acesso", href: "/access" },
  WARDROBE: { name: "Peça", href: "/wardrobe" },
  AGENDA: { name: "Evento", href: "/agenda" },
  NUTRITION: { name: "Refeição", href: "/health/nutrition" },
  SLEEP: { name: "Sono", href: "/health/sleep" },
  HABITS: { name: "Hábito", href: "/health" },
};

export function moduleInfo(module: string): { name: string; href: string } {
  return MODULE_INFO[module] ?? { name: module, href: "/dashboard" };
}

/* ----------------------------------------------------------------------------
   MARCADORES INVISÍVEIS persistidos no conteúdo da mensagem do assistente.
   - PENDING: exclusão aguardando confirmação (re-lido no turno seguinte).
   - ACTIONS: ações concluídas (cards exibidos ao usuário).
   Ambos são removidos antes de exibir o texto e antes de enviar ao modelo.
   ---------------------------------------------------------------------------- */
export interface PendingAction {
  module: string;
  id: string;
  label: string;
}

export interface AIAction {
  module: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  label: string;
  href: string;
}

const PENDING_RE = /<!--LIFEOS_PENDING:([A-Za-z0-9+/=]*)-->/;
const ACTIONS_RE = /<!--LIFEOS_ACTIONS:([A-Za-z0-9+/=]*)-->/;
const SUGGEST_RE = /<!--LIFEOS_SUGGEST:([A-Za-z0-9+/=]*)-->/;
// Marcador CRU que o MODELO escreve no fim da resposta (instruído no system
// prompt). É extraído no servidor e re-persistido como marcador base64.
const SUGGEST_RAW_RE = /<!--\s*SUGGEST\s*:\s*(\[[\s\S]*?\])\s*-->/i;
// Remove qualquer marcador interno (em qualquer posição).
const MARKER_RE = /\n*<!--LIFEOS_(?:PENDING|ACTIONS|SUGGEST):[A-Za-z0-9+/=]*-->/g;

function toBase64(s: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(s, "utf8").toString("base64");
  return btoa(unescape(encodeURIComponent(s)));
}
function fromBase64(s: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(s, "base64").toString("utf8");
  return decodeURIComponent(escape(atob(s)));
}

export function encodePending(p: PendingAction): string {
  return `\n\n<!--LIFEOS_PENDING:${toBase64(JSON.stringify(p))}-->`;
}

export function extractPending(content: string): PendingAction | null {
  const m = content.match(PENDING_RE);
  if (!m) return null;
  try {
    const p = JSON.parse(fromBase64(m[1])) as PendingAction;
    return p && p.module && p.id ? p : null;
  } catch {
    return null;
  }
}

export function encodeActions(actions: AIAction[]): string {
  if (!actions.length) return "";
  return `\n\n<!--LIFEOS_ACTIONS:${toBase64(JSON.stringify(actions))}-->`;
}

export function extractActions(content: string): AIAction[] {
  const m = content.match(ACTIONS_RE);
  if (!m) return [];
  try {
    const arr = JSON.parse(fromBase64(m[1])) as AIAction[];
    return Array.isArray(arr) ? arr.filter((a) => a && a.module && a.action) : [];
  } catch {
    return [];
  }
}

/* ----------------------------------------------------------------------------
   SUGESTÕES DE FOLLOW-UP (chips pós-resposta)
   O modelo encerra a resposta com <!--SUGGEST:["...","..."]-->; o servidor
   extrai, limpa o texto e persiste como marcador base64 (mesma infra dos
   marcadores PENDING/ACTIONS). A UI mostra as sugestões como chips clicáveis.
   ---------------------------------------------------------------------------- */

const MAX_SUGGESTIONS = 3;
const MAX_SUGGESTION_LEN = 90;

function sanitizeSuggestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is string => typeof s === "string" && s.trim().length > 1)
    .map((s) => s.trim().replace(/\s+/g, " ").slice(0, MAX_SUGGESTION_LEN))
    .slice(0, MAX_SUGGESTIONS);
}

/** Extrai o marcador CRU escrito pelo modelo e devolve o texto limpo. */
export function extractModelSuggestions(text: string): { text: string; suggestions: string[] } {
  const m = text.match(SUGGEST_RAW_RE);
  if (!m) return { text, suggestions: [] };
  let suggestions: string[] = [];
  try {
    suggestions = sanitizeSuggestions(JSON.parse(m[1]));
  } catch {
    suggestions = [];
  }
  return { text: text.replace(SUGGEST_RAW_RE, "").trimEnd(), suggestions };
}

export function encodeSuggestions(s: string[]): string {
  if (!s.length) return "";
  return `\n\n<!--LIFEOS_SUGGEST:${toBase64(JSON.stringify(s))}-->`;
}

export function extractSuggestions(content: string): string[] {
  const m = content.match(SUGGEST_RE);
  if (!m) return [];
  try {
    return sanitizeSuggestions(JSON.parse(fromBase64(m[1])));
  } catch {
    return [];
  }
}

/* ----------------------------------------------------------------------------
   ANEXOS DE IMAGEM (visão multimodal)
   A imagem (data URL comprimida) fica persistida na PRÓPRIA mensagem do
   usuário como marcador — a UI a renderiza na bolha, mas o histórico enviado
   ao modelo (stripPending) volta a ser texto puro: a imagem só viaja no turno
   em que foi anexada (economia de token).
   ---------------------------------------------------------------------------- */

const IMG_RE = /<!--LIFEOS_IMG:(data:image\/[a-z0-9+.-]+;base64,[A-Za-z0-9+/=]+)-->/i;
const IMG_RE_GLOBAL = /\n*<!--LIFEOS_IMG:data:image\/[a-z0-9+.-]+;base64,[A-Za-z0-9+/=]+-->/gi;

export function encodeImages(dataUrls: string[]): string {
  if (!dataUrls.length) return "";
  return dataUrls.map((u) => `\n\n<!--LIFEOS_IMG:${u}-->`).join("");
}

export function extractImages(content: string): string[] {
  const out: string[] = [];
  const re = new RegExp(IMG_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) out.push(m[1]);
  return out;
}

// Remove TODOS os marcadores internos — para exibir ao usuário e enviar ao modelo.
export function stripPending(content: string): string {
  return content.replace(MARKER_RE, "").replace(SUGGEST_RAW_RE, "").replace(IMG_RE_GLOBAL, "").trimEnd();
}
