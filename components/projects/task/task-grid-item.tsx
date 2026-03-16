'use client';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ProgressBar } from './progress-bar';
import { DateBadge } from './date-badge';
import { PriorityBadge } from './priority-badge';
import { StatusBadge } from './status-badge';
import { QuickActionButton } from './quick-action-button';
import { Star, Pin, Layout } from 'lucide-react';
import type { TaskBaseProps } from '@/types/task-types';
import { motion } from 'framer-motion';

// Tipagem estrita
type TaskPriority = "HIGH" | "MEDIUM" | "LOW";
type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "REVIEW";

export function TaskGridItem({
  task, isOverdue, isPinned, isStarred, progress, onToggle, onToggleStar, onOpenModal,
}: TaskBaseProps) {
  
  const stopPropagation = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation();

  return (
    // 1. Substituímos Reorder.Item por motion.div para estabilizar o Grid
    // 2. Removemos layoutId para evitar conflitos de cálculo 2D
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5 }}
      
      // -- EFEITO DE MICRO-INTERAÇÃO (Arrastar Elástico) --
      // Permite que o usuário puxe o card, mas ele volta ao lugar sem quebrar a tela
      drag
      dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
      dragElastic={0.15} 
      whileDrag={{ scale: 1.03, zIndex: 50, cursor: "grabbing" }}
      
      className={cn(
        'group relative flex flex-col h-full bg-card border border-border/40 rounded-[1.5rem] overflow-hidden transition-all duration-300',
        'hover:border-primary/40 hover:shadow-2xl',
        task.isDone && 'opacity-60 grayscale-[0.5]'
      )}
    >
      {/* HEADER / VISUAL */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/10 cursor-pointer" onClick={onOpenModal}>
        {task.image ? (
          <img src={task.image} alt={task.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 via-transparent to-muted/20">
            <Layout className="h-10 w-10 text-primary/10" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="absolute top-3 left-3 flex gap-2 z-10" onPointerDown={stopPropagation}>
          {isPinned && (
            <div className="p-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-amber-400 shadow-xl">
              <Pin className="h-3.5 w-3.5 rotate-45 fill-current" />
            </div>
          )}
        </div>

        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0" onPointerDown={stopPropagation}>
          <QuickActionButton
            icon={<Star className={cn("h-4 w-4", isStarred && "fill-current")} />}
            label="Priorizar"
            onClick={onToggleStar}
            className={cn("bg-black/40 backdrop-blur-md border-white/10", isStarred ? "text-yellow-400" : "text-white")}
          />
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-col flex-1 p-5 gap-4">
        <div className="flex items-start gap-3">
          <div onClick={stopPropagation} onPointerDown={stopPropagation} className="pt-0.5">
            <Checkbox
              checked={task.isDone}
              onCheckedChange={onToggle}
              className="h-5 w-5 rounded-full border-muted-foreground/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 transition-all shadow-inner cursor-pointer"
            />
          </div>
          
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpenModal} onPointerDown={stopPropagation}>
            <h3 className={cn(
              'font-black text-sm tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2',
              task.isDone ? 'line-through text-muted-foreground/50' : 'text-foreground'
            )}>
              {task.title}
            </h3>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap gap-1.5" onPointerDown={stopPropagation}>
          <StatusBadge status={(task.status as TaskStatus) || "TODO"} className="h-5 px-2 text-[8px] font-black uppercase tracking-[0.1em]" />
          <PriorityBadge priority={(task.priority as TaskPriority) || "MEDIUM"} className="h-5 px-2 text-[8px] font-black uppercase tracking-[0.1em]" />
          {task.dueDate && <DateBadge date={task.dueDate} isOverdue={isOverdue} className="h-5 px-2 text-[8px] font-black uppercase tracking-[0.1em]" />}
        </div>
      </div>

      {/* FOOTER */}
      <div className="px-5 pb-5" onPointerDown={stopPropagation}>
        <div className="flex justify-between items-center mb-2 px-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Integridade</span>
            <span className="text-[10px] font-mono font-black text-primary">{Math.round(progress)}%</span>
        </div>
        <ProgressBar value={progress} className="h-1.5" showLabel={false} />
      </div>
    </motion.div>
  );
}