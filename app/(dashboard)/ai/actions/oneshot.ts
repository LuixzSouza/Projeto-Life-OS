// Chamada ONE-SHOT à IA (sem chat, sem histórico, sem ferramentas): util de
// servidor para features que pedem um único texto (Advogado do Diabo,
// Liquefação de Tarefas…). Reusa o provedor/chaves configurados pelo usuário.
// Retorna null quando a IA não está configurada ou falha — quem chama SEMPRE
// precisa ter um fallback local (princípio: nada quebra sem IA).

import { prisma } from "@/lib/prisma";
import { decryptKey } from "@/lib/settings-crypto";
import { getAiStatus, providerMeta, normalizeProvider } from "@/lib/ai-help";
import { isEphemeralServerless } from "@/lib/db-config";
import { callAIProvider } from "./providers";
import type { AIKeys } from "./types";

export async function runOneShotAi(
  userId: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string | null> {
  try {
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
    if (!status.configured) return null;

    const res = await callAIProvider(provider, settings?.aiModel || "", systemPrompt, userMessage, [], keys);
    const text = res.text?.trim();
    return text ? text : null;
  } catch (error) {
    console.error("One-shot AI falhou (seguindo com fallback local):", error);
    return null;
  }
}
