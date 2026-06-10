// Acesso à web da IA (#11 do roadmap) — OPT-IN explícito nas Configurações
// (Settings.aiWebAccess, desligado por padrão: filosofia local-first).
//
// - read_url: fetch + extração crua de texto (sem dependências).
// - web_search: Tavily ou Brave (tiers grátis) via variável de ambiente;
//   sem chave, devolve instrução clara em vez de quebrar.

import { prisma } from "@/lib/prisma";

const FETCH_TIMEOUT_MS = 8000;
const MAX_PAGE_CHARS = 4000;

export async function isWebEnabled(userId: string): Promise<boolean> {
  const s = await prisma.settings.findUnique({ where: { userId }, select: { aiWebAccess: true } });
  return s?.aiWebAccess ?? false;
}

export const WEB_DISABLED_MSG =
  "Acesso à web está DESATIVADO (privacidade em primeiro lugar). O usuário pode ativá-lo em Configurações → Inteligência Artificial → Acesso à web. Não tente de novo nesta conversa; responda com o que você sabe e avise como ativar.";

/** Remove tags/scripts e devolve texto legível e compacto de um HTML. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>(?=.)/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

export async function readUrl(rawUrl: string): Promise<Record<string, unknown>> {
  const url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) return { erro: "Informe uma URL http(s) válida." };

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (LifeOS-AI; leitura solicitada pelo usuário)" },
      redirect: "follow",
    });
    if (!res.ok) return { erro: `A página respondeu ${res.status}.`, url };

    const type = res.headers.get("content-type") ?? "";
    const body = await res.text();
    const text = type.includes("html") ? htmlToText(body) : body.trim();
    return {
      url,
      truncado: text.length > MAX_PAGE_CHARS,
      conteudo: text.slice(0, MAX_PAGE_CHARS),
    };
  } catch {
    return { erro: "Não consegui acessar a página (tempo esgotado ou bloqueio).", url };
  }
}

interface TavilyResult { title?: string; url?: string; content?: string }
interface BraveResult { title?: string; url?: string; description?: string }

export async function webSearch(query: string): Promise<Record<string, unknown>> {
  const q = query.trim();
  if (!q) return { erro: "Informe o que buscar." };

  const tavilyKey = process.env.TAVILY_API_KEY;
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;

  try {
    if (tavilyKey) {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: tavilyKey, query: q, max_results: 5, include_answer: true }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) return { erro: `Busca falhou (${res.status}).` };
      const data = (await res.json()) as { answer?: string; results?: TavilyResult[] };
      return {
        resposta_direta: data.answer ?? null,
        resultados: (data.results ?? []).slice(0, 5).map((r) => ({ titulo: r.title, url: r.url, trecho: r.content?.slice(0, 300) })),
      };
    }
    if (braveKey) {
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5`, {
        headers: { "X-Subscription-Token": braveKey, Accept: "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) return { erro: `Busca falhou (${res.status}).` };
      const data = (await res.json()) as { web?: { results?: BraveResult[] } };
      return {
        resultados: (data.web?.results ?? []).slice(0, 5).map((r) => ({ titulo: r.title, url: r.url, trecho: r.description?.slice(0, 300) })),
      };
    }
    return {
      erro: "Nenhum provedor de busca configurado. Defina TAVILY_API_KEY ou BRAVE_SEARCH_API_KEY no .env (ambos têm tier grátis). A leitura direta de URLs (read_url) funciona sem chave.",
    };
  } catch {
    return { erro: "A busca na web falhou (rede/tempo esgotado)." };
  }
}
