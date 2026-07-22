"use client";

// CENTRAL DE SIMULADOS — montar a prova, refazer, e ver a evolução da nota.
// A montagem é a parte inteligente: em vez de "escolha 20 questões", o aluno
// escolhe uma ESTRATÉGIA (sorteio / meus erros / inéditas) e o app decide quais
// questões cobram mais dele agora.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Timer, Play, Trash2, Loader2, Plus, TrendingUp, Award, ListChecks, Shuffle,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { createExam, deleteExam } from "@/app/(dashboard)/studies/actions/exams";
import { EXAM_STRATEGIES, EXAM_STRATEGY_LABELS, formatDuration, type ExamStrategy } from "@/lib/exam-shared";
import { scoreBand } from "@/lib/exam-scoring";
import { QUESTION_AREAS, QUESTION_AREA_LABELS, type QuestionArea } from "@/lib/enums";
import type { SubjectOption } from "./question-form-dialog";

export interface ExamAttemptRow {
  id: string;
  score: number;
  correctCount: number;
  totalCount: number;
  secondsSpent: number;
  finishedAt: Date | null;
}

export interface ExamRow {
  id: string;
  title: string;
  description: string | null;
  area: string | null;
  durationMinutes: number;
  questionCount: number;
  attempts: ExamAttemptRow[];
}

interface ExamCenterProps {
  exams: ExamRow[];
  subjects: SubjectOption[];
  /** Tamanho do banco — sem questões não há simulado, e isso precisa ser dito. */
  poolCount: number;
}

const ANY = "any";

