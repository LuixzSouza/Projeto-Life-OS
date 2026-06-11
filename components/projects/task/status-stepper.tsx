'use client';

// Stepper de status do card de tarefas: substitui o antigo StatusBadge "morto"
// (parecia botão, não fazia nada). UM CLIQUE avança a tarefa no fluxo
// A Fazer → Em Progresso → Revisão → Concluído → (reabre). O trilho de pontos
// mostra onde a tarefa está no pipeline — affordance de "isto é interativo".

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Circle,
  CheckCircle2,
  HelpCircle,
  Timer,
  ChevronRight,
  RotateCcw,
  LucideIcon,
} from 'lucide-react';
import type { TaskStatus } from '@/types/task-types';

/** Ordem natural do pipeline (clicar avança; em DONE, reabre). */
export const STATUS_FLOW: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

interface StepConfig {
  label: string;
  chip: string;   // cores do pill (bg suave + texto forte — padrão dos badges)
  icon: LucideIcon;
}

const STEP_MAP: Record<TaskStatus, StepConfig> = {
  TODO: {
    label: 'A Fazer',
    chip: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20 hover:border-zinc-500/50 dark:text-zinc-400',
    icon: Circle,
  },
  IN_PROGRESS: {
    label: 'Em Progresso',
    chip: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:border-blue-500/50 dark:text-blue-400',
    icon: Timer,
  },
  REVIEW: {
    label: 'Revisão',
    chip: 'bg-purple-500/10 text-purple-600 border-purple-500/20 hover:border-purple-500/50 dark:text-purple-400',
    icon: HelpCircle,
  },
  DONE: {
    label: 'Concluído',
    chip: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:border-emerald-500/50 dark:text-emerald-400',
    icon: CheckCircle2,
  },
};

export function normalizeStatus(raw: string | null | undefined): TaskStatus {
  return (STATUS_FLOW as string[]).includes(raw ?? '') ? (raw as TaskStatus) : 'TODO';
}

interface StatusStepperProps {
  status: TaskStatus | string | null;
  onChange: (next: TaskStatus) => void;
  className?: string;
}

export function StatusStepper({ status, onChange, className }: StatusStepperProps) {
  const current = normalizeStatus(typeof status === 'string' ? status : null);
  const idx = STATUS_FLOW.indexOf(current);
  const next = STATUS_FLOW[(idx + 1) % STATUS_FLOW.length];
  const cfg = STEP_MAP[current];
  const Icon = cfg.icon;
  const isDone = current === 'DONE';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(next);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      title={isDone ? 'Concluído — clique para reabrir' : `${cfg.label} — clique para mover para ${STEP_MAP[next].label}`}
      className={cn(
        'group/step inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-lg border px-2 shadow-sm transition-all duration-300',
        'text-[8px] font-black uppercase tracking-[0.12em]',
        'hover:shadow-md active:scale-95',
        cfg.chip,
        className,
      )}
    >
      <Icon
        className={cn(
          'h-3 w-3 shrink-0 stroke-[3]',
          current === 'IN_PROGRESS' && 'animate-[spin_4s_linear_infinite]',
        )}
      />
      <span className="whitespace-nowrap">{cfg.label}</span>

      {/* Trilho do pipeline: 4 pontos, o atual alongado — lê-se "etapa 2 de 4" */}
      <span className="ml-0.5 flex items-center gap-[3px]" aria-hidden>
        {STATUS_FLOW.map((s, i) => (
          <span
            key={s}
            className={cn(
              'h-1 rounded-full bg-current transition-all duration-300',
              i === idx ? 'w-2.5 opacity-90' : i < idx ? 'w-1 opacity-60' : 'w-1 opacity-20',
            )}
          />
        ))}
      </span>

      {/* A ação fica explícita no hover: avançar (ou reabrir, no fim do fluxo) */}
      {isDone ? (
        <RotateCcw className="-mr-0.5 h-2.5 w-2.5 shrink-0 opacity-0 transition-all duration-300 group-hover/step:opacity-70" />
      ) : (
        <ChevronRight className="-ml-0.5 -mr-1 h-2.5 w-2.5 shrink-0 opacity-0 transition-all duration-300 group-hover/step:-mr-0.5 group-hover/step:opacity-70" />
      )}
    </button>
  );
}
