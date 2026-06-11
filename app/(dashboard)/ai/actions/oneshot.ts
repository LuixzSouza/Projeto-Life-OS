// Chamada ONE-SHOT à IA (sem chat, sem histórico, sem ferramentas): util de
// servidor para features que pedem um único texto (Advogado do Diabo,
// Liquefação de Tarefas…). Reusa o provedor/chaves configurados pelo usuário.
// Retorna null quando a IA não está configurada ou falha — quem chama SEMPRE
// precisa ter um fallback local (princípio: nada quebra sem IA).

import { prisma } from "@/lib/prisma";
import { decryptKey } from "@/lib/settings-crypto";
import { getAiStatus, providerMeta, normalizeProvider, setupMessage } from "@/lib/ai-help";
import { isEphemeralServerless } from "@/lib/db-config";
import { callAIProvider } from "./providers";
import type { AIKeys } from "./types";

// Configuração resolvida para chamar a IA fora do chat (jobs, reuniões...).
// Centraliza o padrão settings → chaves decifradas → status, que estava
// duplicado (e incompleto: sem anthropic/xai/openrouter) em vários módulos.
export interface AiCallConfig {
  configured: boolean;
  provider: string;
  model: string;
  keys: AIKeys;
  /** Mensagem amigável de configuração quando configured=false. */
  error?: string;
}

export async function getAiCallConfig(userId: string): Promise<AiCallConfig> {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  const provider = normalizeProvider(settings?.aiProvider);

  const s = settings as unknown as Record<string, string | null | undefined>;
  const keys: AIKeys = {
    openai: decryptKey(s?.openaiKey),
    groq: decryptKey(s?.groqKey),
    google: decryptKey(s?.googleKey),
    deepseek: decryptKey(s?.deepseekKey),
    mistral: decryptKey(s?.mistralKey),
    anthropic: decryptKey(s?.anthropicKey),
    xai: decryptKey(s?.xaiKey),
    openrouter: decryptKey(s?.openrouterKey),
  };

  const meta = providerMeta(provider);
  const keyValue = meta.local ? "ok" : keys[meta.id as keyof AIKeys];
  const envFallback = meta.local ? true : !!process.env[`${provider.toUpperCase()}_API_KEY`];
  const hasKey = meta.local ? true : !!keyValue || envFallback;
  const status = getAiStatus(provider, hasKey, isEphemeralServerless());

  return {
    configured: status.configured,
    provider,
    model: settings?.aiModel || "",
    keys,
    error: status.configured ? undefined : setupMessage(status),
  };
}

export async function runOneShotAi(
  userId: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string | null> {
  try {
    const config = await getAiCallConfig(userId);
    if (!config.configured) return null;

    const res = await callAIProvider(config.provider, config.model, systemPrompt, userMessage, [], config.keys);
    const text = res.text?.trim();
    return text ? text : null;
  } catch (error) {
    console.error("One-shot AI falhou (seguindo com fallback local):", error);
    return null;
  }
}
