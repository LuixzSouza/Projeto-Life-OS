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
// Valores aceitos para campos restritos (defesa contra dados arbitrários no form).
const VALID_THEMES = ["light", "dark", "system"] as const;
const VALID_LANGUAGES = ["pt-BR", "en-US", "es-ES"] as const;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:MM 24h

export async function updateSettings(formData: FormData) {
    try {
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

        // Tema (claro/escuro/sistema) — persistido no banco para sincronizar entre
        // dispositivos e ser incluído em backups/exportação (antes ficava órfão).
        const themeRaw = formData.get("theme") as string | null;
        const theme = themeRaw && (VALID_THEMES as readonly string[]).includes(themeRaw) ? themeRaw : undefined;

        // Idioma — só grava se enviado e válido.
        const languageRaw = formData.get("language") as string | null;
        const language = languageRaw && (VALID_LANGUAGES as readonly string[]).includes(languageRaw) ? languageRaw : undefined;

        // Horário de trabalho (usado na Agenda/Dashboard). Valida formato HH:MM.
        const workStartRaw = formData.get("workStart") as string | null;
        const workEndRaw = formData.get("workEnd") as string | null;
        const workStart = workStartRaw && HHMM_RE.test(workStartRaw) ? workStartRaw : undefined;
        const workEnd = workEndRaw && HHMM_RE.test(workEndRaw) ? workEndRaw : undefined;

        const userId = await requireUserId();

        await prisma.user.update({
            where: { id: userId },
            data: { name, email, bio, avatarUrl, coverUrl }
        });

        // Monta só os campos efetivamente enviados (undefined = não mexe).
        const settingsData = {
            accentColor,
            ...(currency ? { currency } : {}),
            ...(theme ? { theme } : {}),
            ...(language ? { language } : {}),
            ...(workStart ? { workStart } : {}),
            ...(workEnd ? { workEnd } : {}),
            ...(pixKey !== undefined ? { pixKey } : {}),
            ...(businessName !== undefined ? { businessName } : {}),
        };

        await prisma.settings.upsert({
            where: { userId },
            update: settingsData,
            create: { userId, ...settingsData }
        });

        revalidatePath("/settings");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Erro ao salvar configurações de perfil:", error);
        return { success: false, message: "Erro ao salvar no banco de dados." };
    }
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
        const brapiToken = formData.get("brapiToken") as string;

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
            brapiToken: encryptKey(brapiToken),
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
