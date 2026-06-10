// =========================================================
// CATÁLOGO DE PROVEDORES E MODELOS DE IA (fonte única)
// =========================================================
// Consumido pelo seletor de modelos do chat (components/ai/model-selector.tsx)
// e pelo formulário de configuração (components/settings/ai-config-form.tsx).
// Mantém ícone/cor/link de chave e os modelos sugeridos em UM lugar só.
//
// ⚠️ Todos os modelos listados PRECISAM suportar tool-calling — sem isso o
// loop agêntico (criar tarefa, lançar gasto...) não funciona. Por isso:
// deepseek-chat (não o reasoner), llama3.1+ no Ollama (llama3 puro não tem tools).
import {
  Asterisk,
  Box,
  Brain,
  Cloud,
  HardDrive,
  Network,
  Orbit,
  Sparkles,
  Wind,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AIModelOption {
  /** id exato enviado à API do provedor (ex.: "claude-sonnet-4-6"). */
  value: string;
  label: string;
  badge: string;
  /** Ícone específico do modelo; quando ausente, usa o do provedor. */
  icon?: LucideIcon;
}

export interface AIProviderInfo {
  /** id persistido em Settings.aiProvider (ex.: "anthropic"). */
  id: string;
  /** Nome exibido na UI (ex.: "Claude"). */
  name: string;
  icon: LucideIcon;
  /** Classe Tailwind de cor do ícone (ex.: "text-amber-600"). */
  color: string;
  /** Página onde o usuário gera a credencial. */
  keyUrl: string;
  /** Roda offline, sem chave de API (Ollama). */
  local?: boolean;
  /** Modelos sugeridos; o PRIMEIRO é o padrão do provedor. */
  models: AIModelOption[];
}

export const AI_PROVIDERS: AIProviderInfo[] = [
  {
    id: "ollama",
    name: "Local",
    icon: HardDrive,
    color: "text-zinc-500 dark:text-zinc-400",
    keyUrl: "https://ollama.com/",
    local: true,
    models: [
      { value: "llama3.1", label: "Llama 3.1 (Local)", badge: "8B" },
      { value: "qwen2.5", label: "Qwen 2.5 (Local)", badge: "TOOLS", icon: Box },
      { value: "mistral", label: "Mistral (Local)", badge: "7B" },
    ],
  },
  {
    id: "anthropic",
    name: "Claude",
    icon: Asterisk,
    color: "text-amber-600",
    keyUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", badge: "TOP" },
      { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", badge: "FAST" },
      { value: "claude-opus-4-8", label: "Claude Opus 4.8", badge: "MAX" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: Cloud,
    color: "text-emerald-500",
    keyUrl: "https://platform.openai.com/api-keys",
    models: [
      { value: "gpt-4o-mini", label: "GPT-4o mini", badge: "CUSTO" },
      { value: "gpt-4o", label: "GPT-4o", badge: "SMART" },
    ],
  },
  {
    id: "google",
    name: "Gemini",
    icon: Sparkles,
    color: "text-blue-500",
    keyUrl: "https://aistudio.google.com/app/apikey",
    // Free tier do Google cobre a família 2.5; o 2.0-flash ficou com cota 0
    // (erro "limit: 0" no plano grátis) — por isso saiu das sugestões.
    models: [
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", badge: "1M CTX" },
      { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", badge: "FAST" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    icon: Zap,
    color: "text-orange-500",
    keyUrl: "https://console.groq.com/keys",
    models: [
      { value: "llama-3.3-70b-versatile", label: "Llama 3.3 (Groq)", badge: "FAST" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: Brain,
    color: "text-indigo-500",
    keyUrl: "https://platform.deepseek.com/api_keys",
    models: [
      { value: "deepseek-chat", label: "DeepSeek V3", badge: "CUSTO" },
    ],
  },
  {
    id: "mistral",
    name: "Mistral",
    icon: Wind,
    color: "text-yellow-500",
    keyUrl: "https://console.mistral.ai/api-keys/",
    models: [
      { value: "mistral-large-latest", label: "Mistral Large", badge: "PRO" },
    ],
  },
  {
    id: "xai",
    name: "Grok (xAI)",
    icon: Orbit,
    color: "text-violet-500",
    keyUrl: "https://console.x.ai/",
    models: [
      { value: "grok-3", label: "Grok 3 (xAI)", badge: "X" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: Network,
    color: "text-sky-500",
    keyUrl: "https://openrouter.ai/settings/keys",
    models: [
      { value: "openai/gpt-4o-mini", label: "OpenRouter", badge: "MULTI" },
    ],
  },
];

export function getAIProvider(id: string): AIProviderInfo | undefined {
  return AI_PROVIDERS.find((p) => p.id === id);
}

/** Modelo padrão do provedor (primeiro da lista de sugestões). */
export function defaultModelFor(providerId: string): string {
  return getAIProvider(providerId)?.models[0]?.value ?? "llama3.1";
}
