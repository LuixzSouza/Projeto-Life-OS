'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, Minus, LucideIcon } from 'lucide-react';

// --- TYPES ---
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

interface PriorityConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

interface PriorityBadgeProps {
  priority: TaskPriority | string;
  className?: string;
}

// --- CONFIGURAÇÃO (Seguindo o padrão Premium do Life OS) ---
const PRIORITY_MAP: Record<TaskPriority, PriorityConfig> = {
  HIGH: { 
    label: 'Alta', 
    color: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
    icon: ChevronUp 
  },
  MEDIUM: { 
    label: 'Média', 
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    icon: Minus 
  },
  LOW: { 
    label: 'Baixa', 
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    icon: ChevronDown 
  },
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  // Fallback seguro caso venha um valor inesperado do banco
  const config = PRIORITY_MAP[priority as TaskPriority] || PRIORITY_MAP.LOW;
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 h-6 transition-all duration-300 cursor-default shadow-sm border rounded-lg',
        'text-[9px] font-black uppercase tracking-[0.12em]',
        config.color,
        className
      )}
    >
      <Icon className="h-3 w-3 stroke-[3.5]" />
      <span>{config.label}</span>
    </Badge>
  );
}