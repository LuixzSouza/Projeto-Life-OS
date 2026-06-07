'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Circle, 
  CheckCircle2, 
  HelpCircle, 
  Timer,
  LucideIcon 
} from 'lucide-react';

// --- TYPES ---
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'REVIEW';

interface StatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

interface StatusBadgeProps {
  status: TaskStatus | string;
  className?: string;
}

// --- CONFIGURAÇÃO (Foco em Hierarquia Visual e Semântica) ---
const STATUS_MAP: Record<TaskStatus, StatusConfig> = {
  TODO: { 
    label: 'A Fazer', 
    color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20 dark:text-zinc-400', 
    icon: Circle 
  },
  IN_PROGRESS: { 
    label: 'Progresso', 
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400', 
    icon: Timer 
  },
  REVIEW: { 
    label: 'Revisão', 
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400', 
    icon: HelpCircle 
  },
  DONE: { 
    label: 'Concluído', 
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400', 
    icon: CheckCircle2 
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Fallback seguro com tipagem forçada para o mapeamento
  const config = STATUS_MAP[status as TaskStatus] || STATUS_MAP.TODO;
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 h-6 transition-all duration-300 cursor-default shadow-sm border rounded-lg',
        'text-[9px] font-black uppercase tracking-[0.12em]',
        config.color,
        className
      )}
    >
      <Icon className={cn(
        "h-3 w-3 stroke-[3]",
        status === 'IN_PROGRESS' && "animate-[spin_4s_linear_infinite]" // Micro-animação sutil
      )} />
      <span>{config.label}</span>
    </Badge>
  );
}