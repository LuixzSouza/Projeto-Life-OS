"use client";

// A PROVA. Uma questão por vez (foco), navegador de questões ao lado (controle),
// cronômetro honesto no topo. O gabarito NÃO vem para o cliente — a correção é
// feita no servidor, então não há como "ver a resposta" pelo DevTools.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Timer, ChevronLeft, ChevronRight, Flag, Loader2, Play, CircleAlert, ListChecks,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import { startAttempt, submitAttempt } from "@/app/(dashboard)/studies/actions/exams";
import { formatDuration } from "@/lib/exam-shared";
import { areaBadgeClass, areaLabel, difficultyLabel, optionLetter } from "./question-helpers";

/** Questão como o ALUNO a vê: sem `isCorrect`, sem explicação. */
export interface RunnerQuestion {
  id: string;
  statement: string;
  area: string;
  difficulty: number;
  options: { id: string; text: string }[];
}

interface ExamRunnerProps {
  examId: string;
  title: string;
  durationMinutes: number;
  questions: RunnerQuestion[];
}

export function ExamRunner({ examId, title, durationMinutes, questions }: ExamRunnerProps) {
  const router = useRouter();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Guarda contra corrida: o auto-envio por tempo esgotado e o clique do aluno
  // podem acontecer no mesmo instante — só o primeiro vale.
  const submittedRef = useRef(false);
  // O tempo decorrido também vive num ref: assim o cronômetro é a ÚNICA fonte
  // que o dispara (sem efeito reagindo a `elapsed`, que a regra de lint proíbe
  // — setState síncrono em efeito) e o intervalo não reinicia a cada resposta.
  const elapsedRef = useRef(0);

  const limitSeconds = durationMinutes > 0 ? durationMinutes * 60 : 0;
  const remaining = limitSeconds > 0 ? Math.max(0, limitSeconds - elapsed) : 0;
  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const current = questions[index];

  const finish = useCallback(
    async (auto = false) => {
      if (!attemptId || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);

      const result = await submitAttempt({ attemptId, answers, secondsSpent: elapsedRef.current });
      if (result.success) {
        if (auto) toast.info("Tempo esgotado — prova entregue.");
        router.push(`/studies/simulados/${examId}/resultado/${attemptId}`);
      } else {
        submittedRef.current = false;
        setSubmitting(false);
        toast.error(result.message);
      }
    },
    [attemptId, answers, examId, router],
  );

  // A versão mais recente de `finish` fica num ref para o cronômetro não precisar
  // dela nas dependências — senão o intervalo reiniciaria a cada resposta marcada.
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  // Cronômetro: um tick por segundo enquanto a prova está aberta, e é ele quem
  // entrega a prova quando o tempo acaba. setState dentro do callback do
  // intervalo é permitido (não é setState síncrono no corpo do efeito).
  useEffect(() => {
    if (!attemptId || submitting) return;
    const id = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (limitSeconds > 0 && elapsedRef.current >= limitSeconds && !submittedRef.current) {
        void finishRef.current(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [attemptId, submitting, limitSeconds]);

  // Sair no meio perde a prova em andamento — o navegador avisa.
  useEffect(() => {
    if (!attemptId) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (submittedRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [attemptId]);

  const begin = async () => {
    setStarting(true);
    const result = await startAttempt(examId);
    setStarting(false);
    if (result.success && result.attemptId) {
      setAttemptId(result.attemptId);
    } else {
      toast.error(result.message);
    }
  };

  /* ---------- ANTES DE COMEÇAR: o briefing ---------- */
  if (!attemptId) {
    return (
      <Card className="border-border/40 bg-card shadow-sm">
        <CardContent className="flex flex-col items-center gap-5 py-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <ListChecks className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {questions.length} {questions.length === 1 ? "questão" : "questões"}
              {durationMinutes > 0 ? ` · ${durationMinutes} minutos de prova` : " · sem limite de tempo"}
            </p>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            O cronômetro começa ao clicar. Você pode pular e voltar em qualquer questão — a correção só
            acontece quando você entregar{durationMinutes > 0 ? " (ou quando o tempo acabar)" : ""}.
          </p>
          <Button size="lg" className="gap-2" onClick={begin} disabled={starting || questions.length === 0}>
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Começar prova
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ---------- DURANTE A PROVA ---------- */
  const timeIsShort = limitSeconds > 0 && remaining <= 60;

  return (
    <div className="space-y-4">
      {/* BARRA DE STATUS: tempo + progresso, sempre à vista */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/40 bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <Timer className={cn("h-4 w-4", timeIsShort ? "text-destructive" : "text-primary")} />
          <span className={cn("font-mono text-lg font-black tabular-nums", timeIsShort && "text-destructive")}>
            {limitSeconds > 0 ? formatDuration(remaining) : formatDuration(elapsed)}
          </span>
          <span className="text-xs text-muted-foreground">
            {limitSeconds > 0 ? "restantes" : "de prova"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            <strong className="text-foreground">{answeredCount}</strong> / {questions.length} respondidas
          </span>
          <Button size="sm" className="gap-2" onClick={() => setConfirmOpen(true)} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
            Entregar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        {/* QUESTÃO ATUAL */}
        <Card className="border-border/40 bg-card shadow-sm">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border-none bg-primary/10 text-primary">
                Questão {index + 1}
              </Badge>
              <Badge className={cn("border-none text-[11px]", areaBadgeClass(current.area))}>
                {areaLabel(current.area)}
              </Badge>
              <span className="text-[11px] text-muted-foreground">{difficultyLabel(current.difficulty)}</span>
            </div>

            <p className="whitespace-pre-wrap text-base leading-relaxed">{current.statement}</p>

            <div className="space-y-2">
              {current.options.map((o, i) => {
                const selected = answers[current.id] === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [current.id]: selected ? null : o.id }))
                    }
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all",
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/50 bg-background hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground",
                      )}
                    >
                      {optionLetter(i)}
                    </span>
                    <span className="leading-relaxed">{o.text}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-4">
              <Button
                variant="outline" className="gap-2"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              {index < questions.length - 1 ? (
                <Button variant="outline" className="gap-2" onClick={() => setIndex((i) => i + 1)}>
                  Próxima <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button className="gap-2" onClick={() => setConfirmOpen(true)} disabled={submitting}>
                  <Flag className="h-4 w-4" /> Entregar prova
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* NAVEGADOR: o mapa da prova (respondidas em destaque) */}
        <Card className="h-fit border-border/40 bg-card shadow-sm lg:sticky lg:top-20 lg:w-[220px]">
          <CardContent className="p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Navegação
            </p>
            <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-5">
              {questions.map((q, i) => {
                const answered = !!answers[q.id];
                const isCurrent = i === index;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Ir para a questão ${i + 1}${answered ? " (respondida)" : ""}`}
                    aria-current={isCurrent}
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-lg border text-xs font-semibold transition-colors",
                      isCurrent && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                      answered
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Entregar a prova?</AlertDialogTitle>
            <AlertDialogDescription>
              {answeredCount < questions.length ? (
                <span className="flex items-start gap-2">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  Faltam {questions.length - answeredCount} {questions.length - answeredCount === 1 ? "questão" : "questões"} em
                  branco. Em branco conta como erro, mas não pesa na coerência da nota.
                </span>
              ) : (
                "Todas respondidas. A correção aparece na hora, com o gabarito comentado."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Continuar prova</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void finish(false); }}
              disabled={submitting}
              className="gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Entregar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
