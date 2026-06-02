"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { encryptKey } from "@/lib/settings-crypto";

// ============================================================================
// CONFIGURAÇÕES DE IA
// ============================================================================
// Tipo estrito dos campos que esta action pode gravar (sem `any`).
interface AISettingsData {
  aiProvider: string;
  aiModel: string;
  aiPersona: string | null;
  openaiKey?: string | null;
  groqKey?: string | null;
  googleKey?: string | null;
  deepseekKey?: string | null;
  mistralKey?: string | null;
}

export async function updateAISettings(formData: FormData) {
  const userId = await requireUserId();

  const aiProvider = (formData.get("aiProvider") as string) || "ollama";
  const aiModel = ((formData.get("aiModel") as string) || "").trim() || "llama3";
  const aiPersonaRaw = ((formData.get("aiPersona") as string) || "").trim();

  const data: AISettingsData = {
    aiProvider,
    aiModel,
    aiPersona: aiPersonaRaw || null,
  };

  // O form de IA envia somente o campo do provedor selecionado (ex: `groqKey`).
  // Lemos dinamicamente APENAS a coluna válida e permitimos limpar (null)
  // quando o usuário apaga o campo. Ollama não possui chave.
  const keyField = `${aiProvider}Key`;
  if (formData.has(keyField)) {
    // Cifrado at-rest; encryptKey(null) -> null permite limpar a chave.
    const keyValue = encryptKey(formData.get(keyField) as string);
    switch (aiProvider) {
      case "openai": data.openaiKey = keyValue; break;
      case "groq": data.groqKey = keyValue; break;
      case "google": data.googleKey = keyValue; break;
      case "deepseek": data.deepseekKey = keyValue; break;
      case "mistral": data.mistralKey = keyValue; break;
    }
  }

  await prisma.settings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  revalidatePath("/");
  revalidatePath("/settings");
  return { success: true };
}

// ============================================================================
// UPDATE SETTINGS (PERFIL)
// ============================================================================
export async function updateSettings(formData: FormData) {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const bio = formData.get("bio") as string;
    const avatarUrl = formData.get("avatarUrl") as string;
    const accentColor = formData.get("accentColor") as string;
    const coverUrl = formData.get("coverUrl") as string;
    // Moeda (Regional). Só sobrescreve se o form enviar o campo.
    const currency = (formData.get("currency") as string) || undefined;
    // Cobrança (Negócios). Campo vazio limpa; ausência do campo mantém.
    const pixKey = formData.has("pixKey") ? ((formData.get("pixKey") as string)?.trim() || null) : undefined;
    const businessName = formData.has("businessName") ? ((formData.get("businessName") as string)?.trim() || null) : undefined;

    const userId = await requireUserId();

    await prisma.user.update({
        where: { id: userId },
        data: { name, email, bio, avatarUrl, coverUrl }
    });

    const billingData = {
        ...(pixKey !== undefined ? { pixKey } : {}),
        ...(businessName !== undefined ? { businessName } : {}),
    };

    await prisma.settings.upsert({
        where: { userId },
        update: { accentColor, ...(currency ? { currency } : {}), ...billingData },
        create: { userId, accentColor, ...(currency ? { currency } : {}), ...billingData }
    });

    revalidatePath("/settings");
    return { success: true };
}

// ============================================================================
// INTEGRAÇÕES (API KEYS)
// ============================================================================
export async function updateApiKeys(formData: FormData) {
    try {
        // 1. Captura os dados do formulário
        // Os nomes aqui devem ser IGUAIS ao atributo 'name' dos seus inputs.
        // OBS: NÃO mexemos nas chaves de IA aqui — elas são gerenciadas pelo
        // form de IA (updateAISettings). Antes, ler/gravar openai/groq/google
        // neste form (que não envia esses campos) ZERAVA as chaves de IA.
        const tmdbApiKey = formData.get("tmdbApiKey") as string;
        const rawgApiKey = formData.get("rawgApiKey") as string;
        const googleBooksApiKey = formData.get("googleBooksApiKey") as string;
        const pluggyClientId = formData.get("pluggyClientId") as string;
        const pluggySecret = formData.get("pluggySecret") as string;

        // Toggle da busca online de alimentos (Open Food Facts). Default: habilitado.
        const foodApiEnabled = formData.get("foodApiEnabled") !== "false";

        // 2. Identifica o usuário logado
        const userId = await requireUserId();

        // 3. Monta o objeto de dados (cifrado at-rest; null permite limpar)
        const finalData = {
            tmdbApiKey: encryptKey(tmdbApiKey),
            rawgApiKey: encryptKey(rawgApiKey),
            googleBooksApiKey: encryptKey(googleBooksApiKey),
            pluggyClientId: encryptKey(pluggyClientId),
            pluggySecret: encryptKey(pluggySecret),
            foodApiEnabled,
        }

        await prisma.settings.upsert({
            where: { userId },
            update: finalData,
            create: {
                ...finalData,
                userId,
                theme: "system",
                accentColor: "zinc"
            }
        });

        revalidatePath("/settings");
        return { success: true, message: "Integrações atualizadas com sucesso!" };

    } catch (error) {
        console.error("Erro ao salvar integrações:", error);
        return { success: false, message: "Erro ao salvar no banco de dados." };
    }
}
