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
  { id: "groq", label: "Groq (Llama)", keyField: "groqKey", getKeyUrl: "https://console.groq.com/keys" },
  { id: "google", label: "Google Gemini", keyField: "googleKey", getKeyUrl: "https://aistudio.google.com/app/apikey" },
  { id: "deepseek", label: "DeepSeek", keyField: "deepseekKey", getKeyUrl: "https://platform.deepseek.com/api_keys" },
  { id: "mistral", label: "Mistral", keyField: "mistralKey", getKeyUrl: "https://console.mistral.ai/api-keys" },
  { id: "ollama", label: "Ollama (Local)", local: true },
];

export function providerMeta(id: string | null | undefined): ProviderMeta {
  return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0];
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

export function getAiStatus(provider: string | null | undefined, hasKey: boolean): AiStatus {
  const meta = providerMeta(provider);

  if (meta.local) {
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
  { area: "Saúde", icon: "activity", can: "registrar treinos e peso", example: "Registrei 40min de corrida hoje" },
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
// Remove qualquer marcador interno (em qualquer posição).
const MARKER_RE = /\n*<!--LIFEOS_(?:PENDING|ACTIONS):[A-Za-z0-9+/=]*-->/g;

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

// Remove TODOS os marcadores internos — para exibir ao usuário e enviar ao modelo.
export function stripPending(content: string): string {
  return content.replace(MARKER_RE, "").trimEnd();
}
