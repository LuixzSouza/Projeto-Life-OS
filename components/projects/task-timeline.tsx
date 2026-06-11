"use client";

// Visão Timeline/Gantt simples (roadmap §2): tarefas com dueDate numa régua
// semanal. Cada linha é uma tarefa; a barra vai da criação até o prazo
// (clampada na janela visível). Sem prazo fica numa seção recolhida — numa
// régua de tempo, o que não tem data é ruído. Clique no título abre a tarefa
// na visão lista (deep-link ?task= já existente).

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Task } from "@prisma/client";
import {
  addDays, differenceInCalendarDays, format, isToday, startOfDay, startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, ChevronRight, Inbox, Lock } from "lucide-react";
import { toggleTask } from "@/app/(dashboard)/projects/actions";
import { useIsTaskBlocked } from "./task/blocked-tasks-context";

const LEFT_COL = "13rem"; // coluna fixa de títulos
const DAY_COL = "2.25rem"; // largura de cada dia da régua
const MIN_WEEKS = 4;
const MAX_WEEKS = 8;

type Tone = "done" | "overdue" | "progress" | "review" | "todo";

const TONE_BAR: Record<Tone, { track: string; fill: string; label: string }> = {
  done: { track: "bg-emerald-500/15", fill: "bg-emerald-500", label: "Concluída" },
  overdue: { track: "bg-rose-500/15", fill: "bg-rose-500", label: "Atrasada" },
  progress: { track: "bg-blue-500/15", fill: "bg-blue-500", label: "Fazendo" },
  review: { track: "bg-amber-500/15", fill: "bg-amber-500", label: "Revisão" },
  todo: { track: "bg-primary/15", fill: "bg-primary", label: "A fazer" },
};

function taskTone(task: Task, done: boolean, today: Date): Tone {
  if (done) return "done";
  if (task.dueDate && startOfDay(new Date(task.dueDate)).getTime() < today.getTime()) return "overdue";
  if (task.status === "IN_PROGRESS") return "progress";
  if (task.status === "REVIEW") return "review";
  return "todo";
}

/** Uma linha da régua: título fixo à esquerda + barra posicionada no grid de dias. */
type DatedTask = Task & { dueDate: Date };

function TimelineRow({
  task, totalDays, rangeStart, gridTemplate, onOpen,
}: {
  task: DatedTask;
  totalDays: number;
  rangeStart: Date;
  gridTemplate: string;
  onOpen: (id: string) => void;
}) {
  const [, startTransition] = useTransition();
  const [done, setDone] = useState(task.isDone);
  // Sincroniza com o servidor após revalidação (ajuste durante o render,
  // sem efeito — https://react.dev/learn/you-might-not-need-an-effect).
  const [prevDone, setPrevDone] = useState(task.isDone);
  if (task.isDone !== prevDone) {
    setPrevDone(task.isDone);
    setDone(task.isDone);
  }
  const blocked = useIsTaskBlocked(task.id);

  const today = startOfDay(new Date());
  const due = startOfDay(new Date(task.dueDate));
  const created = startOfDay(new Date(task.createdAt));

  const dueIdx = differenceInCalendarDays(due, rangeStart);
  const startIdx = differenceInCalendarDays(created, rangeStart);

  const clampedStart = Math.min(Math.max(startIdx, 0), totalDays - 1);
  const clampedEnd = Math.min(Math.max(dueIdx, 0), totalDays - 1);
  const clippedLeft = Math.min(startIdx, dueIdx) < 0;
  const clippedRight = dueIdx > totalDays - 1;

  const tone = TONE_BAR[taskTone(task, done, today)];
  const progress = done ? 100 : Math.min(Math.max(task.progress ?? 0, 0), 100);

  const handleToggle = (checked: boolean) => {
    setDone(checked);
    startTransition(async () => {
      try {
        await toggleTask(task.id, checked);
      } catch {
        setDone(!checked);
        toast.error("Falha ao atualizar a tarefa.");
      }
    });
  };

  return (
    <div
      id={`task-${task.id}`}
      className="grid items-center border-t border-border/30 hover:bg-muted/20 transition-colors"
      style={{ gridTemplateColumns: gridTemplate }}
    >
      {/* Título (sticky para sobreviver ao scroll horizontal) */}
      <div className="sticky left-0 z-20 flex items-center gap-2 bg-background px-3 py-2 border-r border-border/40 min-w-0">
        <Checkbox
          checked={done}
          onCheckedChange={(c) => handleToggle(c === true)}
          className="shrink-0 h-4 w-4"
          aria-label={done ? "Reabrir tarefa" : "Concluir tarefa"}
        />
        {blocked && <Lock className="h-3 w-3 shrink-0 text-amber-500" aria-label="Bloqueada por outra tarefa" />}
        <button
          type="button"
          onClick={() => onOpen(task.id)}
          className={cn(
            "truncate text-left text-xs font-medium hover:text-primary hover:underline underline-offset-2 transition-colors",
            done && "line-through text-muted-foreground",
          )}
          title={`${task.title}\nCriada em ${format(created, "d 'de' MMM", { locale: ptBR })} · Prazo ${format(due, "d 'de' MMM", { locale: ptBR })}`}
        >
          {task.title}
        </button>
      </div>

      {/* Barra criação → prazo (com pista de fundo e preenchimento = progresso) */}
      <div
        className="relative h-9 flex items-center px-0.5"
        style={{ gridColumn: `${clampedStart + 2} / ${clampedEnd + 3}` }}
      >
        <div className={cn("relative h-3.5 w-full overflow-hidden rounded-full", tone.track)}>
          <div className={cn("absolute inset-y-0 left-0 rounded-full", tone.fill)} style={{ width: `${progress}%` }} />
        </div>
        {clippedLeft && <ChevronLeft className="absolute left-0 h-3 w-3 text-muted-foreground" aria-label="Começa antes da janela" />}
        {clippedRight && <ChevronRight className="absolute right-0 h-3 w-3 text-muted-foreground" aria-label="Prazo além da janela" />}
      </div>
    </div>
  );
}

