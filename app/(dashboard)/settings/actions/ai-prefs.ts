"use server";

// Preferências de privacidade/roteamento da IA (todas OPT-IN):
// - aiWebAccess: tools de web (busca + leitura de URL)
// - aiPrivacyRouting: assuntos sensíveis roteados para o Ollama local
// - aiCostRouting: perguntas triviais roteadas para modelo mais barato

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface AiPrefs {
  aiWebAccess: boolean;
  aiPrivacyRouting: boolean;
  aiCostRouting: boolean;
}

export async function updateAiPrefs(prefs: Partial<AiPrefs>): Promise<{ success: boolean }> {
  const userId = await requireUserId();
  const data: Partial<AiPrefs> = {};
  if (typeof prefs.aiWebAccess === "boolean") data.aiWebAccess = prefs.aiWebAccess;
  if (typeof prefs.aiPrivacyRouting === "boolean") data.aiPrivacyRouting = prefs.aiPrivacyRouting;
  if (typeof prefs.aiCostRouting === "boolean") data.aiCostRouting = prefs.aiCostRouting;
  if (Object.keys(data).length === 0) return { success: false };

  const r = await prisma.settings.updateMany({ where: { userId }, data });
  revalidatePath("/settings");
  return { success: r.count > 0 };
}
