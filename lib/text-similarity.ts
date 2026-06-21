// Similaridade de texto para o MODO ESCRITA dos flashcards: o usuário digita a
// resposta e mostramos uma DICA ("perto" / "diferente") comparando com o verso.
// É só um auxílio visual — quem dá a nota final (SRS) é o usuário, porque
// respostas longas não têm como ser corrigidas automaticamente com confiança.

/** Minúsculas, sem acento e sem pontuação — para comparar "ideia", não digitação. */
export function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Distância de Levenshtein (edições) entre duas strings. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/** Fração de palavras da resposta que aparecem no que foi digitado (0..1). */
function tokenOverlap(typed: string, answer: string): number {
  const a = new Set(typed.split(" ").filter(Boolean));
  const b = answer.split(" ").filter(Boolean);
  if (!b.length) return 0;
  let hit = 0;
  for (const w of b) if (a.has(w)) hit++;
  return hit / b.length;
}

/**
 * 0..1 de quão perto o texto digitado está da resposta. Combina similaridade de
 * caracteres (bom p/ respostas curtas) com sobreposição de palavras (bom p/
 * respostas longas, onde acertar os termos-chave já conta).
 */
export function similarityRatio(typed: string, answer: string): number {
  const x = normalizeForCompare(typed);
  const y = normalizeForCompare(answer);
  if (!x && !y) return 1;
  if (!x || !y) return 0;
  const charRatio = 1 - levenshtein(x, y) / Math.max(x.length, y.length);
  return Math.max(charRatio, tokenOverlap(x, y));
}

export type MatchLevel = "match" | "close" | "off";

/** Nível para a dica visual. Limiares conservadores (é só sugestão). */
export function matchLevel(typed: string, answer: string): MatchLevel {
  const r = similarityRatio(typed, answer);
  if (r >= 0.85) return "match";
  if (r >= 0.5) return "close";
  return "off";
}
