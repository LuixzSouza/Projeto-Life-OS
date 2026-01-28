'use client';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from './progress-bar';
import { DateBadge } from './date-badge';
import { PriorityBadge } from './priority-badge';
import { StatusBadge } from './status-badge';
import { QuickActionButton } from './quick-action-button';
import { Star, StarOff, MoreVertical } from 'lucide-react';
import type { TaskBaseProps } from '@/types/task-types';

export function TaskGridItem({
  task,
  isOverdue,
  isPinned,
  isStarred,
  progress,
  onToggle,
  onToggleStar,
  onOpenModal,
}: TaskBaseProps) {
  return (
    <div
      className={cn(
        'group relative flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden transition-all duration-300',
        'hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10',
        task.isDone && 'opacity-70 bg-muted/20',
        isPinned && 'border-l-4 border-l-amber-500',
        isStarred && 'bg-gradient-to-br from-yellow-50/50 to-transparent dark:from-yellow-950/20',
      )}
    >
      <div className={cn(
        'absolute left-0 top-0 h-full w-1',
        task.isDone ? 'bg-gradient-to-b from-green-500 to-green-600' : 'bg-primary'
      )} />
      
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Checkbox
                checked={task.isDone}
                onCheckedChange={onToggle}
                className="h-4 w-4 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
              <StatusBadge status={task.status as any} />
            </div>
            <h3
              className={cn(
                'font-semibold text-sm leading-tight line-clamp-2 mb-2',
                task.isDone && 'line-through text-muted-foreground',
              )}
            >
              {task.title}
            </h3>
          </div>
          <QuickActionButton
            icon={isStarred ? <Star className="h-3 w-3 fill-current" /> : <StarOff className="h-3 w-3" />}
            label={isStarred ? 'Remover destaque' : 'Destacar'}
            onClick={onToggleStar}
            className={isStarred ? 'text-yellow-500' : ''}
          />
        </div>
        
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
        )}
        
        {task.image && (
          <div
            className="w-full h-32 rounded-lg overflow-hidden mb-3 cursor-pointer group/image"
            onClick={onOpenModal}
          >
            <img
              src={task.image}
              alt="Capa"
              className="w-full h-full object-cover transition-transform duration-300 group-hover/image:scale-105"
            />
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-1.5">
          <DateBadge date={task.dueDate} isOverdue={isOverdue} />
          <PriorityBadge priority={task.priority as any} />
          {progress > 0 && <ProgressBar value={progress} />}
        </div>
      </div>
      
      <div className="mt-auto p-4 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Criado em {new Date(task.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </div>
          <QuickActionButton
            icon={<MoreVertical className="h-3 w-3" />}
            label="Mais opções"
            onClick={onOpenModal}
          />
        </div>
      </div>
    </div>
  );
}