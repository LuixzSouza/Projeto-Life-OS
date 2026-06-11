'use client';

import { useEffect, useMemo, useState } from 'react';
import { Reorder } from 'framer-motion';
import { Task } from '@prisma/client';
import { startOfDay, isToday, isTomorrow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { AlertTriangle, Sun, CalendarClock, CalendarDays, Inbox, ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskItem } from './task-item';
import { updateTasksOrder } from '@/app/(dashboard)/projects/actions';

type Tone = 'overdue' | 'today' | 'tomorrow' | 'date' | 'none';

interface Section {
  key: string;
  label: string;
  ts: number;
  tone: Tone;
  tasks: Task[];
}

const TONE: Record<Tone, { icon: LucideIcon; chip: string; title: string }> = {
  overdue: { icon: AlertTriangle, chip: 'bg-rose-500/10 text-rose-500', title: 'text-rose-500' },
  today: { icon: Sun, chip: 'bg-primary/10 text-primary', title: 'text-primary' },
  tomorrow: { icon: CalendarClock, chip: 'bg-blue-500/10 text-blue-600', title: 'text-foreground' },
  date: { icon: CalendarDays, chip: 'bg-muted text-muted-foreground', title: 'text-foreground' },
  none: { icon: Inbox, chip: 'bg-muted text-muted-foreground', title: 'text-muted-foreground' },
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Agrupa as tarefas em seções por data: Atrasadas → Hoje → Amanhã → datas
// futuras (uma por dia) → Sem data. Tarefas concluídas não contam como atraso.
function buildSections(tasks: Task[]): Section[] {
  const today = startOfDay(new Date());
  const map = new Map<string, Section>();

  const bucket = (key: string, label: string, ts: number, tone: Tone) => {
    let s = map.get(key);
    if (!s) { s = { key, label, ts, tone, tasks: [] }; map.set(key, s); }
    return s;
  };

  for (const t of tasks) {
    if (!t.dueDate) { bucket('none', 'Backlog', Number.POSITIVE_INFINITY, 'none').tasks.push(t); continue; }
    const day = startOfDay(new Date(t.dueDate));
    const ts = day.getTime();
    if (ts < today.getTime() && !t.isDone) { bucket('overdue', 'Atrasadas', Number.NEGATIVE_INFINITY, 'overdue').tasks.push(t); continue; }
    if (isToday(day)) { bucket('today', 'Hoje', today.getTime(), 'today').tasks.push(t); continue; }
    if (isTomorrow(day)) { bucket('tomorrow', 'Amanhã', ts, 'tomorrow').tasks.push(t); continue; }
    bucket(day.toISOString(), capitalize(format(day, "EEE, d 'de' MMM", { locale: ptBR })), ts, 'date').tasks.push(t);
  }

  return [...map.values()].sort((a, b) => a.ts - b.ts);
}

export function TasksByDay({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  const sections = useMemo(() => buildSections(tasks), [tasks]);
  // Backlog (sem prazo) recolhido por padrão: numa visão POR DIA, o que não tem
  // dia é ruído — fica a um clique, sem poluir a agenda. Se só existe backlog,
  // não há o que esconder: abre direto.
  const [showBacklog, setShowBacklog] = useState(false);

  // Reordena dentro de uma seção sem bagunçar a ordem global: preserva a posição
  // das demais tarefas e só permuta os slots que pertencem à seção.
  const reorderSection = async (sectionTasks: Task[], newOrder: Task[]) => {
    const ids = new Set(sectionTasks.map((t) => t.id));
    let j = 0;
    const flat = tasks.map((t) => (ids.has(t.id) ? newOrder[j++] : t));

    const oldIds = tasks.map((t) => t.id).join(',');
    const newIds = flat.map((t) => t.id).join(',');
    setTasks(flat);
    if (oldIds === newIds) return;

    const result = await updateTasksOrder(flat.map((t) => t.id));
    if (result?.error) { toast.error(result.error); setTasks(initialTasks); }
  };

  return (
    <div className="space-y-8">
      {sections.map((section) => {
        const tone = TONE[section.tone];
        const Icon = tone.icon;
        const isBacklog = section.tone === 'none';
        const collapsed = isBacklog && !showBacklog && sections.length > 1;
        return (
          <div key={section.key} className="space-y-3">
            {/* Cabeçalho do dia (o Backlog é clicável — recolhe/expande) */}
            <div
              className={cn('flex items-center gap-2.5', isBacklog && sections.length > 1 && 'cursor-pointer select-none')}
              role={isBacklog && sections.length > 1 ? 'button' : undefined}
              onClick={isBacklog && sections.length > 1 ? () => setShowBacklog((v) => !v) : undefined}
            >
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg shrink-0', tone.chip)}>
                <Icon className="h-4 w-4" />
              </div>
              <h3 className={cn('text-sm font-bold tracking-tight', tone.title)}>{section.label}</h3>
              {section.tone === 'today' && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground">
                  Hoje
                </span>
              )}
              {(section.tone === 'today' || section.tone === 'tomorrow') && (
                <span className="text-xs text-muted-foreground">{format(new Date(section.ts), "d 'de' MMMM", { locale: ptBR })}</span>
              )}
              {isBacklog && (
                <span className="hidden text-xs text-muted-foreground/60 sm:inline">sem prazo — abra a tarefa para agendar</span>
              )}
              <span className="ml-0.5 rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
                {section.tasks.length}
              </span>
              <div className="flex-1 h-px bg-border/40" />
              {isBacklog && sections.length > 1 && (
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', !collapsed && 'rotate-180')} />
              )}
            </div>

            {/* Tarefas do dia (arrastáveis dentro da seção) */}
            {!collapsed && (
              <Reorder.Group
                axis="y"
                values={section.tasks}
                onReorder={(newOrder) => reorderSection(section.tasks, newOrder)}
                className="flex flex-col gap-2 list-none p-0 m-0 outline-none"
              >
                {section.tasks.map((task) => (
                  <TaskItem key={task.id} task={task} viewMode="list" />
                ))}
              </Reorder.Group>
            )}
          </div>
        );
      })}
    </div>
  );
}
