"use server";

// BANCO DE QUESTÕES (F1 do ESTUDOS_ROADMAP) — questões objetivas do próprio
// aluno, por área do ENEM e por matéria, com gabarito e resolução comentada.
// É a matéria-prima dos Simulados (F2) e o destino natural de uma nota que
// virou pergunta ("nota → card → questão → simulado" — [[connected-by-design]]).

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { coerceEnum, QUESTION_AREAS, type QuestionArea } from "@/lib/enums";
import { getAiCallConfig, runOneShotAi } from "@/app/(dashboard)/ai/actions/oneshot";
import type { ActionResult } from "@/types/action-result";

export interface QuestionOptionInput {
  text: string;
  isCorrect: boolean;
}

export interface QuestionInput {
  statement: string;
  explanation?: string | null;
  area?: string | null;
  difficulty?: number | null;
  source?: string | null;
  subjectId?: string | null;
  options: QuestionOptionInput[];
}

const MAX_OPTIONS = 6;
const MIN_OPTIONS = 2;

function clampDifficulty(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(5, Math.round(n)));
}

/** Questão já validada: os campos obrigatórios deixaram de ser opcionais. */
interface NormalizedQuestion {
  statement: string;
  explanation: string | null;
  area: QuestionArea;
  difficulty: number;
  source: string | null;
  subjectId: string | null;
  options: QuestionOptionInput[];
}

/**
 * Valida e normaliza a questão. Regra dura: alternativas suficientes e EXATAMENTE
 * uma correta — questão sem gabarito único não corrige simulado, só gera dúvida.
 */
function normalize(input: QuestionInput): { ok: true; data: NormalizedQuestion } | { ok: false; message: string } {
  const statement = (input.statement ?? "").trim();
  if (statement.length < 10) return { ok: false, message: "Escreva o enunciado da questão (mínimo 10 caracteres)." };

  const options = (input.options ?? [])
    .map((o) => ({ text: (o.text ?? "").trim(), isCorrect: !!o.isCorrect }))
    .filter((o) => o.text.length > 0)
    .slice(0, MAX_OPTIONS);

  if (options.length < MIN_OPTIONS) return { ok: false, message: "A questão precisa de pelo menos 2 alternativas." };

  const correct = options.filter((o) => o.isCorrect).length;
  if (correct === 0) return { ok: false, message: "Marque qual alternativa é a correta." };
  if (correct > 1) return { ok: false, message: "Marque apenas UMA alternativa como correta." };

  return {
    ok: true,
    data: {
      statement,
      explanation: (input.explanation ?? "").trim() || null,
      area: coerceEnum(input.area, QUESTION_AREAS, "OUTRA"),
      difficulty: clampDifficulty(input.difficulty),
      source: (input.source ?? "").trim() || null,
      subjectId: input.subjectId || null,
      options,
    },
  };
}

export async function createQuestion(input: QuestionInput): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const parsed = normalize(input);
    if (!parsed.ok) return { success: false, message: parsed.message };
    const d = parsed.data;

    await prisma.question.create({
      data: {
        statement: d.statement,
        explanation: d.explanation,
        area: d.area,
        difficulty: d.difficulty,
        source: d.source,
        subjectId: d.subjectId,
        userId,
        options: {
          create: d.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, position: i, userId })),
        },
      },
    });

    revalidatePath("/studies/questoes");
    return { success: true, message: "Questão adicionada ao banco." };
  } catch (error) {
    console.error("Erro ao criar questão:", error);
    return { success: false, message: "Erro ao salvar a questão." };
  }
}

export async function updateQuestion(id: string, input: QuestionInput): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const parsed = normalize(input);
    if (!parsed.ok) return { success: false, message: parsed.message };
    const d = parsed.data;

    // Confere a posse ANTES de mexer nas alternativas (nunca editar de outro usuário).
    const owned = await prisma.question.findFirst({ where: { id, userId }, select: { id: true } });
    if (!owned) return { success: false, message: "Questão não encontrada." };

    // Alternativas são substituídas em bloco: é mais simples (e mais correto) do
    // que casar edições item a item, e o histórico de respostas guarda o TEXTO
    // escolhido na hora da prova, então nada fica órfão de sentido.
    await prisma.questionOption.deleteMany({ where: { questionId: id, userId } });
    await prisma.question.updateMany({
      where: { id, userId },
      data: {
        statement: d.statement,
        explanation: d.explanation,
        area: d.area,
        difficulty: d.difficulty,
        source: d.source,
        subjectId: d.subjectId,
      },
    });
    await prisma.questionOption.createMany({
      data: d.options.map((o, i) => ({ questionId: id, text: o.text, isCorrect: o.isCorrect, position: i, userId })),
    });

    revalidatePath("/studies/questoes");
    return { success: true, message: "Questão atualizada." };
  } catch (error) {
    console.error("Erro ao atualizar questão:", error);
    return { success: false, message: "Erro ao atualizar a questão." };
  }
}

