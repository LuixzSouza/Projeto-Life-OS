'use client';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from './progress-bar';
import { DateBadge } from './date-badge';
import { PriorityBadge } from './priority-badge';
import { StatusBadge } from './status-badge';
import { QuickActionButton } from './quick-action-button';
import { Star, StarOff, MoreVertical, Pin, PinOff, Eye, Timer } from 'lucide-react';
import type { TaskBaseProps } from '@/types/task-types';

export function TaskListItem({
  task,
  isOverdue,
  isPinned,
  isStarred,
  progress,
  estimatedTime,
  onToggle,
  onToggleStar,
  onTogglePin,
  onOpenModal,
}: TaskBaseProps) {
  return (
    <div
      className={cn(
        'group relative flex flex-col sm:flex-row bg-card border border-border rounded-xl overflow-hidden transition-all duration-300',
        'hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 mb-3',
        task.isDone && 'opacity-70 bg-muted/20',
        isPinned && 'border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20',
        isStarred && 'bg-gradient-to-r from-yellow-50/50 to-transparent dark:from-yellow-950/20',
      )}
    >
      <div className={cn(
        'absolute left-0 top-0 h-full w-1',
        task.isDone ? 'bg-gradient-to-b from-green-500 to-green-600' : 'bg-primary'
      )} />
      
      {task.image && (
        <div className="relative">
          <div
            className="w-full sm:w-32 h-32 sm:h-auto relative cursor-pointer group/image shrink-0 bg-gradient-to-br from-muted to-muted/50 overflow-hidden"
            onClick={onOpenModal}
          >
            <img
              src={task.image}
              alt="Capa"
              className="w-full h-full object-cover transition-all duration-500 group-hover/image:scale-110 group-hover/image:brightness-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-2 left-2 opacity-0 group-hover/image:opacity-100 transition-opacity">
              <Eye className="w-3 h-3 text-white drop-shadow-lg" />
            </div>
          </div>
          {onTogglePin && (
            <QuickActionButton
              icon={isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
              label={isPinned ? 'Desfixar tarefa' : 'Fixar tarefa'}
              onClick={onTogglePin}
              className={cn(
                'absolute top-2 right-2 h-7 w-7 bg-background/80 backdrop-blur-sm shadow-sm',
                isPinned ? 'text-amber-600' : 'text-muted-foreground'
              )}
            />
          )}
        </div>
      )}
      
      <div className="flex flex-1 items-start gap-4 p-4">
        <div className="relative">
          <Checkbox
            checked={task.isDone}
            onCheckedChange={onToggle}
            className={cn(
              'h-5 w-5 rounded-full border-2 transition-all duration-300',
              'border-muted-foreground/40 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500',
              'hover:scale-110 hover:border-primary/60',
            )}
          />
          {task.isDone && (
            <div className="absolute inset-0 animate-ping opacity-20 bg-emerald-500 rounded-full" />
          )}
        </div>
        
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 cursor-pointer" onClick={onOpenModal}>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'font-semibold text-sm leading-tight transition-all line-clamp-1',
                    task.isDone && 'line-through text-muted-foreground/70',
                  )}
                >
                  {task.title}
                </span>
                {isStarred && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isPinned && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400"
                >
                  <Pin className="h-2.5 w-2.5 mr-1" /> Fixada
                </Badge>
              )}
              <QuickActionButton
                icon={isStarred ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
                label={isStarred ? 'Remover destaque' : 'Destacar tarefa'}
                onClick={onToggleStar}
                className={cn('h-7 w-7', isStarred ? 'text-yellow-500 hover:text-yellow-600' : '')}
              />
              <QuickActionButton
                icon={<MoreVertical className="h-3.5 w-3.5" />}
                label="Mais opções"
                onClick={onOpenModal}
                className="h-7 w-7"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5">
            <DateBadge date={task.dueDate} isOverdue={isOverdue} />
            <PriorityBadge priority={task.priority as any} />
            {task.status !== 'TODO' && <StatusBadge status={task.status as any} />}
            {progress > 0 && <ProgressBar value={progress} />}
            {estimatedTime && estimatedTime > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                <Timer className="h-2.5 w-2.5 mr-1" />
                {estimatedTime}min
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}