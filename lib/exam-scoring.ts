// ============================================================================
// CORREÇÃO DE SIMULADO — "TRI simplificada"
// ============================================================================
// Módulo PURO (sem Prisma, sem React): serve ao servidor na hora de corrigir e
// ao cliente na hora de explicar a nota. Mesma regra nos dois lados.
//
// Por que não só "acertos / total"? Porque o ENEM usa TRI, e a diferença que o
// aluno SENTE é esta: acertar questão difícil vale mais, e acertar as difíceis
// errando as fáceis derruba a nota (padrão típico de chute). Aqui isso vira
// duas contas honestas e explicáveis — nada de caixa-preta estatística:
//
//   1. Nota ponderada  = Σ(dificuldade dos acertos) / Σ(dificuldade de todas)
//   2. Coerência       = 1 − penalidade por "acertou difícil / errou fácil"
//   Nota final (0–1000) = 1000 × ponderada × coerência
//
// A coerência NUNCA zera a prova: o teto de desconto é 40%. É um ajuste forte o
// bastante para significar alguma coisa, mas ainda um ajuste — quem acertou as
// difíceis acertou de fato, e isso conta.
//
// HONESTIDADE: isto NÃO é a TRI do INEP (modelo logístico de 3 parâmetros que
// estima habilidade a partir do desempenho de milhares de candidatos). É uma
// aproximação pedagógica, com as duas contas visíveis acima. A UI diz isso ao
// aluno — prometer "nota do ENEM" seria mentira.

/** Peso mínimo/máximo de dificuldade aceitos (o schema usa 1..5). */
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;

/** Teto do desconto por incoerência: 40% da nota ponderada. */
export const MAX_INCOHERENCE_PENALTY = 0.4;

export interface ScoredItem {
  /** 1..5 — quanto mais difícil, mais o acerto vale. */
  difficulty: number;
  /** `null` = deixou em branco (conta como erro, mas sem "chute" na coerência). */
  correct: boolean | null;
}

export interface ExamScore {
  /** Acertos absolutos. */
  correctCount: number;
  /** Questões respondidas (não em branco). */
  answeredCount: number;
  /** Total de questões da prova. */
  totalCount: number;
  /** Percentual simples de acerto (0..100) — a conta "da escola". */
  rawPercent: number;
  /** Acerto ponderado pela dificuldade (0..1). */
  weighted: number;
  /** Fator de coerência do padrão de respostas (0.6..1). */
  coherence: number;
  /** Nota final estilo ENEM (0..1000). */
  score: number;
}

function clampDifficulty(d: number): number {
  if (!Number.isFinite(d)) return 3;
  return Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, Math.round(d)));
}

/**
 * Penalidade de incoerência: proporção de pares (questão FÁCIL errada, questão
 * DIFÍCIL acertada) sobre o total de pares possíveis. Em branco não entra —
 * quem pulou não chutou, e pular não é incoerência.
 */
function incoherenceRatio(items: ScoredItem[]): number {
  const answered = items.filter((i) => i.correct !== null);
  const rights = answered.filter((i) => i.correct === true);
  const wrongs = answered.filter((i) => i.correct === false);
  if (rights.length === 0 || wrongs.length === 0) return 0;

  let inversions = 0;
  for (const w of wrongs) {
    for (const r of rights) {
      // Errou uma MAIS FÁCIL do que uma que acertou → sinal de sorte/chute.
      if (clampDifficulty(w.difficulty) < clampDifficulty(r.difficulty)) inversions++;
    }
  }
  const maxPairs = rights.length * wrongs.length;
  return maxPairs > 0 ? inversions / maxPairs : 0;
}

export function scoreExam(items: ScoredItem[]): ExamScore {
  const totalCount = items.length;
  const correctCount = items.filter((i) => i.correct === true).length;
  const answeredCount = items.filter((i) => i.correct !== null).length;

  if (totalCount === 0) {
    return { correctCount: 0, answeredCount: 0, totalCount: 0, rawPercent: 0, weighted: 0, coherence: 1, score: 0 };
  }

  const totalWeight = items.reduce((s, i) => s + clampDifficulty(i.difficulty), 0);
  const earnedWeight = items.reduce((s, i) => s + (i.correct === true ? clampDifficulty(i.difficulty) : 0), 0);
  const weighted = totalWeight > 0 ? earnedWeight / totalWeight : 0;

  const coherence = 1 - MAX_INCOHERENCE_PENALTY * incoherenceRatio(items);
  const score = Math.round(1000 * weighted * coherence);

  return {
    correctCount,
    answeredCount,
    totalCount,
    rawPercent: Math.round((correctCount / totalCount) * 100),
    weighted,
    coherence,
    score,
  };
}

/** Faixa de desempenho — linguagem de aluno, não de estatístico. */
export function scoreBand(score: number): { label: string; tone: "low" | "mid" | "good" | "high" } {
  if (score >= 800) return { label: "Excelente", tone: "high" };
  if (score >= 600) return { label: "Bom", tone: "good" };
  if (score >= 400) return { label: "Regular", tone: "mid" };
  return { label: "Precisa treinar", tone: "low" };
}

/** Frase que explica a nota para quem não conhece TRI. */
export function explainScore(s: ExamScore): string {
  const parts = [
    `${s.correctCount} de ${s.totalCount} (${s.rawPercent}%)`,
    `acerto ponderado pela dificuldade: ${Math.round(s.weighted * 100)}%`,
  ];
  if (s.coherence < 0.999) {
    parts.push(
      `coerência ${Math.round(s.coherence * 100)}% — você errou questões mais fáceis do que outras que acertou, o que na TRI sugere chute`,
    );
  }
  return parts.join(" · ");
}
