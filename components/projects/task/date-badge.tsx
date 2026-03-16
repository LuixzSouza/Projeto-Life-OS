'use client';

import { format, isToday, isTomorrow, isYesterday, differenceInDays, isValid, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarClock, AlertCircle, Calendar, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateBadgeProps {
  date: Date | string | null;
  isOverdue?: boolean;
  className?: string;
}

export function DateBadge({ date, isOverdue: forceOverdue = false, className }: DateBadgeProps) {
  if (!date) return null;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(dateObj)) return null;

  const today = new Date();
  // Uma tarefa só está atrasada se for passado, não for hoje e não estiver concluída
  const overdue = forceOverdue || (isPast(dateObj) && !isToday(dateObj));
  const diff = differenceInDays(dateObj, today);

  const getStyle = () => {
    if (overdue) return "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-400 dark:border-rose-500/20 animate-pulse";
    if (isToday(dateObj)) return "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400";
    if (isTomorrow(dateObj)) return "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400";
    if (diff > 0 && diff <= 7) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400";
    return "bg-muted/30 text-muted-foreground border-border/50";
  };

  const formatDateLabel = (d: Date) => {
    if (isYesterday(d)) return 'Ontem';
    if (isToday(d)) return 'Hoje';
    if (isTomorrow(d)) return 'Amanhã';
    
    // Dentro da mesma semana: "Próx. Terça"
    if (diff > 1 && diff < 7) {
      return `Próx. ${format(d, 'eee', { locale: ptBR })}`;
    }
    
    // Diferentes anos
    if (d.getFullYear() !== today.getFullYear()) {
        return format(d, "dd MMM 'yy", { locale: ptBR }).replace('.', '');
    }

    // Padrão: "12 Mar"
    return format(d, 'dd MMM', { locale: ptBR }).replace('.', ''); 
  };

  const getRelativeTime = () => {
      if (overdue) return `Atrasado há ${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'dia' : 'dias'}`;
      if (isToday(dateObj)) return 'Expira hoje';
      if (diff > 0) return `Em ${diff} ${diff === 1 ? 'dia' : 'dias'}`;
      return null;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 h-6 text-[9px] font-black uppercase tracking-[0.1em] border transition-all cursor-default shadow-sm rounded-lg',
              getStyle(),
              className
            )}
          >
            {overdue ? (
              <AlertCircle className="h-3 w-3" />
            ) : isToday(dateObj) || isTomorrow(dateObj) ? (
              <CalendarClock className="h-3 w-3" />
            ) : (
              <Calendar className="h-3 w-3 opacity-70" />
            )}
            
            <span>{formatDateLabel(dateObj)}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-3 border-border/40 bg-background/95 backdrop-blur-md shadow-xl rounded-xl">
          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Timer className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">{getRelativeTime() || 'Prazo Final'}</span>
             </div>
             <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">
                    {format(dateObj, "dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-[10px] font-medium text-muted-foreground capitalize">
                    {format(dateObj, "EEEE", { locale: ptBR })}
                </p>
             </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}