const TONE_CLASS = {
  high: "text-emerald-600 dark:text-emerald-400",
  good: "text-sky-600 dark:text-sky-400",
  mid: "text-amber-600 dark:text-amber-400",
  low: "text-red-600 dark:text-red-400",
} as const;

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function ExamCenter({ exams, subjects, poolCount }: ExamCenterProps) {
  const router = useRouter();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [strategy, setStrategy] = useState<ExamStrategy>("RANDOM");
  const [area, setArea] = useState<string>(ANY);
  const [subjectId, setSubjectId] = useState<string>(ANY);
  const [count, setCount] = useState("10");
  const [duration, setDuration] = useState("0");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ExamRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Evolução: só provas ENTREGUES entram — prova abandonada não é nota.
  const finished = useMemo(
    () =>
      exams
        .flatMap((e) => e.attempts.filter((a) => a.finishedAt).map((a) => ({ ...a, examTitle: e.title, examId: e.id })))
        .sort((a, b) => (b.finishedAt?.getTime() ?? 0) - (a.finishedAt?.getTime() ?? 0)),
    [exams],
  );

  const best = finished.length > 0 ? Math.max(...finished.map((a) => a.score)) : null;
  const average =
    finished.length > 0 ? Math.round(finished.reduce((s, a) => s + a.score, 0) / finished.length) : null;

  const handleCreate = async () => {
    setCreating(true);
    const result = await createExam({
      title,
      strategy,
      area: area === ANY ? null : area,
      subjectId: subjectId === ANY ? null : subjectId,
      count: Number(count) || 10,
      durationMinutes: Number(duration) || 0,
    });
    setCreating(false);

    if (result.success && result.examId) {
      toast.success(result.message);
      setBuilderOpen(false);
      router.push(`/studies/simulados/${result.examId}`);
    } else {
      toast.error(result.message);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const result = await deleteExam(pendingDelete.id);
    setDeleting(false);
    if (result.success) {
      toast.success(result.message);
      setPendingDelete(null);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* PANORAMA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-5">
          <Stat icon={<ListChecks className="h-4 w-4" />} value={String(poolCount)} label="questões no banco" />
          <Stat icon={<Timer className="h-4 w-4" />} value={String(finished.length)} label="provas feitas" />
          <Stat
            icon={<Award className="h-4 w-4" />}
            value={best === null ? "—" : String(best)}
            label="melhor nota"
            valueClass={best === null ? undefined : TONE_CLASS[scoreBand(best).tone]}
          />
          <Stat
            icon={<TrendingUp className="h-4 w-4" />}
            value={average === null ? "—" : String(average)}
            label="média"
          />
        </div>

        <Button className="gap-2" onClick={() => setBuilderOpen(true)} disabled={poolCount === 0}>
          <Plus className="h-4 w-4" /> Montar simulado
        </Button>
      </div>

      {/* BANCO VAZIO: o simulado depende dele, então o convite é direto */}
      {poolCount === 0 && (
        <Card className="border-dashed border-border/70 bg-card shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <ListChecks className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Nenhuma questão ainda</h3>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Um simulado é feito das suas próprias questões. Crie algumas (ou gere com IA) e volte aqui.
            </p>
            <Button className="mt-1 gap-2" onClick={() => router.push("/studies/questoes")}>
              <Plus className="h-4 w-4" /> Ir para o banco de questões
            </Button>
          </CardContent>
        </Card>
      )}

      {/* PROVAS MONTADAS */}
      {exams.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Suas provas</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {exams.map((exam) => {
              const done = exam.attempts.filter((a) => a.finishedAt);
              const last = done[0];
              return (
                <Card
                  key={exam.id}
                  className="border-border/40 bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{exam.title}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {exam.questionCount} {exam.questionCount === 1 ? "questão" : "questões"}
                          {exam.durationMinutes > 0 ? ` · ${exam.durationMinutes} min` : " · sem tempo"}
                          {done.length > 0 ? ` · ${done.length}× feita` : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost" size="icon" aria-label="Remover simulado"
                        onClick={(e) => { e.stopPropagation(); setPendingDelete(exam); }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {exam.description && (
                        <Badge variant="secondary" className="border-none bg-primary/10 text-primary">
                          {exam.description}
                        </Badge>
                      )}
                      {exam.area && (
                        <Badge variant="secondary" className="border-none bg-muted text-muted-foreground">
                          {QUESTION_AREA_LABELS[exam.area as QuestionArea] ?? exam.area}
                        </Badge>
                      )}
                      {last && (
                        <span className={cn("text-xs font-bold", TONE_CLASS[scoreBand(last.score).tone])}>
                          última: {last.score}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => router.push(`/studies/simulados/${exam.id}`)}
                      >
                        <Play className="h-4 w-4" /> {done.length > 0 ? "Refazer" : "Começar"}
                      </Button>
                      {last && (
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/studies/simulados/${exam.id}/resultado/${last.id}`)}
                        >
                          Resultado
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* HISTÓRICO */}
      {finished.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sua evolução</h2>
          <Card className="border-border/40 bg-card shadow-sm">
            <CardContent className="divide-y divide-border/40 p-0">
              {finished.slice(0, 10).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => router.push(`/studies/simulados/${a.examId}/resultado/${a.id}`)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.examTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(a.finishedAt)} · {a.correctCount}/{a.totalCount} acertos · {formatDuration(a.secondsSpent)}
                    </p>
                  </div>
                  <span className={cn("shrink-0 text-lg font-black", TONE_CLASS[scoreBand(a.score).tone])}>
                    {a.score}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* MONTADOR */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader
            icon={<Shuffle className="h-5 w-5" />}
            title="Montar simulado"
            description="Escolha a estratégia — o app seleciona as questões que mais cobram de você."
          />

          <DialogBody className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="exam-title">Título (opcional)</Label>
              <Input
                id="exam-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Revisão de Humanas — semana 3"
              />
            </div>

            <div className="space-y-2">
              <Label>Estratégia</Label>
              <div className="grid gap-2">
                {EXAM_STRATEGIES.map((s) => {
                  const active = strategy === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStrategy(s)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left transition-all",
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/40 hover:bg-muted/40",
                      )}
                    >
                      <p className="text-sm font-semibold">{EXAM_STRATEGY_LABELS[s].label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{EXAM_STRATEGY_LABELS[s].hint}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Questões</Label>
                <Select value={count} onValueChange={setCount}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 30, 45].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} questões</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tempo</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sem limite</SelectItem>
                    {[15, 30, 60, 90, 120, 180].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} minutos</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Área</Label>
                <Select value={area} onValueChange={setArea}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Todas</SelectItem>
                    {QUESTION_AREAS.map((a) => (
                      <SelectItem key={a} value={a}>{QUESTION_AREA_LABELS[a as QuestionArea]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Matéria</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Todas</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setBuilderOpen(false)} disabled={creating}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Montar e começar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este simulado?</AlertDialogTitle>
            <AlertDialogDescription>
              As notas dessa prova saem do histórico. As questões continuam no banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void confirmDelete(); }}
              disabled={deleting}
              className="gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({
  icon, value, label, valueClass,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <span>
        <span className={cn("text-lg font-black leading-none", valueClass)}>{value}</span>
        <span className="ml-1 text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}
