'use client';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ProgressBar } from './progress-bar';
import { DateBadge } from './date-badge';
import { PriorityBadge } from './priority-badge';
import { StatusBadge } from './status-badge';
import { QuickActionButton } from './quick-action-button';
import { Star, MoreHorizontal, Pin, Timer, GripVertical } from 'lucide-react';
import type { TaskBaseProps } from '@/types/task-types';
import { Reorder, motion } from 'framer-motion';

type TaskPriority = "HIGH" | "MEDIUM" | "LOW";
type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "REVIEW";

export function TaskListItem({
  task, isOverdue, isPinned, isStarred, isDone, progress, estimatedTime, onToggle, onToggleStar, onOpenModal,
}: TaskBaseProps) {
  
  const stopPropagation = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation();

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
          'group relative flex items-center gap-4 p-3 bg-card border border-border/40 rounded-2xl transition-all duration-300 mb-2 shadow-sm',
          'hover:border-primary/30 hover:bg-muted/5 hover:shadow-md',
          isDone && 'opacity-60 bg-muted/20',
          isPinned && 'border-l-4 border-l-amber-500'
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
            <img src={task.image} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpenModal}>
          <div className="flex items-start gap-2 mb-0.5">
            <h3 className={cn(
              'min-w-0 flex-1 text-sm font-bold tracking-tight leading-snug break-words line-clamp-2 transition-colors group-hover:text-primary',
              isDone ? 'line-through text-muted-foreground/60' : 'text-foreground'
            )}>
              {task.title}
            </h3>
            <div className="flex items-center gap-1 shrink-0 pt-0.5">
              {isPinned && <Pin size={10} className="text-amber-500 rotate-45 fill-current" />}
              {isStarred && <Star size={10} className="text-yellow-500 fill-current" />}
            </div>
          </div>
          <div className="flex items-center gap-3">
             <StatusBadge status={(task.status as TaskStatus) || "TODO"} className="h-4 px-1.5 text-[8px] uppercase font-black" />
             {task.description && <p className="text-xs text-muted-foreground/50 truncate max-w-[200px]">{task.description}</p>}
          </div>
        </div>

        {/* METADADOS TÁTICOS */}
        <div className="hidden md:flex items-center gap-4 shrink-0 px-4">
           {task.dueDate && <DateBadge date={task.dueDate} isOverdue={isOverdue} className="h-6 text-[9px] uppercase font-black" />}
           <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-muted-foreground/40 w-16">
              <Timer size={12} /> {estimatedTime}m
           </div>
        </div>

        {/* PROGRESSO EM LINHA */}
        <div className="hidden lg:block w-32 shrink-0">
           <ProgressBar value={progress} className="h-1" showLabel={false} />
        </div>

        {/* AÇÕES (HOVER) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all" onPointerDown={stopPropagation}>
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