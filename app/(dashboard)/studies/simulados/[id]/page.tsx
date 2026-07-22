// Conteudo autenticado por-usuario: render por requisicao (nunca prerender no build).
export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Timer } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { parseQuestionIds } from "@/lib/exam-shared";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { ExamRunner, type RunnerQuestion } from "@/components/studies/exam-runner";

export const metadata: Metadata = {
  title: "Simulado | Life OS",
  description: "Prova cronometrada com correção estilo TRI.",
};

export default async function SimuladoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const exam = await prisma.exam.findFirst({
    where: { id, userId },
    select: { id: true, title: true, durationMinutes: true, questionIds: true },
  });
  if (!exam) notFound();

  const ids = parseQuestionIds(exam.questionIds);

  // O gabarito (`isCorrect`) e a explicação ficam DE FORA de propósito: durante
  // a prova o cliente não pode ter a resposta em lugar nenhum.
  const rows = await prisma.question.findMany({
    where: { id: { in: ids }, userId },
    select: {
      id: true, statement: true, area: true, difficulty: true,
      options: { select: { id: true, text: true, position: true } },
    },
  });

  // Respeita a ORDEM sorteada na montagem (o `in` do banco não garante ordem).
  const byId = new Map(rows.map((q) => [q.id, q]));
  const questions: RunnerQuestion[] = ids
    .map((qid) => byId.get(qid))
    .filter((q): q is (typeof rows)[number] => !!q)
    .map((q) => ({
      id: q.id,
      statement: q.statement,
      area: q.area,
      difficulty: q.difficulty,
      options: [...q.options].sort((a, b) => a.position - b.position).map((o) => ({ id: o.id, text: o.text })),
    }));

  return (
    <PageShell>
      <PageHeader
        icon={<Timer className="h-6 w-6" />}
        title={exam.title}
        description="Foco total: responda, navegue e entregue. A correção vem logo depois."
        backHref="/studies/simulados"
        backLabel="Voltar para Simulados"
      />
      <PageContainer>
        <ExamRunner
          examId={exam.id}
          title={exam.title}
          durationMinutes={exam.durationMinutes}
          questions={questions}
        />
      </PageContainer>
    </PageShell>
  );
}
