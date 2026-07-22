// Conteudo autenticado por-usuario: render por requisicao (nunca prerender no build).
export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { ListChecks, Timer } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { QuestionBank } from "@/components/studies/question-bank";
import type { QuestionRow } from "@/components/studies/question-helpers";

export const metadata: Metadata = {
  title: "Banco de Questões | Life OS",
  description: "Suas questões objetivas por área e matéria, com gabarito e resolução comentada.",
};

export default async function QuestoesPage() {
  let questions: QuestionRow[] = [];
  let subjects: { id: string; title: string }[] = [];

  try {
    const userId = await getCurrentUserId();

    // Sem DateTime no select (seguro no adapter libSQL) e sem over-fetch: a lista
    // precisa do enunciado e das alternativas, nada além disso.
    const [questionsData, subjectsData] = await Promise.all([
      prisma.question.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, statement: true, explanation: true, area: true, difficulty: true,
          source: true, subjectId: true, timesAnswered: true, timesCorrect: true,
          options: { select: { id: true, text: true, isCorrect: true, position: true } },
        },
      }),
      prisma.studySubject.findMany({
        where: { userId },
        orderBy: { title: "asc" },
        select: { id: true, title: true },
      }),
    ]);

    questions = questionsData;
    subjects = subjectsData;
  } catch (err) {
    console.error("[QuestoesPage] erro ao carregar questões:", err);
  }

  return (
    <PageShell>
      <PageHeader
        icon={<ListChecks className="h-6 w-6" />}
        title="Banco de Questões"
        description="Escreva (ou gere) questões com gabarito e explicação. Elas viram simulados cronometrados."
        backHref="/studies"
        backLabel="Voltar para Estudos"
        actions={
          <Link href="/studies/simulados">
            <Button variant="outline" className="gap-2">
              <Timer className="h-4 w-4" /> Simulados
            </Button>
          </Link>
        }
      />
      <PageContainer>
        <QuestionBank questions={questions} subjects={subjects} />
      </PageContainer>
    </PageShell>
  );
}
