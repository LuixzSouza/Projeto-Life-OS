'use client';

import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateBadgeProps {
  date: Date | null;
  isOverdue: boolean;
}

export function DateBadge({ date, isOverdue }: DateBadgeProps) {
  if (!date) return null;

  const formatDate = (d: Date) => {
    if (isToday(d)) return 'Hoje';
    if (isTomorrow(d)) return 'Amanhã';
    const diffDays = differenceInDays(d, new Date());
    if (diffDays > 0 && diffDays <= 7) return `Em ${diffDays} dias`;
    return format(d, 'dd MMM', { locale: ptBR });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1 h-6 font-medium border transition-colors',
              'hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10',
              isOverdue
                ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800 hover:bg-red-100'
                : 'text-muted-foreground border-border hover:bg-muted',
            )}
          >
            {isOverdue ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <CalendarDays className="h-3.5 w-3.5" />
            )}
            {formatDate(date)}
            {isOverdue && ' (Atrasada)'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}