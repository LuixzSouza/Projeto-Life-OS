// Notas Atômicas (#9, Fase 2): heurística PURA (roda no client a cada tecla)
// que avalia se uma nota carrega UMA ideia com título descritivo — o princípio
// Zettelkasten. Não bloqueia nada: só dá o empurrão na direção certa.

export type AtomicityLevel = "atomic" | "ok" | "dense";

export interface AtomicityReport {
  level: AtomicityLevel;
  words: number;
  /** Sugestões acionáveis (vazio quando está tudo bem). */
  hints: string[];
}

const GENERIC_TITLES = /^(nova nota|nota r[áa]pida|sem t[íi]tulo|anota[çc][ãa]o|teste|nota \d*)$/i;

/** Notas que são longas POR DESIGN e não devem receber o sermão da atomicidade. */
export function isAtomicityExempt(title: string): boolean {
  return title.startsWith("Diário — ") || title.startsWith("🗺️");
}

export function assessAtomicity(title: string, content: string): AtomicityReport {
  const cleanTitle = title.trim();
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const headings = (content.match(/^#{1,3}\s/gm) ?? []).length;
  const hints: string[] = [];

  if (!cleanTitle || GENERIC_TITLES.test(cleanTitle)) {
    hints.push("Título genérico — descreva a ideia única da nota (ex.: \"Espaçamento vence maratona de estudo\").");
  } else if (cleanTitle.length < 12 && words > 80) {
    hints.push("Título curto para o tamanho do texto — dá pra dizer a ideia central nele?");
  }

  let level: AtomicityLevel = "ok";
  if (words > 800 || (headings >= 4 && words > 400)) {
    level = "dense";
    hints.push(
      `Nota densa (${words} palavras${headings >= 4 ? `, ${headings} seções` : ""}) — considere dividir em notas atômicas e ligá-las num Mapa de Conteúdo.`,
    );
  } else if (words > 0 && words <= 350 && hints.length === 0) {
    level = "atomic";
  }

  return { level, words, hints };
}
