'use client';

import { useState, useEffect } from 'react';
import { Task } from '@prisma/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { updateTaskStatus } from '@/app/(dashboard)/projects/actions';
import { PriorityBadge } from './task/priority-badge';
import { CircleDashed, Loader2, Eye, CheckCircle2, ImageIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TaskKanbanBoardProps {
  initialTasks: Task[];
}

type StatusKey = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

const COLUMNS: { key: StatusKey; label: string; icon: LucideIcon; accent: string }[] = [
  { key: 'TODO', label: 'A Fazer', icon: CircleDashed, accent: 'text-muted-foreground' },
  { key: 'IN_PROGRESS', label: 'Fazendo', icon: Loader2, accent: 'text-blue-500' },
  { key: 'REVIEW', label: 'Revisão', icon: Eye, accent: 'text-amber-500' },
  { key: 'DONE', label: 'Feito', icon: CheckCircle2, accent: 'text-emerald-500' },
];

// Normaliza status legados (ex.: nulos) para uma coluna válida.
const normalizeStatus = (s: string | null): StatusKey =>
  s === 'IN_PROGRESS' || s === 'REVIEW' || s === 'DONE' ? s : 'TODO';

export function TaskKanbanBoard({ initialTasks }: TaskKanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<StatusKey | null>(null);

  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  const moveTask = async (taskId: string, target: StatusKey) => {
    const current = tasks.find(t => t.id === taskId);
    if (!current || normalizeStatus(current.status) === target) return;

    const previous = tasks;
    // Update otimista
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: target, isDone: target === 'DONE' } : t
    ));

    const res = await updateTaskStatus(taskId, target);
    if (!res?.success) {
      toast.error('Não foi possível mover a tarefa.');
      setTasks(previous);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => normalizeStatus(t.status) === col.key);
        const Icon = col.icon;
        return (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); setOverColumn(col.key); }}
            onDragLeave={() => setOverColumn(prev => (prev === col.key ? null : prev))}
            onDrop={(e) => {
              e.preventDefault();
              setOverColumn(null);
              if (draggingId) moveTask(draggingId, col.key);
              setDraggingId(null);
            }}
            className={cn(
              'flex flex-col rounded-[1.5rem] border bg-muted/20 p-3 transition-colors min-h-[200px]',
              overColumn === col.key ? 'border-primary/50 bg-primary/5' : 'border-border/40'
            )}
          >
            {/* Cabeçalho da coluna */}
            <div className="flex items-center justify-between px-2 py-2 mb-1">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4', col.accent)} />
                <span className="text-[11px] font-black uppercase tracking-widest text-foreground/80">{col.label}</span>
              </div>
              <span className="text-[10px] font-black text-muted-foreground bg-background border border-border/40 rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                {colTasks.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2.5">
              {colTasks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-border/40 py-8 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  Solte aqui
                </div>
              ) : (
                colTasks.map(task => (
                  <div
                    key={task.id}
                    id={`task-${task.id}`}
                    draggable
                    onDragStart={() => setDraggingId(task.id)}
                    onDragEnd={() => { setDraggingId(null); setOverColumn(null); }}
                    className={cn(
                      'group rounded-xl border border-border/50 bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/30 transition-all',
                      draggingId === task.id && 'opacity-40'
                    )}
                  >
                    {task.image && (
                      <div className="mb-2 overflow-hidden rounded-lg border border-border/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={task.image} alt="" className="h-24 w-full object-cover" />
                      </div>
                    )}
                    <p className={cn(
                      'text-sm font-medium leading-snug line-clamp-3',
                      task.status === 'DONE' && 'line-through text-muted-foreground'
                    )}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <PriorityBadge priority={task.priority} />
                      {task.image && <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/50" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
