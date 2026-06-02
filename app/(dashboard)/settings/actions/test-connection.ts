"use server";

import { requireUserId } from "@/lib/auth";

// ============================================================================
// TESTE DE CONEXÃO (IA + INTEGRAÇÕES)
// ----------------------------------------------------------------------------
// Faz uma chamada leve e real à API do provedor para validar a credencial,
// em vez de apenas checar o tamanho da string. Sempre escopado a um usuário
// autenticado e com timeout para não travar a UI.
// ============================================================================

type TestConnectionInput = {
  type: string;          // "openai" | "groq" | "google" | "deepseek" | "mistral" | "ollama" | "tmdb" | "rawg" | "pluggy"
  key?: string;          // chave / client id
  secret?: string;       // usado apenas pelo Pluggy (client secret)
};

type TestConnectionResult = {
  success: boolean;
  message: string;
};

// fetch com timeout (evita travar a UI se a API estiver fora do ar)
async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(id);
  }
}

export async function testApiConnection(input: TestConnectionInput): Promise<TestConnectionResult> {
  await requireUserId();

  const type = input.type;
  const key = (input.key || "").trim();
  const secret = (input.secret || "").trim();

  // Ollama é local e não exige chave
  if (type !== "ollama" && type !== "pluggy" && !key) {
    return { success: false, message: "Informe a chave antes de testar." };
  }

  try {
    switch (type) {
      // -------------------- IA --------------------
      case "openai": {
        const r = await fetchWithTimeout("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        return r.ok
          ? { success: true, message: "Conexão com OpenAI validada." }
          : { success: false, message: r.status === 401 ? "Chave OpenAI inválida." : `OpenAI respondeu ${r.status}.` };
      }
      case "groq": {
        const r = await fetchWithTimeout("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        return r.ok
          ? { success: true, message: "Conexão com Groq validada." }
          : { success: false, message: r.status === 401 ? "Chave Groq inválida." : `Groq respondeu ${r.status}.` };
      }
      case "deepseek": {
        const r = await fetchWithTimeout("https://api.deepseek.com/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        return r.ok
          ? { success: true, message: "Conexão com DeepSeek validada." }
          : { success: false, message: r.status === 401 ? "Chave DeepSeek inválida." : `DeepSeek respondeu ${r.status}.` };
      }
      case "mistral": {
        const r = await fetchWithTimeout("https://api.mistral.ai/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        return r.ok
          ? { success: true, message: "Conexão com Mistral validada." }
          : { success: false, message: r.status === 401 ? "Chave Mistral inválida." : `Mistral respondeu ${r.status}.` };
      }
      case "google": {
        const r = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
        );
        return r.ok
          ? { success: true, message: "Conexão com Gemini validada." }
          : { success: false, message: r.status === 400 || r.status === 403 ? "Chave Gemini inválida." : `Gemini respondeu ${r.status}.` };
      }
      case "ollama": {
        const r = await fetchWithTimeout("http://localhost:11434/api/tags", {}, 4000);
        return r.ok
          ? { success: true, message: "Ollama está rodando localmente." }
          : { success: false, message: "Ollama respondeu, mas com erro." };
      }

      // -------------------- INTEGRAÇÕES --------------------
      case "tmdb": {
        const r = await fetchWithTimeout(
          `https://api.themoviedb.org/3/authentication?api_key=${encodeURIComponent(key)}`
        );
        return r.ok
          ? { success: true, message: "Chave TMDB válida." }
          : { success: false, message: r.status === 401 ? "Chave TMDB inválida." : `TMDB respondeu ${r.status}.` };
      }
      case "rawg": {
        const r = await fetchWithTimeout(
          `https://api.rawg.io/api/platforms?key=${encodeURIComponent(key)}&page_size=1`
        );
        return r.ok
          ? { success: true, message: "Chave RAWG válida." }
          : { success: false, message: r.status === 401 ? "Chave RAWG inválida." : `RAWG respondeu ${r.status}.` };
      }
      case "googlebooks": {
        const r = await fetchWithTimeout(
          `https://www.googleapis.com/books/v1/volumes?q=test&maxResults=1&country=BR&key=${encodeURIComponent(key)}`
        );
        return r.ok
          ? { success: true, message: "Chave Google Books válida." }
          : { success: false, message: r.status === 400 || r.status === 403 ? "Chave Google Books inválida." : `Google Books respondeu ${r.status}.` };
      }
      case "pluggy": {
        if (!key || !secret) {
          return { success: false, message: "Pluggy exige Client ID e Client Secret." };
        }
        const r = await fetchWithTimeout("https://api.pluggy.ai/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: key, clientSecret: secret }),
        });
        return r.ok
          ? { success: true, message: "Credenciais Pluggy válidas." }
          : { success: false, message: r.status === 401 || r.status === 403 ? "Credenciais Pluggy inválidas." : `Pluggy respondeu ${r.status}.` };
      }

      default:
        return { success: false, message: "Teste não disponível para este serviço." };
    }
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    if (type === "ollama") {
      return { success: false, message: "Ollama não está acessível em localhost:11434." };
    }
    return {
      success: false,
      message: aborted ? "Tempo de conexão esgotado." : "Falha de rede ao testar a conexão.",
    };
  }
}