export function TaskTimeline({ initialTasks }: { initialTasks: Task[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showNoDue, setShowNoDue] = useState(false);

  const today = startOfDay(new Date());
  const rangeStart = startOfWeek(today, { weekStartsOn: 1 });

  const { withDue, noDue, weeks } = useMemo(() => {
    const dated = initialTasks
      .filter((t): t is Task & { dueDate: Date } => t.dueDate != null)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const undated = initialTasks.filter((t) => t.dueDate == null);

    // A janela cresce até caber o prazo mais distante (entre 4 e 8 semanas).
    const maxIdx = dated.reduce(
      (max, t) => Math.max(max, differenceInCalendarDays(startOfDay(new Date(t.dueDate)), rangeStart)),
      0,
    );
    const fit = Math.ceil((maxIdx + 1) / 7);
    return { withDue: dated, noDue: undated, weeks: Math.min(Math.max(fit, MIN_WEEKS), MAX_WEEKS) };
    // rangeStart é derivado de "hoje" — estável durante a vida do componente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTasks]);

  const totalDays = weeks * 7;
  const days = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalDays],
  );
  const gridTemplate = `minmax(${LEFT_COL}, ${LEFT_COL}) repeat(${totalDays}, ${DAY_COL})`;

  // Abre a tarefa na visão lista (o TaskDeepLink rola e destaca o cartão).
  const openInList = (id: string) => {
    const usp = new URLSearchParams(searchParams.toString());
    usp.set("view", "list");
    usp.set("filter", "all"); // garante que a tarefa (mesmo concluída) renderize
    usp.set("task", id);
    router.push(`?${usp.toString()}`, { scroll: false });
  };

  if (withDue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/10 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Inbox className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Nenhuma tarefa com prazo</h3>
        <p className="text-sm text-muted-foreground max-w-xs mt-1">
          A linha do tempo mostra tarefas com data de entrega. Abra uma tarefa e defina um prazo para vê-la aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-x-auto scrollbar-hide">
        <div className="relative w-max min-w-full">
          {/* Fundo: linhas verticais dos dias + destaques de hoje/fim de semana */}
          <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: gridTemplate }} aria-hidden>
            <div />
            {days.map((d) => {
              const weekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={d.toISOString()}
                  className={cn(
                    "border-l border-border/20",
                    weekend && "bg-muted/30",
                    isToday(d) && "bg-primary/5 border-l-primary/40",
                  )}
                />
              );
            })}
          </div>

          {/* Cabeçalho: semanas e dias */}
          <div className="relative grid" style={{ gridTemplateColumns: gridTemplate }}>
            <div className="sticky left-0 z-20 bg-background border-r border-border/40 px-3 py-2 flex items-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {withDue.length} com prazo
              </span>
            </div>
            {Array.from({ length: weeks }, (_, w) => {
              const ws = addDays(rangeStart, w * 7);
              return (
                <div key={w} className="col-span-7 px-2 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                  {format(ws, "d MMM", { locale: ptBR })} – {format(addDays(ws, 6), "d MMM", { locale: ptBR })}
                </div>
              );
            })}
          </div>
          <div className="relative grid" style={{ gridTemplateColumns: gridTemplate }}>
            <div className="sticky left-0 z-20 bg-background border-r border-border/40" />
            {days.map((d) => (
              <div key={d.toISOString()} className="flex flex-col items-center pb-1.5 pt-0.5">
                <span className="text-[9px] uppercase text-muted-foreground/60">{format(d, "EEEEE", { locale: ptBR })}</span>
                <span
                  className={cn(
                    "text-[10px] font-semibold tabular-nums leading-none",
                    isToday(d)
                      ? "h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                      : "text-muted-foreground",
                  )}
                >
                  {format(d, "d")}
                </span>
              </div>
            ))}
          </div>

          {/* Linhas */}
          <div className="relative">
            {withDue.map((task) => (
              <TimelineRow
                key={task.id}
                task={task}
                totalDays={totalDays}
                rangeStart={rangeStart}
                gridTemplate={gridTemplate}
                onOpen={openInList}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        {(Object.keys(TONE_BAR) as Tone[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn("h-2 w-4 rounded-full", TONE_BAR[t].fill)} />
            {TONE_BAR[t].label}
          </span>
        ))}
        <span className="text-[11px] text-muted-foreground/60">· barra = criação → prazo · preenchimento = progresso</span>
      </div>

      {/* Sem prazo (recolhido — numa régua de tempo, sem data é ruído) */}
      {noDue.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowNoDue((v) => !v)}
            className="flex w-full items-center gap-2.5 select-none"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
              <Inbox className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold tracking-tight text-muted-foreground">Sem prazo</h3>
            <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
              {noDue.length}
            </span>
            <span className="hidden text-xs text-muted-foreground/60 sm:inline">abra a tarefa para agendar</span>
            <div className="flex-1 h-px bg-border/40" />
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", showNoDue && "rotate-180")} />
          </button>
          {showNoDue && (
            <div className="divide-y divide-border/30 rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
              {noDue.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openInList(t.id)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium hover:bg-muted/30 transition-colors"
                >
                  <span className={cn("truncate", t.isDone && "line-through text-muted-foreground")}>{t.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
