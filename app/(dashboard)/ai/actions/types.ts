/* ============================================================================
   TIPAGENS ESTRITAS (FIM DO ANY)
   ============================================================================ */

export interface AIKeys {
  openai?: string | null;
  groq?: string | null;
  google?: string | null;
  deepseek?: string | null;
  mistral?: string | null;
}

export interface ChatHistoryItem {
  role: string;
  content: string;
}

// Módulos que a IA consegue ler e gerenciar via tools.
export type AIModule =
  | "FINANCE"
  | "HEALTH"
  | "TASKS"
  | "PROJECTS"
  | "STUDIES"
  | "ENTERTAINMENT"
  | "CRM"
  | "FRIENDS"
  | "VAULT"
  | "WARDROBE"
  | "AGENDA";

export type QueryMode = "list" | "summary";
export type MutateAction = "CREATE" | "UPDATE" | "DELETE";

// Valores soltos que a IA pode passar em `extra` (sem `any`).
export type ExtraValue = string | number | boolean;

// Superconjunto de argumentos aceitos pelas duas tools. Todos opcionais:
// cada executor valida o que precisa.
export interface ToolArgs {
  module?: AIModule;
  // query
  mode?: QueryMode;
  search?: string;
  limit?: number;
  offset?: number;
  // mutate
  action?: MutateAction;
  id?: string;
  confirm?: boolean;
  // campos comuns de escrita
  title?: string;
  description?: string;
  value?: number;
  category?: string;
  status?: string;
  date?: string;
  extra?: Record<string, ExtraValue>;
}

// Resultado padronizado das mutações.
export interface MutationResult {
  ok: boolean;
  id?: string;
  module?: AIModule; // preenchido em DELETE pendente, para a ação pendente
  label?: string;    // rótulo curto do registro-alvo
  pending?: boolean; // aguardando confirmação do usuário (DELETE)
  summary: string;
}

// Resposta do provedor: texto final + eventual ação pendente (confirmação) +
// lista de ações concluídas no turno (viram cards na UI).
export interface AIResponse {
  text: string;
  pending: import("@/lib/ai-help").PendingAction | null;
  actions: import("@/lib/ai-help").AIAction[];
}

export interface OpenAIToolCall {
    id: string;
    type: string;
    function: { name: string; arguments: string };
}

export interface OpenAIMessage {
    role: string;
    content?: string | null;
    tool_call_id?: string;
    name?: string;
    tool_calls?: OpenAIToolCall[];
}

export interface GeminiPart {
    text?: string;
    functionCall?: { name: string; args: Record<string, unknown> };
    functionResponse?: { name: string; response: Record<string, unknown> };
}

export interface GeminiContent {
    role: "user" | "model";
    parts: GeminiPart[];
}

export interface UpdatedHistoryItem {
    role: string;
    content?: string;
    tool_call_id?: string;
    name?: string;
    tool_calls?: OpenAIToolCall[];
}
