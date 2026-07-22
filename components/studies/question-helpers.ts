// Vocabulário visual do Banco de Questões e dos Simulados — cores, rótulos e as
// contas de aproveitamento. Fica separado para que a lista, o formulário e a
// tela de resultado falem exatamente a mesma língua.

import { QUESTION_AREA_LABELS, type QuestionArea } from "@/lib/enums";

export interface QuestionOptionRow {
  id: string;
  text: string;
  isCorrect: boolean;
  position: number;
}

export interface QuestionRow {
  id: string;
  statement: string;
  explanation: string | null;
  area: string;
  difficulty: number;
  source: string | null;
  subjectId: string | null;
  timesAnswered: number;
  timesCorrect: number;
  options: QuestionOptionRow[];
}

/** Letra da alternativa (A, B, C…) — o aluno pensa em letra, não em índice. */
export function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function areaLabel(area: string): string {
  return QUESTION_AREA_LABELS[area as QuestionArea] ?? QUESTION_AREA_LABELS.OUTRA;
}

/** Badge suave por área (padrão do design system: fundo /10 + texto forte). */
export function areaBadgeClass(area: string): string {
  switch (area) {
    case "LINGUAGENS":
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400";
    case "HUMANAS":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "NATUREZA":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "MATEMATICA":
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Muito fácil",
  2: "Fácil",
  3: "Média",
  4: "Difícil",
  5: "Muito difícil",
};

export function difficultyLabel(d: number): string {
  return DIFFICULTY_LABELS[Math.max(1, Math.min(5, Math.round(d)))] ?? "Média";
}

/** Aproveitamento em %, ou `null` quando a questão nunca foi respondida. */
export function accuracy(q: Pick<QuestionRow, "timesAnswered" | "timesCorrect">): number | null {
  if (q.timesAnswered <= 0) return null;
  return Math.round((q.timesCorrect / q.timesAnswered) * 100);
}

/** Cor do aproveitamento: vermelho é convite para revisar, não repreensão. */
export function accuracyClass(pct: number): string {
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}
