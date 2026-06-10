// Roteadores da IA (#27 privacidade · #28 custo) — classificador BARATO
// (regex/heurística, sem IA) que decide ONDE cada pergunta roda:
// - sensível → Ollama local (se disponível): o assunto nunca sai da máquina;
// - trivial → modelo mais barato do MESMO provedor: economia silenciosa.
// Ambos OPT-IN nas Configurações (aiPrivacyRouting / aiCostRouting).

const SENSITIVE_RE =
  /\b(senha|senhas|cofre|vault|credencia\w*|token|api.?key|pix|cart(ão|ao|oes|ões)|cvv|extrato|sal[áa]rio|d[íi]vida\w*|empr[ée]stimo|terapia|terapeuta|ansiedade|depress[ãa]o|rem[ée]dio\w*|medicamento\w*|diagn[óo]stico\w*|exame\w*|sexo|sexual|[íi]ntim\w*)\b/i;

const TRIVIAL_RE =
  /^(oi+|ol[áa]+|e[ai]+|opa+|hey|bom dia|boa tarde|boa noite|valeu|vlw|obrigad[oa]+|brigad[oa]+|ok+|okay|blz|beleza|show|top|legal|entendi|t[áa] bom|tudo bem\??|como vai\??|kk+|haha+|👍|🙏|❤️|tchau|at[ée] mais|boa)\s*[!.?…]*$/i;

/** Assunto sensível? (cofre, saúde íntima, finanças detalhadas) */
export function isSensitiveMessage(text: string): boolean {
  return SENSITIVE_RE.test(text);
}

/** Mensagem trivial (saudação/agradecimento curto), sem necessidade de modelo caro? */
export function isTrivialMessage(text: string): boolean {
  const clean = text.trim();
  return clean.length <= 40 && TRIVIAL_RE.test(clean);
}

// Modelo "econômico" equivalente por provedor (mantém o MESMO provedor/chave).
const CHEAP_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5-20251001",
  google: "gemini-2.5-flash-lite",
  groq: "llama-3.1-8b-instant",
  deepseek: "deepseek-chat",
  mistral: "mistral-small-latest",
  xai: "grok-3-mini",
  openrouter: "openai/gpt-4o-mini",
};

/** Modelo barato do provedor (ou o atual, se já for/não houver mapeamento). */
export function cheapModelFor(provider: string, currentModel: string): string {
  const cheap = CHEAP_MODELS[provider];
  if (!cheap || cheap === currentModel) return currentModel;
  return cheap;
}

/** O Ollama local está de pé? (ping rápido — nunca trava o chat) */
export async function isOllamaAlive(): Promise<boolean> {
  const base = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(1200) });
    return res.ok;
  } catch {
    return false;
  }
}
