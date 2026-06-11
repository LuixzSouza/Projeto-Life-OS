"use client";

import { useMemo, useOptimistic, useRef, useTransition, startTransition } from "react";
import { format, addDays, startOfWeek, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Prisma } from "@prisma/client";
import { CheckCircle2, Circle, Plus, Loader2, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toggleTaskDone, createQuickTask } from "@/app/(dashboard)/agenda/actions";
import type { ThemedDayData } from "@/app/(dashboard)/agenda/themed-days-actions";

type TaskWithProject = Prisma.TaskGetPayload<{
  include: { project: { select: { title: true; color: true } } };
}>;

interface WeekPlannerProps {
  /** Tarefas com vencimento na semana exibida — INCLUI as concluídas (riscadas). */
  tasks: TaskWithProject[];
  selectedDateISO: string;
  themedDays: ThemedDayData[];
}

/**
 * Método Alastrar (Fase 1 — #1): a semana como um planner de papel.
 * Dias em colunas, tarefas como linhas; concluir = riscar (e fica visível,
 * como no caderno). Adição rápida direto na coluna do dia.
 */
export function WeekPlanner({ tasks, selectedDateISO, themedDays }: WeekPlannerProps) {
  const selectedDate = useMemo(() => new Date(selectedDateISO), [selectedDateISO]);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const themedByWeekday = useMemo(
    () => new Map(themedDays.map((t) => [t.weekday, t])),
    [themedDays],
  );

  // Riscar é otimista: a linha risca na hora; o servidor confirma em seguida.
  const [optimisticDone, applyOptimistic] = useOptimistic(
    new Map(tasks.map((t) => [t.id, t.isDone])),
    (state, change: { id: string; isDone: boolean }) => {
      const next = new Map(state);
      next.set(change.id, change.isDone);
      return next;
    },
  );

  const strike = (task: TaskWithProject) => {
    startTransition(async () => {
      applyOptimistic({ id: task.id, isDone: !(optimisticDone.get(task.id) ?? task.isDone) });
      await toggleTaskDone(task.id);
    });
  };

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex shrink-0 items-center gap-3 border-b border-border/40 bg-muted/10 px-6 py-4">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary shadow-inner">
          <PenLine className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-black uppercase leading-none tracking-tighter text-foreground">Planner da Semana</h3>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {format(weekDays[0], "dd MMM", { locale: ptBR })} — {format(weekDays[6], "dd MMM", { locale: ptBR })} · risque ao concluir
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-background/30 p-4">
        {/* G9: < md empilha um card por dia (hoje primeiro); ≥ md vira as 7 colunas */}
        <div className="grid grid-cols-1 gap-3 md:min-w-[980px] md:grid-cols-7">
          {weekDays.map((day) => {
            const theme = themedByWeekday.get(day.getDay());
            const dayTasks = tasks
              .filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day))
              .sort((a, b) => Number(optimisticDone.get(a.id) ?? a.isDone) - Number(optimisticDone.get(b.id) ?? b.isDone));
            const today = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex min-h-[140px] flex-col rounded-2xl border bg-card shadow-sm transition-colors md:min-h-[320px]",
                  today ? "border-primary/40 ring-1 ring-primary/20 max-md:order-first" : "border-border/40",
                )}
              >
                {/* Cabeçalho do dia (cor do Dia Temático quando existir) */}
                <div
                  className="rounded-t-2xl border-b border-border/40 px-3 py-2.5"
                  style={theme ? { backgroundColor: `${theme.color}14` } : undefined}
                >
                  <div className="flex items-center justify-between gap-1">
                    <p className={cn("text-[10px] font-black uppercase tracking-widest", today ? "text-primary" : "text-muted-foreground")}>
                      {format(day, "EEE", { locale: ptBR }).replace(".", "")}
                    </p>
                    <p className={cn("text-sm font-black tabular-nums", today ? "text-primary" : "text-foreground")}>
                      {format(day, "dd")}
                    </p>
                  </div>
                  {theme && (
                    <p className="mt-0.5 truncate text-[10px] font-bold" style={{ color: theme.color }}>
                      {theme.icon ? `${theme.icon} ` : ""}{theme.name}
                    </p>
                  )}
                </div>

                {/* Linhas do planner */}
                <div className="flex-1 space-y-1 p-2">
                  {dayTasks.length === 0 && (
                    // G16: o "—" vira convite — foca o input do pé da coluna.
                    <button
                      type="button"
                      onClick={() => document.getElementById(`planner-add-${format(day, "yyyy-MM-dd")}`)?.focus()}
                      className="w-full rounded-lg px-1 py-2 text-center text-[10px] font-medium text-muted-foreground/50 transition-colors hover:bg-muted/40 hover:text-primary"
                    >
                      ✎ anotar algo…
                    </button>
                  )}
                  {dayTasks.map((task) => {
                    const done = optimisticDone.get(task.id) ?? task.isDone;
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => strike(task)}
                        title={done ? "Desfazer conclusão" : "Riscar (concluir)"}
                        className={cn(
                          "group flex w-full items-start gap-1.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-muted/40",
                          done && "opacity-60",
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-primary" />
                        )}
                        <span
                          className={cn(
                            "min-w-0 flex-1 break-words text-xs font-medium leading-snug text-foreground",
                            done && "text-muted-foreground line-through decoration-2",
                          )}
                          style={task.project?.color && !done ? { color: task.project.color } : undefined}
                        >
                          {task.title}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Adição rápida no pé da coluna (como escrever no planner) */}
                <DayQuickAdd day={day} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayQuickAdd({ day }: { day: Date }) {
  const [isPending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (formData: FormData) => {
    start(async () => {
      await createQuickTask(formData);
      formRef.current?.reset();
    });
  };

  return (
    <form ref={formRef} action={submit} className="flex items-center gap-1 border-t border-border/40 p-2">
      <input type="hidden" name="dueDate" value={format(day, "yyyy-MM-dd")} />
      <Input
        id={`planner-add-${format(day, "yyyy-MM-dd")}`}
        name="title"
        required
        maxLength={200}
        placeholder="Anotar…"
        className="h-7 flex-1 border-none bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
      />
      <Button type="submit" disabled={isPending} size="icon" variant="ghost" className="h-9 w-9 md:h-7 md:w-7 shrink-0 rounded-md" title="Adicionar">
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
      </Button>
    </form>
  );
}
