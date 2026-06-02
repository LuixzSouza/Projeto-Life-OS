"use client";

import React, { useMemo } from "react";
import { StudySubject } from "@prisma/client";
import {
  MoreVertical, Clock, Edit, Trash2, BookOpen, Calendar,
  BarChart3, Folder, CheckCircle2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface RichSubject extends StudySubject {
  totalMinutes: number;
  sessionCount?: number;
  lastStudied?: Date | string | null;
}

interface SubjectCardProps {
  subject: RichSubject;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDetailsClick: (id: string) => void;
  parentName?: string | null;
  viewMode?: "grid" | "list";
}

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const DIFFICULTY_CONFIG = {
  1: { label: "Iniciante", color: "text-emerald-600", bg: "bg-emerald-500/10" },
  2: { label: "Fácil", color: "text-teal-600", bg: "bg-teal-500/10" },
  3: { label: "Intermediário", color: "text-blue-600", bg: "bg-blue-500/10" },
  4: { label: "Difícil", color: "text-amber-600", bg: "bg-amber-500/10" },
  5: { label: "Expert", color: "text-rose-600", bg: "bg-rose-500/10" },
} as const;

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const formatDuration = (minutes = 0) => {
  const mins = Math.max(0, Math.round(minutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h${m > 0 ? ` ${m}m` : ""}`;
};

const formatDate = (date?: Date | string | null) => {
  if (!date) return "Nunca";
  try {
    return new Intl.DateTimeFormat("pt-BR", { month: "short", day: "numeric" }).format(new Date(date));
  } catch {
    return "Nunca";
  }
};

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export function SubjectCard({
  subject,
  onEdit,
  onDelete,
  onDetailsClick,
  parentName,
  viewMode = "grid",
}: SubjectCardProps) {

  const {
    difficultyInfo,
    progressPercent,
    isCompleted,
    totalMinutesFormatted,
    goalMinutesFormatted,
    lastStudiedFormatted,
  } = useMemo(() => {
    const difficultyKey = Math.max(1, Math.min(5, subject.difficulty ?? 3)) as keyof typeof DIFFICULTY_CONFIG;
    const goalMinutes = subject.goalMinutes && subject.goalMinutes > 0 ? subject.goalMinutes : 3600;
    const totalMinutes = subject.totalMinutes ?? 0;
    const percent = goalMinutes > 0 ? Math.min((totalMinutes / goalMinutes) * 100, 100) : 0;

    return {
      difficultyInfo: DIFFICULTY_CONFIG[difficultyKey],
      progressPercent: Math.round(percent),
      isCompleted: percent >= 100,
      totalMinutesFormatted: formatDuration(totalMinutes),
      goalMinutesFormatted: formatDuration(goalMinutes),
      lastStudiedFormatted: formatDate(subject.lastStudied),
    };
  }, [subject]);

  const handleCardClick: React.MouseEventHandler = (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("button") || t.closest("[role='menuitem']")) return;
    onDetailsClick(subject.id);
  };

  // A cor da matéria entra apenas como acento sutil no ícone (identidade sem poluir).
  const accent = subject.color || "hsl(var(--primary))";
  const hasMeta = typeof subject.sessionCount === "number" || subject.lastStudied !== undefined;

  const Menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(subject.id); }}>
          <Edit className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); onDelete(subject.id); }}
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const IconChip = (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl border border-border/50"
      style={{ backgroundColor: `${accent}14`, color: accent }}
    >
      {subject.icon ? <span className="leading-none">{subject.icon}</span> : <BookOpen className="h-5 w-5" />}
    </div>
  );

  /* --------------------------------- LISTA -------------------------------- */
  if (viewMode === "list") {
    return (
      <Card
        onClick={handleCardClick}
        className={cn(
          "group cursor-pointer overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm transition-all",
          "hover:border-primary/30 hover:shadow-md",
          isCompleted && "border-emerald-500/30"
        )}
      >
        <CardContent className="flex flex-col items-center gap-4 p-4 md:flex-row">
          <div className="flex w-full min-w-0 flex-1 items-center gap-3 md:w-auto">
            <div className="h-10 w-10 [&>span]:text-lg">{IconChip}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-bold text-foreground group-hover:text-primary transition-colors">{subject.title}</h3>
                {isCompleted && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {parentName && (
                  <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Folder className="h-3 w-3" /> {parentName}
                  </span>
                )}
                <Badge variant="secondary" className="border-none bg-muted px-1.5 py-0 text-[9px] uppercase text-muted-foreground">
                  {subject.category ?? "Geral"}
                </Badge>
                <span className={cn("rounded px-1.5 py-0 text-[9px] font-semibold", difficultyInfo.bg, difficultyInfo.color)}>
                  {difficultyInfo.label}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-6 text-sm sm:flex">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Foco</span>
              <span className="font-bold text-foreground">{totalMinutesFormatted}</span>
            </div>
            <div className="flex w-16 flex-col items-end">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Meta</span>
              <span className={cn("font-bold", isCompleted ? "text-emerald-600" : "text-foreground")}>{progressPercent}%</span>
            </div>
          </div>

          <div className="w-full shrink-0 md:w-32 lg:w-44">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("absolute left-0 top-0 h-full rounded-full transition-all duration-700", isCompleted ? "bg-emerald-500" : "bg-primary")}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="ml-auto shrink-0 md:ml-0">{Menu}</div>
        </CardContent>
      </Card>
    );
  }

  /* --------------------------------- GRADE -------------------------------- */
  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        "group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
        isCompleted && "border-emerald-500/30"
      )}
    >
      <CardContent className="flex h-full flex-col gap-4 p-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-11 w-11 [&>span]:text-xl">{IconChip}</div>
            <div className="min-w-0">
              {parentName && (
                <div className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Folder className="h-3 w-3" />
                  <span className="max-w-[130px] truncate">{parentName}</span>
                </div>
              )}
              <h3 className="truncate text-[15px] font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
                {subject.title}
              </h3>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Badge variant="secondary" className="border-none bg-muted px-2 py-0 text-[10px] font-medium uppercase text-muted-foreground">
                  {subject.category ?? "Geral"}
                </Badge>
                <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", difficultyInfo.bg, difficultyInfo.color)}>
                  {difficultyInfo.label}
                </span>
              </div>
            </div>
          </div>
          {Menu}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 font-semibold text-foreground">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {totalMinutesFormatted}
          </span>
          {typeof subject.sessionCount === "number" && (
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5" /> {subject.sessionCount} {subject.sessionCount === 1 ? "sessão" : "sessões"}
            </span>
          )}
          {hasMeta && (
            <span className="ml-auto flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {lastStudiedFormatted}
            </span>
          )}
        </div>

        {/* Progresso */}
        <div className="mt-auto space-y-1.5 pt-1">
          <div className="flex items-end justify-between text-xs">
            <span className={cn("flex items-center gap-1 font-medium", isCompleted ? "text-emerald-600" : "text-muted-foreground")}>
              {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
              {isCompleted ? "Meta concluída" : "Progresso da meta"}
            </span>
            <span className={cn("font-bold", isCompleted ? "text-emerald-600" : "text-foreground")}>{progressPercent}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out", isCompleted ? "bg-emerald-500" : "bg-primary")}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-right text-[10px] text-muted-foreground/70">Objetivo: {goalMinutesFormatted}</div>
        </div>

      </CardContent>
    </Card>
  );
}
