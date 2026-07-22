// Conteudo autenticado por-usuario: render por requisicao (nunca prerender no build).
export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, CheckCircle2, XCircle, MinusCircle, RotateCcw, ListChecks } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { parseAnswers, parseQuestionIds, formatDuration } from "@/lib/exam-shared";
import { scoreBand } from "@/lib/exam-scoring";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { areaBadgeClass, areaLabel, difficultyLabel, optionLetter } from "@/components/studies/question-helpers";

export const metadata: Metadata = {
  title: "Resultado do Simulado | Life OS",
  description: "Sua nota, questão por questão, com o gabarito comentado.",
};

const TONE_CLASS = {
  high: "text-emerald-600 dark:text-emerald-400",
  good: "text-sky-600 dark:text-sky-400",
  mid: "text-amber-600 dark:text-amber-400",
  low: "text-red-600 dark:text-red-400",
} as const;

export default async function ResultadoPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = await params;
  const userId = await getCurrentUserId();

  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, examId: id, userId },
    select: {
      id: true, answers: true, correctCount: true, totalCount: true,
      score: true, secondsSpent: true, finishedAt: true,
    },
  });
  if (!attempt) notFound();

  const exam = await prisma.exam.findFirst({
    where: { id, userId },
    select: { id: true, title: true, questionIds: true },
  });
  if (!exam) notFound();

  const ids = parseQuestionIds(exam.questionIds);
  const answers = parseAnswers(attempt.answers);

  // Aqui o gabarito PODE vir: a prova acabou, e rever o porquê é metade do valor
  // de um simulado.
  const rows = await prisma.question.findMany({
    where: { id: { in: ids }, userId },
    select: {
      id: true, statement: true, explanation: true, area: true, difficulty: true,
      options: { select: { id: true, text: true, isCorrect: true, position: true } },
    },
  });
  const byId = new Map(rows.map((q) => [q.id, q]));
  const ordered = ids.map((qid) => byId.get(qid)).filter((q): q is (typeof rows)[number] => !!q);

  const band = scoreBand(attempt.score);
  const blank = attempt.totalCount - ordered.filter((q) => answers[q.id]).length;
  const wrong = attempt.totalCount - attempt.correctCount - blank;

  return (
    <PageShell>
      <PageHeader
        icon={<Award className="h-6 w-6" />}
        title="Resultado do simulado"
        description={exam.title}
        backHref="/studies/simulados"
        backLabel="Voltar para Simulados"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/studies/simulados/${exam.id}`}>
              <Button variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" /> Refazer
              </Button>
            </Link>
            <Link href="/studies/questoes">
              <Button variant="outline" className="gap-2">
                <ListChecks className="h-4 w-4" /> Banco de questões
              </Button>
            </Link>
          </div>
        }
      />

      <PageContainer className="space-y-6">
        {/* NOTA */}
        <Card className="border-border/40 bg-card shadow-sm">
          <CardContent className="flex flex-col items-center gap-6 py-8 sm:flex-row sm:justify-around">
            <div className="text-center">
              <p className={cn("text-5xl font-black leading-none", TONE_CLASS[band.tone])}>{attempt.score}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">de 1000 · {band.label}</p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <Metric value={attempt.correctCount} label="acertos" className="text-emerald-600 dark:text-emerald-400" />
              <Metric value={wrong} label="erros" className="text-red-600 dark:text-red-400" />
              <Metric value={blank} label="em branco" className="text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-black leading-none">{formatDuration(attempt.secondsSpent)}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">de prova</p>
            </div>
          </CardContent>
        </Card>

        <p className="mx-auto max-w-2xl text-center text-xs text-muted-foreground">
          Nota estilo ENEM: cada acerto vale pela dificuldade da questão, e acertar as difíceis
          errando as fáceis reduz a nota — é o que a TRI chama de coerência. É uma aproximação
          pedagógica para você comparar suas próprias provas, não a TRI oficial do INEP.
        </p>

        {/* GABARITO COMENTADO */}
        <div className="space-y-3">
          {ordered.map((q, qi) => {
            const chosen = answers[q.id] ?? null;
            const correctOption = q.options.find((o) => o.isCorrect);
            const isCorrect = !!chosen && chosen === correctOption?.id;
            const sorted = [...q.options].sort((a, b) => a.position - b.position);

            return (
              <Card key={q.id} className="border-border/40 bg-card shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="border-none bg-muted text-muted-foreground">
                      {qi + 1}
                    </Badge>
                    {!chosen ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                        <MinusCircle className="h-4 w-4" /> Em branco
                      </span>
                    ) : isCorrect ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" /> Acertou
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                        <XCircle className="h-4 w-4" /> Errou
                      </span>
                    )}
                    <Badge className={cn("border-none text-[11px]", areaBadgeClass(q.area))}>
                      {areaLabel(q.area)}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{difficultyLabel(q.difficulty)}</span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{q.statement}</p>

                  <div className="space-y-1.5">
                    {sorted.map((o, i) => {
                      const picked = chosen === o.id;
                      return (
                        <div
                          key={o.id}
                          className={cn(
                            "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
                            o.isCorrect && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                            picked && !o.isCorrect && "bg-red-500/10 text-red-700 dark:text-red-300",
                            !o.isCorrect && !picked && "bg-muted/30 text-muted-foreground",
                          )}
                        >
                          <span className="font-bold">{optionLetter(i)}</span>
                          <span className="flex-1">{o.text}</span>
                          {picked && <span className="text-[11px] font-semibold uppercase">sua resposta</span>}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Por quê: </span>
                      {q.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </PageContainer>
    </PageShell>
  );
}

function Metric({ value, label, className }: { value: number; label: string; className?: string }) {
  return (
    <div>
      <p className={cn("text-2xl font-black leading-none", className)}>{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
