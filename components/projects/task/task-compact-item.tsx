'use client';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { DateBadge } from './date-badge';
import { QuickActionButton } from './quick-action-button';
import { Star, GripVertical, Pin, ImageIcon, Lock } from 'lucide-react';
import type { TaskBaseProps } from '@/types/task-types';
import { Reorder, motion } from 'framer-motion';
import { useIsTaskBlocked } from './blocked-tasks-context';

type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

// Densidade é o ponto da visão compacta: prioridade vira um PONTO de cor
// (o badge espremido de antes não cabia na linha) e o status só aparece
// quando diz algo além do checkbox (em progresso / revisão).
const PRIORITY_DOT: Record<TaskPriority, { className: string; label: string }> = {
  HIGH: { className: 'bg-rose-500', label: 'Prioridade alta' },
  MEDIUM: { className: 'bg-amber-500', label: 'Prioridade média' },
  LOW: { className: 'bg-zinc-400/70', label: 'Prioridade baixa' },
};

export function TaskCompactItem({
  task, isOverdue, isPinned, isStarred, isDone, status, onToggle, onToggleStar, onOpenModal,
}: TaskBaseProps) {

  const stopPropagation = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation();
  const dot = PRIORITY_DOT[(task.priority as TaskPriority)] ?? PRIORITY_DOT.MEDIUM;
  const isBlocked = useIsTaskBlocked(task.id) && !isDone;

  return (
    <Reorder.Item
      value={task}
      id={`task-${task.id}`}
      className="list-none w-full outline-none"
    >
      <motion.div
        whileHover={{ x: 4 }}
        whileDrag={{ scale: 1.01, zIndex: 50, cursor: "grabbing", backgroundColor: "var(--card)", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.15)" }}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl border-b border-border/40 py-2 pl-7 pr-3 transition-all duration-200',
          'bg-transparent hover:border-transparent hover:bg-muted/30',
          isDone && 'opacity-50',
        )}
      >
        {/* DRAG HANDLE (espaço reservado pelo pl-7 — não atropela o checkbox) */}
        <div
          className="absolute left-1.5 cursor-grab text-muted-foreground/30 opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100 hover:text-primary/60"
          onPointerDown={(e) => e.preventDefault()}
        >
          <GripVertical size={14} />
        </div>

        <div onClick={stopPropagation} onPointerDown={stopPropagation} className="flex items-center">
          <Checkbox
            checked={isDone}
            onCheckedChange={onToggle}
            className="h-4 w-4 cursor-pointer rounded-full border-muted-foreground/30 shadow-inner transition-all data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500"
          />
        </div>

        <div onClick={onOpenModal} className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Prioridade como ponto de cor (denso e legível) */}
            <span title={dot.label} className={cn('h-2 w-2 shrink-0 rounded-full', dot.className)} />

            <span className={cn(
              'truncate text-sm font-medium transition-colors',
              isDone ? 'line-through text-muted-foreground/60' : 'text-foreground/90 group-hover:text-foreground',
            )}>
              {task.title}
            </span>

            {/* Status só quando agrega: em progresso (azul) / revisão (roxo) */}
            {!isDone && status === 'IN_PROGRESS' && (
              <span className="shrink-0 rounded bg-blue-500/10 px-1.5 py-px text-[8px] font-black uppercase tracking-wider text-blue-500">
                Em progresso
              </span>
            )}
            {!isDone && status === 'REVIEW' && (
              <span className="shrink-0 rounded bg-purple-500/10 px-1.5 py-px text-[8px] font-black uppercase tracking-wider text-purple-500">
                Revisão
              </span>
            )}

            {isBlocked && <Lock size={11} className="shrink-0 text-amber-500" aria-label="Bloqueada por outra tarefa" />}
            {isPinned && <Pin size={11} className="shrink-0 rotate-45 fill-current text-amber-500" />}
            {task.image && <ImageIcon size={12} className="shrink-0 text-primary/40" />}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {task.dueDate && (
              <DateBadge
                date={task.dueDate}
                isOverdue={isOverdue}
                className="h-5 border-none bg-transparent text-[9px] opacity-60 transition-opacity group-hover:opacity-100"
              />
            )}

            <div
              className={cn(
                'flex w-8 items-center justify-end transition-all',
                isStarred ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100',
              )}
              onPointerDown={stopPropagation}
            >
              <QuickActionButton
                icon={<Star className={cn('h-3.5 w-3.5', isStarred && 'fill-current')} />}
                label={isStarred ? 'Remover destaque' : 'Priorizar'}
                onClick={onToggleStar}
                className={cn('h-7 w-7 rounded-lg', isStarred ? 'bg-yellow-500/10 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500')}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}
