/* ============================================================================
   TIPAGENS ESTRITAS (FIM DO ANY)
   ============================================================================ */

export interface AIKeys {
  openai?: string | null;
  groq?: string | null;
  google?: string | null;
  deepseek?: string | null;
  mistral?: string | null;
  anthropic?: string | null;
  xai?: string | null;
  openrouter?: string | null;
}

export interface ChatHistoryItem {
  role: string;
  content: string;
}

// Anexo do turno ATUAL (visão multimodal). Imagens viajam só na mensagem em
// que foram enviadas; nos turnos seguintes o histórico volta a ser texto puro
// (economia de token).
export interface ChatAttachment {
  kind: "image";
  /** data:image/...;base64,... (já comprimido no client via compressImageFile) */
  dataUrl: string;
  name?: string;
}

// Partes de conteúdo multimodal no formato OpenAI-like.
export type OpenAIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

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
  | "AGENDA"
  | "NUTRITION"
  | "SLEEP"
  | "HABITS"
  | "JOBS"      // candidaturas a vagas (JobApplication)
  | "GOALS"     // metas de aprendizado (LearningGoal + passos)
  | "LINKS"     // links & apps salvos (SavedLink)
  | "NOTES"     // notas/cadernos (StudyNote)
  | "SITES"     // sites & CMS (ManagedSite — leitura)
  | "TAGS"      // tags do tecido conectivo (Tag)
  | "SETTINGS"; // configurações seguras (Settings — sem chaves/segredos)

export type QueryMode = "list" | "summary";
export type MutateAction = "CREATE" | "UPDATE" | "DELETE";
export type MemoryAction = "SAVE" | "LIST" | "DELETE";

// Tool de análise (analyze_system_data) — agregações SQL em 1 chamada.
export type AnalysisKind = "COMPARE" | "TREND" | "GROUP";
export type AnalysisMetric =
  | "EXPENSE"        // despesas (Transaction)
  | "INCOME"         // receitas (Transaction)
  | "WEIGHT"         // peso corporal (BodyMeasurement)
  | "SLEEP"          // horas de sono (HealthMetric SLEEP)
  | "WORKOUTS"       // treinos (Workout)
  | "STUDY_MINUTES"  // minutos de estudo (StudySession)
  | "CALORIES";      // calorias (Meal)

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
  // mutate (CREATE/UPDATE/DELETE) ou memória (SAVE/LIST/DELETE)
  action?: MutateAction | MemoryAction;
  id?: string;
  confirm?: boolean;
  // manage_memory: o fato a lembrar
  content?: string;
  // semantic_search
  query?: string;
  topK?: number;
  // read_url
  url?: string;
  // project_future
  projection?: "EXPENSE" | "WEIGHT" | "WISHLIST";
  // generate_flashcards
  noteId?: string;
  count?: number;
  // expert_council
  question?: string;
  // explain_feature
  area?: string;
  // analyze_system_data
  analysis?: AnalysisKind;
  metric?: AnalysisMetric;
  periodA?: string; // YYYY-MM
  periodB?: string; // YYYY-MM
  days?: number;    // janela do TREND (7–90)
  // campos comuns de escrita
  title?: string;
  description?: string;
  value?: number;
  category?: string;
  status?: string;
  date?: string;
  // NUTRITION: macros estimados em gramas (junto com value=kcal)
  protein?: number;
  carbs?: number;
  fat?: number;
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

// Consumo REAL de tokens do turno (somado em todas as rodadas do loop
// agêntico). Vem do campo `usage`/`usageMetadata` que os provedores devolvem.
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

// Eventos do streaming SSE (route handler → client):
// delta = pedaço do texto final · status = passo do loop agêntico em execução ·
// reset = o texto provisório era um turno de ferramenta, descartar.
export type AIStreamEvent =
  | { type: "delta"; text: string }
  | { type: "status"; label: string }
  | { type: "reset" };

export type StreamEmitter = (ev: AIStreamEvent) => void;

// Resposta do provedor: texto final + eventual ação pendente (confirmação) +
// lista de ações concluídas no turno (viram cards na UI) + uso real de tokens.
export interface AIResponse {
  text: string;
  pending: import("@/lib/ai-help").PendingAction | null;
  actions: import("@/lib/ai-help").AIAction[];
  /** null quando o provedor não informou usage (cai na estimativa chars/4). */
  usage: TokenUsage | null;
}

export interface OpenAIToolCall {
    id: string;
    type: string;
    function: { name: string; arguments: string };
}

export interface OpenAIMessage {
    role: string;
    content?: string | OpenAIContentPart[] | null;
    tool_call_id?: string;
    name?: string;
    tool_calls?: OpenAIToolCall[];
}

export interface GeminiPart {
    text?: string;
    inlineData?: { mimeType: string; data: string };
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
