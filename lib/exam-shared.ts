// Vocabulário compartilhado dos Simulados (servidor + cliente). Fica FORA do
// arquivo de server actions porque um módulo "use server" só pode exportar
// funções async — constantes e parsers precisam morar aqui.

/** Estratégias de montagem — o "por que estas questões e não outras". */
export const EXAM_STRATEGIES = ["RANDOM", "WEAKEST", "UNSEEN"] as const;
export type ExamStrategy = (typeof EXAM_STRATEGIES)[number];

export const EXAM_STRATEGY_LABELS: Record<ExamStrategy, { label: string; hint: string }> = {
  RANDOM: { label: "Sorteio", hint: "Mistura o banco inteiro — simula a imprevisibilidade da prova." },
  WEAKEST: { label: "Meus erros", hint: "Prioriza o que você mais errou. É aqui que a nota sobe." },
  UNSEEN: { label: "Inéditas", hint: "Só o que você ainda não respondeu — mede sem viés de memória." },
};

export function isExamStrategy(value: unknown): value is ExamStrategy {
  return typeof value === "string" && (EXAM_STRATEGIES as readonly string[]).includes(value);
}

/** Lê o JSON de `Exam.questionIds` sem nunca lançar (prova corrompida ≠ app quebrado). */
export function parseQuestionIds(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Lê o JSON de `ExamAttempt.answers` ({ questionId: optionId | null }). */
export function parseAnswers(json: string | null | undefined): Record<string, string | null> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      out[k] = typeof v === "string" ? v : null;
    }
    return out;
  } catch {
    return {};
  }
}

/** Cronômetro em MM:SS (ou H:MM:SS quando passa de uma hora). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
