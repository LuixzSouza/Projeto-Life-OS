'use client';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DateBadge } from './date-badge';
import { PriorityBadge } from './priority-badge';
import { QuickActionButton } from './quick-action-button';
import { Star, StarOff, MoreVertical } from 'lucide-react';
import type { TaskBaseProps } from '@/types/task-types';

export function TaskCompactItem({
  task,
  isOverdue,
  isStarred,
  onToggle,
  onToggleStar,
  onOpenModal,
}: TaskBaseProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 p-3 bg-card border border-border rounded-lg transition-all duration-300',
        'hover:border-primary/50 hover:shadow-md hover:shadow-primary/5',
        task.isDone && 'opacity-70 bg-muted/20',
      )}
    >
      <Checkbox
        checked={task.isDone}
        onCheckedChange={onToggle}
        className="h-4 w-4 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-sm font-medium truncate',
              task.isDone && 'line-through text-muted-foreground',
            )}
          >
            {task.title}
          </span>
          <div className="flex items-center gap-1">
            <DateBadge date={task.dueDate} isOverdue={isOverdue} />
            <PriorityBadge priority={task.priority as any} />
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <QuickActionButton
          icon={isStarred ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
          label={isStarred ? 'Remover destaque' : 'Destacar'}
          onClick={onToggleStar}
          className={isStarred ? 'text-yellow-500' : ''}
        />
        <QuickActionButton
          icon={<MoreVertical className="h-3.5 w-3.5" />}
          label="Mais opções"
          onClick={onOpenModal}
        />
      </div>
    </div>
  );
}