'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CheckCircle2, Zap } from 'lucide-react';

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md'; // Opção de tamanho para diferentes contextos
}

export function ProgressBar({ 
  value, 
  className, 
  showLabel = true,
  size = 'sm' 
}: ProgressBarProps) {
  // Garantimos que o valor fique entre 0 e 100
  const safeValue = Math.min(100, Math.max(0, value));
  const isCompleted = safeValue === 100;
  const isStarted = safeValue > 0;

  return (
    <div className={cn("flex items-center gap-3 w-full group", className)}>
      <div className="relative flex-1">
        <Progress 
          value={safeValue} 
          className={cn(
            "w-full transition-all duration-500 bg-muted/40 border border-border/5",
            size === 'sm' ? "h-1.5" : "h-2.5"
          )}
          // Estilização do preenchimento
          indicatorClassName={cn(
            "transition-all duration-1000 ease-in-out shadow-[0_0_8px_rgba(var(--primary),0.2)]",
            isCompleted 
              ? "bg-emerald-500 shadow-emerald-500/20" 
              : "bg-gradient-to-r from-primary/60 via-primary to-primary/90"
          )}
        />
        
        {/* Efeito de brilho sutil para barras em andamento */}
        {isStarted && !isCompleted && (
          <div 
            className="absolute top-0 left-0 h-full w-4 bg-white/20 blur-md animate-shimmer pointer-events-none"
            style={{ left: `${safeValue}%` }}
          />
        )}
      </div>
      
      {showLabel && (
        <div className="flex items-center shrink-0">
          {isCompleted ? (
            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
               <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
            </div>
          ) : (
            <span className={cn(
              "text-[10px] font-black font-mono tracking-tighter transition-colors min-w-[32px] text-right",
              isStarted ? "text-foreground" : "text-muted-foreground/50"
            )}>
              {Math.round(safeValue)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}