export async function deleteQuestion(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const res = await prisma.question.deleteMany({ where: { id, userId } });
    if (res.count === 0) return { success: false, message: "Questão não encontrada." };
    revalidatePath("/studies/questoes");
    return { success: true, message: "Questão removida." };
  } catch (error) {
    console.error("Erro ao remover questão:", error);
    return { success: false, message: "Erro ao remover a questão." };
  }
}

/* ============================================================
   GERAÇÃO POR IA — o atalho que enche o banco sem digitação
   ============================================================ */

export interface GenerateQuestionsInput {
  topic: string;
  count?: number;
  area?: string | null;
  difficulty?: number | null;
  subjectId?: string | null;
  /** Texto-base opcional (uma nota, um resumo) para gerar em cima do conteúdo real. */
  sourceText?: string | null;
}

interface AiQuestion {
  enunciado?: unknown;
  alternativas?: unknown;
  correta?: unknown;
  explicacao?: unknown;
  dificuldade?: unknown;
}

function parseJsonBlock<T>(raw: string): T | null {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) return null;
  const open = cleaned[start];
  const close = open === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(close);
  if (end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

const SYSTEM = `Você é um professor brasileiro que elabora questões de múltipla escolha no estilo ENEM/vestibular.
Regras: enunciado contextualizado e autossuficiente; 5 alternativas plausíveis (distratores que representem erros comuns, nunca absurdos); EXATAMENTE uma correta; explicação curta dizendo por que a correta está certa.
Responda APENAS com JSON válido, em PT-BR, sem texto fora do JSON.`;

export async function generateQuestions(
  input: GenerateQuestionsInput,
): Promise<ActionResult & { created?: number }> {
  try {
    const userId = await requireUserId();
    const topic = (input.topic ?? "").trim();
    if (topic.length < 3) return { success: false, message: "Diga sobre qual assunto gerar as questões." };

    const count = Math.max(1, Math.min(10, Math.round(Number(input.count) || 5)));
    const area = coerceEnum(input.area, QUESTION_AREAS, "OUTRA") as QuestionArea;
    const difficulty = clampDifficulty(input.difficulty);

    const config = await getAiCallConfig(userId);
    if (!config.configured) {
      // Princípio do projeto: nada quebra sem IA — aqui a saída honesta é dizer
      // que a criação manual continua disponível (não inventar questão falsa).
      return { success: false, message: config.error || "Configure um provedor de IA em Configurações → Inteligência para gerar questões. Você pode criar manualmente enquanto isso." };
    }

    const base = (input.sourceText ?? "").trim().slice(0, 4000);
    const raw = await runOneShotAi(
      userId,
      SYSTEM,
      `Gere ${count} questões de múltipla escolha sobre: "${topic}".\n` +
        `Nível de dificuldade: ${difficulty} de 5.\n` +
        (base ? `Baseie-se NESTE conteúdo (não invente fora dele):\n"""${base}"""\n` : "") +
        `Responda só com este JSON:\n` +
        `{"questoes":[{"enunciado":"...","alternativas":["A","B","C","D","E"],"correta":<índice 0-4>,"explicacao":"...","dificuldade":<1-5>}]}`,
    );

    const parsed = raw ? parseJsonBlock<{ questoes?: AiQuestion[] }>(raw) : null;
    const list = Array.isArray(parsed?.questoes) ? parsed!.questoes! : [];
    if (list.length === 0) return { success: false, message: "A IA não retornou questões utilizáveis. Tente de novo ou crie manualmente." };

    let created = 0;
    for (const q of list.slice(0, count)) {
      const statement = typeof q.enunciado === "string" ? q.enunciado.trim() : "";
      const alts = Array.isArray(q.alternativas)
        ? q.alternativas.filter((a): a is string => typeof a === "string" && a.trim().length > 0).slice(0, MAX_OPTIONS)
        : [];
      const correctIndex = Number(q.correta);
      if (statement.length < 10 || alts.length < MIN_OPTIONS) continue;
      if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= alts.length) continue;

      await prisma.question.create({
        data: {
          statement,
          explanation: typeof q.explicacao === "string" ? q.explicacao.trim() : null,
          area,
          difficulty: clampDifficulty(q.dificuldade ?? difficulty),
          source: "Gerada por IA",
          subjectId: input.subjectId || null,
          userId,
          options: {
            create: alts.map((text, i) => ({ text: text.trim(), isCorrect: i === correctIndex, position: i, userId })),
          },
        },
      });
      created++;
    }

    if (created === 0) return { success: false, message: "As questões vieram fora do formato esperado. Tente novamente." };

    revalidatePath("/studies/questoes");
    return { success: true, message: `${created} ${created === 1 ? "questão gerada" : "questões geradas"} e salvas no banco.`, created };
  } catch (error) {
    console.error("Erro ao gerar questões:", error);
    return { success: false, message: "Erro ao gerar as questões." };
  }
}
