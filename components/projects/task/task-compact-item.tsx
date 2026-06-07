'use client';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { DateBadge } from './date-badge';
import { PriorityBadge } from './priority-badge';
import { QuickActionButton } from './quick-action-button';
import { Star, GripVertical, Layout } from 'lucide-react';
import type { TaskBaseProps } from '@/types/task-types';
import { Reorder, motion } from 'framer-motion';

type TaskPriority = "HIGH" | "MEDIUM" | "LOW";

export function TaskCompactItem({
  task, isOverdue, isStarred, isDone, onToggle, onToggleStar, onOpenModal,
}: TaskBaseProps) {
  
  const stopPropagation = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation();

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
          'group relative flex items-center gap-3 py-1.5 px-3 transition-all duration-200 border-b border-border/40 rounded-lg',
          'bg-transparent hover:bg-muted/30 hover:border-transparent',
          isDone && 'opacity-50'
        )}
      >
        {/* DRAG HANDLE */}
        <div 
          className="absolute left-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-primary/60"
          onPointerDown={(e) => e.preventDefault()}
        >
          <GripVertical size={14} />
        </div>

        <div onClick={stopPropagation} className="ml-3 flex items-center" onPointerDown={stopPropagation}>
          <Checkbox
            checked={isDone}
            onCheckedChange={onToggle}
            className="h-4 w-4 rounded-full border-muted-foreground/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 transition-all cursor-pointer shadow-inner"
          />
        </div>
        
        <div onClick={onOpenModal} className="flex-1 flex items-center justify-between gap-4 cursor-pointer min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <PriorityBadge priority={(task.priority as TaskPriority) || "MEDIUM"} className="h-5 px-1 text-[8px] w-8 flex justify-center" />
            <span className={cn(
              'text-sm truncate font-medium transition-colors',
              isDone ? 'line-through text-muted-foreground/60' : 'text-foreground/90 group-hover:text-foreground'
            )}>
              {task.title}
            </span>
            {task.image && <Layout size={12} className="text-primary/40 shrink-0" />}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {task.dueDate && (
              <DateBadge 
                date={task.dueDate} 
                isOverdue={isOverdue} 
                className="h-5 text-[9px] bg-transparent border-none opacity-60 group-hover:opacity-100 transition-opacity" 
              />
            )}
            
            <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all w-10 justify-end" onPointerDown={stopPropagation}>
              <QuickActionButton
                icon={<Star className={cn("h-3.5 w-3.5", isStarred && "fill-current")} />}
                label={isStarred ? "Remover" : "Priorizar"}
                onClick={onToggleStar}
                className={cn("h-7 w-7 rounded-lg", isStarred ? 'text-yellow-500 bg-yellow-500/10' : 'text-muted-foreground hover:text-yellow-500')}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}