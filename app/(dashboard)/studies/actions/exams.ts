"use server";

// SIMULADOS (F2 do ESTUDOS_ROADMAP) — monta uma prova a partir do banco de
// questões, cronometra, corrige e devolve a nota 0–1000 pela TRI simplificada
// (lib/exam-scoring.ts). Cada resposta também alimenta as estatísticas da
// questão, que é o que faz o modo "Meus erros" existir na próxima prova.

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { coerceEnum, QUESTION_AREAS } from "@/lib/enums";
import { scoreExam, type ScoredItem } from "@/lib/exam-scoring";
import { EXAM_STRATEGY_LABELS, isExamStrategy, parseQuestionIds, type ExamStrategy } from "@/lib/exam-shared";
import type { ActionResult } from "@/types/action-result";

export interface CreateExamInput {
  title?: string | null;
  area?: string | null;
  subjectId?: string | null;
  count?: number | null;
  durationMinutes?: number | null;
  strategy?: string | null;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function createExam(input: CreateExamInput): Promise<ActionResult & { examId?: string }> {
  try {
    const userId = await requireUserId();

    const count = Math.max(1, Math.min(90, Math.round(Number(input.count) || 10)));
    const durationMinutes = Math.max(0, Math.min(360, Math.round(Number(input.durationMinutes) || 0)));
    const strategy: ExamStrategy = isExamStrategy(input.strategy) ? input.strategy : "RANDOM";
    const area = input.area ? coerceEnum(input.area, QUESTION_AREAS, "OUTRA") : null;

    // Só colunas leves e SEM DateTime — seguro no adapter libSQL
    // (ver [[libsql-datetime-aggregate]]) e barato mesmo com banco grande.
    const pool = await prisma.question.findMany({
      where: {
        userId,
        ...(area ? { area } : {}),
        ...(input.subjectId ? { subjectId: input.subjectId } : {}),
      },
      select: { id: true, timesAnswered: true, timesCorrect: true },
    });

    if (pool.length === 0) {
      return { success: false, message: "Nenhuma questão no banco com esses filtros. Adicione questões antes de montar o simulado." };
    }

    let picked: string[];
    if (strategy === "WEAKEST") {
      // Pior aproveitamento primeiro; nunca respondida entra como "0.5" para não
      // dominar a prova inteira nem ficar de fora (o desconhecido é ambíguo).
      picked = [...pool]
        .map((q) => ({
          id: q.id,
          rate: q.timesAnswered > 0 ? q.timesCorrect / q.timesAnswered : 0.5,
          answered: q.timesAnswered,
        }))
        .sort((a, b) => a.rate - b.rate || b.answered - a.answered)
        .slice(0, count)
        .map((q) => q.id);
    } else if (strategy === "UNSEEN") {
      const unseen = pool.filter((q) => q.timesAnswered === 0);
      // Se as inéditas não bastam, completa com o sorteio do resto — melhor uma
      // prova cheia do que uma prova pela metade por purismo.
      picked = shuffle(unseen).slice(0, count).map((q) => q.id);
      if (picked.length < count) {
        const rest = shuffle(pool.filter((q) => !picked.includes(q.id))).slice(0, count - picked.length);
        picked = [...picked, ...rest.map((q) => q.id)];
      }
    } else {
      picked = shuffle(pool).slice(0, count).map((q) => q.id);
    }

    const title = (input.title ?? "").trim() || `Simulado · ${picked.length} questões`;

    const exam = await prisma.exam.create({
      data: {
        title,
        description: EXAM_STRATEGY_LABELS[strategy].label,
        area,
        durationMinutes,
        questionIds: JSON.stringify(picked),
        userId,
      },
      select: { id: true },
    });

    revalidatePath("/studies/simulados");
    return { success: true, message: `Simulado montado com ${picked.length} questões.`, examId: exam.id };
  } catch (error) {
    console.error("Erro ao montar simulado:", error);
    return { success: false, message: "Erro ao montar o simulado." };
  }
}

export async function deleteExam(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const res = await prisma.exam.deleteMany({ where: { id, userId } });
    if (res.count === 0) return { success: false, message: "Simulado não encontrado." };
    revalidatePath("/studies/simulados");
    return { success: true, message: "Simulado removido." };
  } catch (error) {
    console.error("Erro ao remover simulado:", error);
    return { success: false, message: "Erro ao remover o simulado." };
  }
}

