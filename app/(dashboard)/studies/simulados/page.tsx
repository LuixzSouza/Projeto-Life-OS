// Conteudo autenticado por-usuario: render por requisicao (nunca prerender no build).
export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { Timer, ListChecks } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { parseQuestionIds } from "@/lib/exam-shared";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { ExamCenter, type ExamRow } from "@/components/studies/exam-center";

export const metadata: Metadata = {
  title: "Simulados | Life OS",
  description: "Provas cronometradas a partir do seu banco de questões, com nota estilo ENEM.",
};

export default async function SimuladosPage() {
  let exams: ExamRow[] = [];
  let subjects: { id: string; title: string }[] = [];
  let poolCount = 0;

  try {
    const userId = await getCurrentUserId();

    const [examsData, subjectsData, poolCountData] = await Promise.all([
      prisma.exam.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true, title: true, description: true, area: true,
          durationMinutes: true, questionIds: true,
          // DateTime dentro de findMany é seguro (o problema do adapter libSQL é
          // só em agregação — ver [[libsql-datetime-aggregate]]).
          attempts: {
            orderBy: { startedAt: "desc" },
            take: 10,
            select: {
              id: true, score: true, correctCount: true, totalCount: true,
              secondsSpent: true, finishedAt: true,
            },
          },
        },
      }),
      prisma.studySubject.findMany({
        where: { userId },
        orderBy: { title: "asc" },
        select: { id: true, title: true },
      }),
      prisma.question.count({ where: { userId } }),
    ]);

    exams = examsData.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      area: e.area,
      durationMinutes: e.durationMinutes,
      questionCount: parseQuestionIds(e.questionIds).length,
      attempts: e.attempts,
    }));
    subjects = subjectsData;
    poolCount = poolCountData;
  } catch (err) {
    console.error("[SimuladosPage] erro ao carregar simulados:", err);
  }

  return (
    <PageShell>
      <PageHeader
        icon={<Timer className="h-6 w-6" />}
        title="Simulados"
        description="Prova cronometrada com nota 0–1000 estilo ENEM e gabarito comentado."
        backHref="/studies"
        backLabel="Voltar para Estudos"
        actions={
          <Link href="/studies/questoes">
            <Button variant="outline" className="gap-2">
              <ListChecks className="h-4 w-4" /> Banco de questões
            </Button>
          </Link>
        }
      />
      <PageContainer>
        <ExamCenter exams={exams} subjects={subjects} poolCount={poolCount} />
      </PageContainer>
    </PageShell>
  );
}
