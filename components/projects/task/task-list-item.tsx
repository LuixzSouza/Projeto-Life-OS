'use client';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ProgressBar } from './progress-bar';
import { DateBadge } from './date-badge';
import { StatusStepper } from './status-stepper';
import { QuickActionButton } from './quick-action-button';
import { Star, MoreHorizontal, Pin, Timer, GripVertical, Lock, ListTodo } from 'lucide-react';
import type { TaskBaseProps } from '@/types/task-types';
import { Reorder, motion } from 'framer-motion';
import { useIsTaskBlocked } from './blocked-tasks-context';
import { parseChecklist } from '@/lib/task-checklist';

type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

// Prioridade como ponto de cor (mesma linguagem da visão compacta):
// presente sem roubar espaço da linha.
const PRIORITY_DOT: Record<TaskPriority, { className: string; label: string }> = {
  HIGH: { className: 'bg-rose-500', label: 'Prioridade alta' },
  MEDIUM: { className: 'bg-amber-500', label: 'Prioridade média' },
  LOW: { className: 'bg-zinc-400/70', label: 'Prioridade baixa' },
};

export function TaskListItem({
  task, isOverdue, isPinned, isStarred, isDone, status, progress, onToggle, onStatusChange, onToggleStar, onOpenModal,
}: TaskBaseProps) {

  const stopPropagation = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation();
  const dot = PRIORITY_DOT[(task.priority as TaskPriority)] ?? PRIORITY_DOT.MEDIUM;
  // Dependências: cadeado enquanto alguma bloqueadora estiver pendente.
  const isBlocked = useIsTaskBlocked(task.id) && !isDone;
  // Checklist (subtarefas): mini-progresso "n/m" quando existe.
  const checklist = parseChecklist(task.checklist);
  const checklistDone = checklist.filter((i) => i.done).length;
  // Tempo estimado: só aparece quando foi REALMENTE definido (o default de 60m
  // em toda linha era ruído sem informação).
  const hasEstimate = typeof task.estimatedTime === 'number' && task.estimatedTime > 0;
  // Progresso: só quando conta uma história (começou e não terminou).
  const showProgress = !isDone && progress > 0 && progress < 100;

  return (
    // ATENÇÃO: Reorder.Item é obrigatório para trocar de ordem com outros itens
    <Reorder.Item
      value={task}
      id={`task-${task.id}`}
      className="list-none w-full outline-none"
    >
      <motion.div
        whileHover={{ x: 4 }}
        whileDrag={{ scale: 1.02, zIndex: 50, cursor: "grabbing" }}
        className={cn(
          'group relative flex items-center gap-3 p-3 bg-card border border-border/40 rounded-2xl transition-all duration-300 mb-2 shadow-sm',
          'hover:border-primary/30 hover:bg-muted/5 hover:shadow-md',
          isDone && 'opacity-60 bg-muted/20',
          isPinned && 'border-l-4 border-l-amber-500',
          isOverdue && !isPinned && 'border-l-4 border-l-rose-500/60',
        )}
      >
        {/* ÁREA DE DRAG (Segure aqui para arrastar) */}
        <div
          className="flex items-center text-muted-foreground/20 cursor-grab active:cursor-grabbing px-1 hover:text-primary/60 transition-colors"
          onPointerDown={(e) => e.preventDefault()}
        >
          <GripVertical size={18} />
        </div>

        {/* CHECKBOX */}
        <div onClick={stopPropagation} onPointerDown={stopPropagation} className="shrink-0">
          <Checkbox
            checked={isDone}
            onCheckedChange={onToggle}
            className="h-5 w-5 rounded-full border-muted-foreground/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 transition-all shadow-inner cursor-pointer"
          />
        </div>

        {/* THUMBNAIL COMPACTA */}
        {task.image && (
          <div className="hidden sm:block w-14 h-10 rounded-lg overflow-hidden border border-border/50 shrink-0 cursor-pointer" onClick={onOpenModal}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={task.image} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpenModal}>
          {/* Linha 1: título + indicadores fixos */}
          <div className="flex items-start gap-2 mb-1">
            <h3 className={cn(
              'min-w-0 flex-1 text-sm font-bold tracking-tight leading-snug break-words line-clamp-2 transition-colors group-hover:text-primary',
              isDone ? 'line-through text-muted-foreground/60' : 'text-foreground',
            )}>
              {task.title}
            </h3>
            <div className="flex items-center gap-1 shrink-0 pt-0.5">
              {isBlocked && <Lock size={10} className="text-amber-500" aria-label="Bloqueada por outra tarefa" />}
              {isPinned && <Pin size={10} className="text-amber-500 rotate-45 fill-current" />}
              {isStarred && <Star size={10} className="text-yellow-500 fill-current" />}
            </div>
          </div>

          {/* Linha 2: tudo que importa numa olhada — stepper, prioridade, prazo
              (VISÍVEL também no celular), estimativa real e um eco da descrição */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span onClick={stopPropagation} onPointerDown={stopPropagation}>
              <StatusStepper status={status} onChange={onStatusChange} className="h-5 px-1.5" />
            </span>

            <span title={dot.label} className={cn('h-2 w-2 shrink-0 rounded-full', dot.className)} />

            {task.dueDate && (
              <DateBadge date={task.dueDate} isOverdue={isOverdue} className="h-5 px-1.5 text-[9px] uppercase font-black" />
            )}

            {checklist.length > 0 && (
              <span
                title="Subtarefas"
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-black uppercase',
                  checklistDone === checklist.length ? 'text-emerald-600' : 'text-muted-foreground/60',
                )}
              >
                <ListTodo size={11} /> {checklistDone}/{checklist.length}
              </span>
            )}

            {hasEstimate && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-muted-foreground/50">
                <Timer size={11} /> {task.estimatedTime}m
              </span>
            )}

            {task.description && (
              <p className="hidden sm:block min-w-0 flex-1 truncate text-xs text-muted-foreground/50">{task.description}</p>
            )}
          </div>
        </div>

        {/* PROGRESSO EM LINHA — só quando começou e não terminou */}
        {showProgress && (
          <div className="hidden lg:flex w-32 shrink-0 items-center gap-2">
            <ProgressBar value={progress} className="h-1 flex-1" showLabel={false} />
            <span className="text-[10px] font-mono font-black tabular-nums text-muted-foreground/60">{Math.round(progress)}%</span>
          </div>
        )}

        {/* AÇÕES (HOVER) */}
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all" onPointerDown={stopPropagation}>
          <QuickActionButton
            icon={<Star className={cn("h-4 w-4", isStarred && "fill-current")} />}
            label="Priorizar"
            onClick={onToggleStar}
            className={isStarred ? 'text-yellow-500' : ''}
          />
          <QuickActionButton icon={<MoreHorizontal className="h-4 w-4" />} label="Opções" onClick={onOpenModal} />
        </div>
      </motion.div>
    </Reorder.Item>
  );
}
