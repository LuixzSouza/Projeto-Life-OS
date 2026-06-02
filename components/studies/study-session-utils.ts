// Tipos, configuração e helpers da lista de sessões de estudo.
import { Prisma } from "@prisma/client";

export type StudySessionWithSubject = Prisma.StudySessionGetPayload<{
  include: { subject: true };
}>;

export interface StudySessionListProps {
  sessions: StudySessionWithSubject[];
}

export const FOCUS_MAP = {
  1: {
    text: "Baixo",
    variant: "outline" as const,
    className: "bg-muted text-muted-foreground border-border",
  },
  2: {
    text: "Médio-Baixo",
    variant: "outline" as const,
    className:
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200",
  },
  3: {
    text: "Médio",
    variant: "outline" as const,
    className:
      "bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-200",
  },
  4: {
    text: "Alto",
    variant: "outline" as const,
    className:
      "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-200",
  },
  5: {
    text: "Intenso",
    variant: "primary" as const,
    className: "bg-primary text-primary-foreground",
  },
};

export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h > 0) return `${h}h ${m}m`;
  return `${m}min`;
};

export const formatRelativeDate = (date: Date) => {
  const now = new Date();

  const diff = now.getTime() - date.getTime();
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays}d atrás`;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
};