/* ============================================================
   TENTATIVA: começar → responder → corrigir
   ============================================================ */

export async function startAttempt(examId: string): Promise<ActionResult & { attemptId?: string }> {
  try {
    const userId = await requireUserId();
    const exam = await prisma.exam.findFirst({ where: { id: examId, userId }, select: { id: true, questionIds: true } });
    if (!exam) return { success: false, message: "Simulado não encontrado." };

    const ids = parseQuestionIds(exam.questionIds);
    const attempt = await prisma.examAttempt.create({
      data: { examId, totalCount: ids.length, userId },
      select: { id: true },
    });

    return { success: true, message: "Boa prova!", attemptId: attempt.id };
  } catch (error) {
    console.error("Erro ao iniciar simulado:", error);
    return { success: false, message: "Erro ao iniciar o simulado." };
  }
}

export interface SubmitAttemptInput {
  attemptId: string;
  /** { [questionId]: optionId | null } — null/ausente = deixou em branco. */
  answers: Record<string, string | null>;
  secondsSpent?: number;
}

export interface AttemptResult {
  score: number;
  correctCount: number;
  totalCount: number;
  rawPercent: number;
  coherence: number;
}

export async function submitAttempt(input: SubmitAttemptInput): Promise<ActionResult & { result?: AttemptResult }> {
  try {
    const userId = await requireUserId();

    const attempt = await prisma.examAttempt.findFirst({
      where: { id: input.attemptId, userId },
      select: { id: true, examId: true, finishedAt: true },
    });
    if (!attempt) return { success: false, message: "Tentativa não encontrada." };
    if (attempt.finishedAt) return { success: false, message: "Este simulado já foi corrigido." };

    const exam = await prisma.exam.findFirst({
      where: { id: attempt.examId, userId },
      select: { questionIds: true },
    });
    const ids = exam ? parseQuestionIds(exam.questionIds) : [];

    // Gabarito no SERVIDOR: o cliente nunca recebe `isCorrect` durante a prova,
    // então a correção não tem como ser burlada pelo DevTools.
    const questions = await prisma.question.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true, difficulty: true, options: { select: { id: true, isCorrect: true } } },
    });

    const byId = new Map(questions.map((q) => [q.id, q]));
    const items: ScoredItem[] = [];
    const correctIds: string[] = [];
    const wrongIds: string[] = [];

    for (const qid of ids) {
      const q = byId.get(qid);
      if (!q) continue;
      const chosen = input.answers?.[qid] ?? null;
      if (!chosen) {
        items.push({ difficulty: q.difficulty, correct: null });
        continue;
      }
      const isCorrect = q.options.some((o) => o.id === chosen && o.isCorrect);
      items.push({ difficulty: q.difficulty, correct: isCorrect });
      (isCorrect ? correctIds : wrongIds).push(qid);
    }

    const scored = scoreExam(items);
    const secondsSpent = Math.max(0, Math.min(60 * 60 * 12, Math.round(Number(input.secondsSpent) || 0)));

    await prisma.examAttempt.updateMany({
      where: { id: attempt.id, userId },
      data: {
        answers: JSON.stringify(input.answers ?? {}),
        correctCount: scored.correctCount,
        totalCount: scored.totalCount,
        score: scored.score,
        secondsSpent,
        finishedAt: new Date(),
      },
    });

    // Estatísticas da questão em DOIS updates (acertos e erros), não N — é o que
    // alimenta a estratégia "Meus erros" na próxima montagem.
    if (correctIds.length > 0) {
      await prisma.question.updateMany({
        where: { id: { in: correctIds }, userId },
        data: { timesAnswered: { increment: 1 }, timesCorrect: { increment: 1 } },
      });
    }
    if (wrongIds.length > 0) {
      await prisma.question.updateMany({
        where: { id: { in: wrongIds }, userId },
        data: { timesAnswered: { increment: 1 } },
      });
    }

    revalidatePath("/studies/simulados");
    return {
      success: true,
      message: `Prova corrigida: ${scored.score}/1000.`,
      result: {
        score: scored.score,
        correctCount: scored.correctCount,
        totalCount: scored.totalCount,
        rawPercent: scored.rawPercent,
        coherence: scored.coherence,
      },
    };
  } catch (error) {
    console.error("Erro ao corrigir simulado:", error);
    return { success: false, message: "Erro ao corrigir o simulado." };
  }
}
