"use client";

import { useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckSquare, Circle, Folder, ArrowRight, CalendarClock, Sparkles,
  CheckCircle2, AlertTriangle, CalendarRange, Inbox, Plus, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { toggleTaskDone, createQuickTask } from "@/app/(dashboard)/agenda/actions";
import { Prisma } from "@prisma/client";
import { cn } from "@/lib/utils";

type TaskWithProject = Prisma.TaskGetPayload<{
  include: { project: { select: { title: true; color: true } } };
}>;

type GroupKey = "overdue" | "today" | "upcoming" | "undated";

const PRIORITY_META: Record<string, { label: string; dot: string; rank: number }> = {
  HIGH: { label: "Alta", dot: "bg-rose-500", rank: 0 },
  MEDIUM: { label: "Média", dot: "bg-amber-500", rank: 1 },
  LOW: { label: "Baixa", dot: "bg-slate-400", rank: 2 },
};

const GROUP_META: Record<GroupKey, { label: string; icon: typeof Inbox; accent: string }> = {
  overdue: { label: "Atrasadas", icon: AlertTriangle, accent: "text-rose-500" },
  today: { label: "Hoje", icon: CalendarClock, accent: "text-primary" },
  upcoming: { label: "Em breve", icon: CalendarRange, accent: "text-blue-500" },
  undated: { label: "Sem data", icon: Inbox, accent: "text-muted-foreground" },
};
const GROUP_ORDER: GroupKey[] = ["overdue", "today", "upcoming", "undated"];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function bucketOf(task: TaskWithProject, today: number): GroupKey {
  if (!task.dueDate) return "undated";
  const d = startOfDay(new Date(task.dueDate)).getTime();
  if (d < today) return "overdue";
  if (d === today) return "today";
  return "upcoming";
}

function priorityRank(p: string): number {
  return PRIORITY_META[p]?.rank ?? 1;
}

export function TaskList({ tasks, total }: { tasks: TaskWithProject[]; total: number }) {
  const today = startOfDay(new Date()).getTime();

  // Agrupa por urgência; dentro do grupo ordena por prioridade e depois por vencimento.
  const groups = GROUP_ORDER.map((key) => ({
    key,
    items: tasks
      .filter((t) => bucketOf(t, today) === key)
      .sort((a, b) => {
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      }),
  })).filter((g) => g.items.length > 0);

  const hiddenCount = total - tasks.length;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="px-6 py-5 border-b border-border/40 flex items-center justify-between bg-muted/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-xl text-primary shadow-inner border border-primary/20">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-black uppercase tracking-tighter text-foreground text-lg leading-none">Foco do Dia</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Tarefas ativas por prioridade</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-background border-primary/30 text-primary font-mono text-xs px-2 py-0.5 shadow-sm">
          {total} <span className="sr-only">tarefas pendentes</span>
        </Badge>
      </div>

      {/* CRIAÇÃO RÁPIDA */}
      <QuickAddTask />

      {/* LISTA AGRUPADA */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar bg-background/30">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/5">
            <div className="bg-emerald-500/10 p-4 rounded-2xl mb-4 shadow-inner border border-emerald-500/20">
              <Sparkles className="h-8 w-8 text-emerald-500 animate-pulse" />
            </div>
            <h4 className="text-xl font-black uppercase tracking-tighter text-foreground">Tudo Limpo!</h4>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2 max-w-[250px] leading-relaxed opacity-60">
              Nenhuma tarefa pendente. Aproveite a visão livre — ou adicione uma acima.
            </p>
          </div>
        ) : (
          groups.map((group) => {
            const meta = GROUP_META[group.key];
            const Icon = meta.icon;
            return (
              <div key={group.key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-3.5 w-3.5", meta.accent)} />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", meta.accent)}>{meta.label}</span>
                  <span className="text-[10px] font-bold text-muted-foreground/50 tabular-nums">{group.items.length}</span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
                <div className="space-y-3">
                  {group.items.map((task) => (
                    <TaskRow key={task.id} task={task} isLate={group.key === "overdue"} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER */}
      <div className="p-5 border-t border-border/40 bg-muted/10 shrink-0">
        <Button variant="ghost" className="w-full h-12 rounded-xl flex justify-between items-center text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all group/btn border border-transparent hover:border-primary/20" asChild>
          <Link href="/projects">
            <span className="text-[10px] font-black uppercase tracking-widest">
              {hiddenCount > 0 ? `+${hiddenCount} no Painel de Projetos` : "Painel de Projetos"}
            </span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// Adiciona uma tarefa sem sair da Agenda. React 19 reseta o form após a action;
// o reset manual cobre o caso de pending/erro e limpa imediatamente após sucesso.
function QuickAddTask() {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (formData: FormData) => {
    startTransition(async () => {
      await createQuickTask(formData);
      formRef.current?.reset();
    });
  };

  return (
    <form ref={formRef} action={submit} className="shrink-0 border-b border-border/40 bg-muted/5 px-6 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          name="title"
          required
          maxLength={200}
          placeholder="Adicionar tarefa rápida…"
          className="h-9 flex-1 min-w-[160px] text-sm"
        />
        <select
          name="priority"
          defaultValue="MEDIUM"
          aria-label="Prioridade"
          className="h-9 rounded-md border border-border/60 bg-background px-2 text-xs font-semibold text-foreground"
        >
          <option value="HIGH">Alta</option>
          <option value="MEDIUM">Média</option>
          <option value="LOW">Baixa</option>
        </select>
        <Input name="dueDate" type="date" aria-label="Vencimento" className="h-9 w-[150px] text-xs" />
        <Button type="submit" disabled={isPending} size="icon" className="h-9 w-9 shrink-0 rounded-lg" title="Adicionar tarefa">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}

function TaskRow({ task, isLate }: { task: TaskWithProject; isLate: boolean }) {
  const [isPending, startTransition] = useTransition();
  const projectColor = task.project?.color || "hsl(var(--primary))";
  const prio = PRIORITY_META[task.priority] ?? PRIORITY_META.MEDIUM;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden",
        isPending && "opacity-50 pointer-events-none",
      )}
    >
      {/* Borda esquerda: cor do projeto (ou primária se solta) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2"
        style={{ backgroundColor: task.project ? `${projectColor}80` : "hsl(var(--primary) / 0.5)" }}
      />

      {/* Concluir (com estado de pending) */}
      <button
        type="button"
        onClick={() => startTransition(() => toggleTaskDone(task.id))}
        title="Concluir tarefa"
        className="relative shrink-0 z-10 mt-0.5 flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground/50 transition-all hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500 group/btn"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <CheckCircle2 className="absolute h-4 w-4 opacity-0 transition-opacity group-hover/btn:opacity-100" />
            <Circle className="h-4 w-4 transition-opacity group-hover/btn:opacity-0" />
          </>
        )}
      </button>

      {/* Detalhes */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", prio.dot)} title={`Prioridade ${prio.label}`} />
          <h4 className="font-bold text-sm text-foreground leading-tight group-hover:text-primary transition-colors truncate">
            {task.title}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {task.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                isLate
                  ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                  : "bg-muted/40 text-muted-foreground border-border/40",
              )}
            >
              <CalendarClock className="h-3 w-3" />
              {format(new Date(task.dueDate), "dd MMM", { locale: ptBR })}
              {isLate && <span className="ml-1 text-[8px] px-1 bg-rose-500 text-white rounded-sm leading-none py-0.5">Atraso</span>}
            </div>
          )}

          {task.project && (
            <Badge
              variant="outline"
              className="text-[9px] h-5 px-2 font-black uppercase tracking-widest gap-1 border border-border/40 bg-background"
              style={{ color: projectColor }}
            >
              <Folder className="h-3 w-3" style={{ color: projectColor }} />
              {task.project.title}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
