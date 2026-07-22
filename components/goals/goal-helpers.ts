// Helpers compartilhados entre a visão em Lista e o Quadro (Kanban) de metas.
// Ficam fora do client component para que as duas visões leiam a MESMA regra de
// prazo/prioridade/coluna — sem duplicar lógica que precisaria ser corrigida em dois lugares.

import { BookMarked, Brain, CheckCircle2, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GOAL_STATUSES, type GoalStatus } from "@/lib/enums";

export type { GoalStatus };

/* ============================================================
   COLUNAS DO QUADRO (leitura de estudo, não de projeto)
============================================================ */

export interface GoalColumn {
  key: GoalStatus;
  /** Rótulo do quadro — vocabulário de estudo (Khan/Trello). */
  label: string;
  /** Rótulo curto usado no <Select> do diálogo. */
  formLabel: string;
  icon: LucideIcon;
  accent: string;
  /** Cor de fundo suave do cabeçalho da coluna. */
  soft: string;
}

export const GOAL_COLUMNS: GoalColumn[] = [
  { key: "TODO", label: "Para estudar", formLabel: "Para estudar", icon: BookMarked, accent: "text-muted-foreground", soft: "bg-muted/40" },
  { key: "IN_PROGRESS", label: "Estudando", formLabel: "Estudando", icon: Brain, accent: "text-blue-500", soft: "bg-blue-500/10" },
  { key: "REVIEW", label: "Revisar", formLabel: "Revisar", icon: RotateCcw, accent: "text-amber-500", soft: "bg-amber-500/10" },
  { key: "DONE", label: "Dominado", formLabel: "Dominado", icon: CheckCircle2, accent: "text-emerald-500", soft: "bg-emerald-500/10" },
];

/** Metas antigas (ou vindas da IA) podem trazer status fora do domínio: cai em "Estudando". */
export function normalizeGoalStatus(s: string | null | undefined): GoalStatus {
  const upper = (s ?? "").trim().toUpperCase();
  return (GOAL_STATUSES as readonly string[]).includes(upper) ? (upper as GoalStatus) : "IN_PROGRESS";
}

/** Coluna anterior/seguinte — usado pelas setas de mover no toque (arrastar não existe no mobile). */
export function shiftGoalStatus(current: GoalStatus, delta: -1 | 1): GoalStatus | null {
  const i = GOAL_COLUMNS.findIndex((c) => c.key === current);
  const next = GOAL_COLUMNS[i + delta];
  return next ? next.key : null;
}

/* ============================================================
   PRIORIDADE
============================================================ */

const PRIORITY_META: Record<number, { label: string; className: string }> = {
  1: { label: "Baixa", className: "bg-muted text-muted-foreground" },
  3: { label: "Média", className: "bg-amber-500/10 text-amber-600" },
  5: { label: "Alta", className: "bg-rose-500/10 text-rose-600" },
};

export function priorityMeta(p: number): { label: string; className: string } {
  if (p >= 5) return PRIORITY_META[5];
  if (p <= 1) return PRIORITY_META[1];
  return PRIORITY_META[3];
}

/* ============================================================
   PRAZOS
============================================================ */

export function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Dias entre hoje e o prazo (negativo = atrasada). Prazos gravados ao meio-dia UTC. */
export function daysUntil(iso: string): number {
  const target = new Date(iso);
  const today = new Date();
  const t = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const n = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((t - n) / 864e5);
}

export interface DeadlineChip {
  label: string;
  className: string;
  urgent: boolean;
}

/** Chip de prazo: atrasada (rosa) · vence hoje/em breve (âmbar) · futuro (neutro). */
export function deadlineChip(iso: string | null, isDone: boolean): DeadlineChip | null {
  if (!iso) return null;
  const formatted = fmtDate(iso)!;
  if (isDone) return { label: formatted, className: "text-muted-foreground", urgent: false };
  const d = daysUntil(iso);
  if (d < 0) return { label: `atrasada há ${Math.abs(d)}d`, className: "rounded-md bg-rose-500/10 px-1.5 py-0.5 font-bold text-rose-500", urgent: true };
  if (d === 0) return { label: "vence hoje", className: "rounded-md bg-amber-500/10 px-1.5 py-0.5 font-bold text-amber-600", urgent: true };
  if (d <= 7) return { label: `faltam ${d}d`, className: "rounded-md bg-amber-500/10 px-1.5 py-0.5 font-bold text-amber-600", urgent: false };
  return { label: formatted, className: "text-muted-foreground", urgent: false };
}
