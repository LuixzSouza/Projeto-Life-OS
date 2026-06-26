"use client";

// Card de matéria (redesign 10/jun): a cor da matéria vira identidade — anel
// de progresso ao redor do ícone (meta), wash sutil no topo, dificuldade em
// pontinhos e rodapé de estatísticas em 3 colunas. "▶ Estudar" abre o modo
// foco direto do card (study-launch.ts). Sem badges empilhadas: era isso que
// espremia o layout em colunas estreitas.

import React, { useMemo } from "react";
import Link from "next/link";
import { StudySubject } from "@prisma/client";
import {
  MoreVertical, Edit, Trash2, BookOpen, Folder, CheckCircle2, Play, Zap, FileText,
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
import { cn } from "@/lib/utils";
import { requestStudyStart } from "./study-launch";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface RichSubject extends StudySubject {
  totalMinutes: number;
  sessionCount?: number;
  lastStudied?: Date | string | null;
  /** Cartões vencidos nos baralhos desta matéria (revisão por matéria). */
  dueFlashcards?: number;
  /** Notas vinculadas a esta matéria (ponte Estudos -> Notas). */
  noteCount?: number;
}

interface SubjectCardProps {
  subject: RichSubject;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDetailsClick: (id: string) => void;
  parentName?: string | null;
  viewMode?: "grid" | "list";
  /** Matéria raiz da seção (destaque embutido — sem wrapper externo). */
  isRoot?: boolean;
}

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const DIFFICULTY_CONFIG = {
  1: { label: "Iniciante", dot: "#10b981" },
  2: { label: "Fácil", dot: "#14b8a6" },
  3: { label: "Intermediário", dot: "#3b82f6" },
  4: { label: "Difícil", dot: "#f59e0b" },
  5: { label: "Expert", dot: "#f43f5e" },
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
/* SUB-COMPONENTES VISUAIS                                                    */
/* -------------------------------------------------------------------------- */

/** Anel SVG de progresso da meta envolvendo o ícone/emoji da matéria. */
function ProgressRing({
  percent, color, size = 56, stroke = 4, children,
}: {
  percent: number; color: string; size?: number; stroke?: number; children: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, percent)) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          stroke={color} strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div
        className="absolute inset-[6px] flex items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}14`, color }}
      >
        {children}
      </div>
    </div>
  );
}

/** Dificuldade como 5 pontinhos (ocupa 1/4 do espaço de uma badge de texto). */
function DifficultyDots({ level }: { level: number }) {
  const info = DIFFICULTY_CONFIG[Math.max(1, Math.min(5, level)) as keyof typeof DIFFICULTY_CONFIG];
  return (
    <span className="flex items-center gap-[3px]" title={`Dificuldade: ${info.label}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full transition-colors"
          style={{ backgroundColor: i <= level ? info.dot : "hsl(var(--muted))" }}
        />
      ))}
    </span>
  );
}

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
  isRoot = false,
}: SubjectCardProps) {

  const {
    progressPercent,
    isCompleted,
    totalMinutesFormatted,
    remainingFormatted,
    lastStudiedFormatted,
    difficulty,
  } = useMemo(() => {
    const goalMinutes = subject.goalMinutes && subject.goalMinutes > 0 ? subject.goalMinutes : 3600;
    const totalMinutes = subject.totalMinutes ?? 0;
    const percent = goalMinutes > 0 ? Math.min((totalMinutes / goalMinutes) * 100, 100) : 0;

    return {
      progressPercent: Math.round(percent),
      isCompleted: percent >= 100,
      totalMinutesFormatted: formatDuration(totalMinutes),
      remainingFormatted: formatDuration(Math.max(0, goalMinutes - totalMinutes)),
      lastStudiedFormatted: formatDate(subject.lastStudied),
      difficulty: Math.max(1, Math.min(5, subject.difficulty ?? 3)),
    };
  }, [subject]);

  const due = subject.dueFlashcards ?? 0;
  const notes = subject.noteCount ?? 0;

  const handleCardClick: React.MouseEventHandler = (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("button") || t.closest("a") || t.closest("[role='menuitem']")) return;
    onDetailsClick(subject.id);
  };

  const startStudy: React.MouseEventHandler = (e) => {
    e.stopPropagation();
    requestStudyStart(subject.id);
  };

  const accent = isCompleted ? "#10b981" : subject.color || "hsl(var(--primary))";
  const ringColor = subject.color || "hsl(var(--primary))";

  const Menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Mais ações"
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
        <CardContent className="flex items-center gap-3 p-3 sm:p-4">
          <ProgressRing percent={progressPercent} color={ringColor} size={44} stroke={3}>
            {subject.icon
              ? <span className="text-base leading-none">{subject.icon}</span>
              : <BookOpen className="h-4 w-4" />}
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-bold text-foreground transition-colors group-hover:text-primary">{subject.title}</h3>
              {isCompleted && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {parentName && (
                <span className="flex min-w-0 items-center gap-1">
                  <Folder className="h-3 w-3 shrink-0" /> <span className="truncate">{parentName}</span>
                </span>
              )}
              <span className="truncate">{subject.category ?? "Geral"}</span>
              <DifficultyDots level={difficulty} />
            </div>
          </div>

          <div className="hidden shrink-0 flex-col items-end md:flex">
            <span className="text-sm font-bold tabular-nums text-foreground">{totalMinutesFormatted}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {isCompleted ? "meta ✓" : `${progressPercent}% da meta`}
            </span>
          </div>

          {notes > 0 && <NotesPill subjectId={subject.id} count={notes} />}
          {due > 0 && <ReviewPill subjectId={subject.id} due={due} />}

          <Button
            size="sm"
            variant="outline"
            onClick={startStudy}
            title="Abrir o modo foco nesta matéria"
            className="h-8 shrink-0 gap-1 rounded-lg px-2.5 text-[10px] font-black uppercase tracking-wider hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            <Play className="h-3 w-3" /> <span className="hidden sm:inline">Estudar</span>
          </Button>

          {Menu}
        </CardContent>
      </Card>
    );
  }

  /* --------------------------------- GRADE -------------------------------- */
  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
        isCompleted && "border-emerald-500/30",
        isRoot && "border-primary/25"
      )}
    >
      {/* Wash sutil com a cor da matéria (identidade sem poluir) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{ background: `linear-gradient(to bottom, ${accent}12, transparent)` }}
      />

      <CardContent className="relative flex h-full flex-col p-4">
        {/* Topo: anel de progresso + estudar/menu */}
        <div className="flex items-start justify-between gap-2">
          <ProgressRing percent={progressPercent} color={ringColor} size={56}>
            {subject.icon
              ? <span className="text-xl leading-none">{subject.icon}</span>
              : <BookOpen className="h-5 w-5" />}
          </ProgressRing>

          <div className="flex items-center gap-1">
            {notes > 0 && <NotesPill subjectId={subject.id} count={notes} />}
            {due > 0 && <ReviewPill subjectId={subject.id} due={due} />}
            <Button
              size="sm"
              variant="outline"
              onClick={startStudy}
              title="Abrir o modo foco nesta matéria"
              className={cn(
                "h-8 gap-1 rounded-lg px-2.5 text-[10px] font-black uppercase tracking-wider transition-all",
                "hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                "md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              )}
            >
              <Play className="h-3 w-3" /> Estudar
            </Button>
            {Menu}
          </div>
        </div>

        {/* Identificação */}
        <div className="mt-3 min-w-0">
          {(parentName || isRoot) && (
            <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">
              <Folder className="h-3 w-3 shrink-0" />
              <span className="truncate">{parentName ?? "Tópico raiz"}</span>
            </p>
          )}
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
            {subject.title}
          </h3>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {subject.category ?? "Geral"}
            </span>
            <DifficultyDots level={difficulty} />
          </div>
        </div>

        {/* Status da meta (1 linha — o anel já mostra o avanço) */}
        <p className={cn("mt-2.5 text-[11px] font-semibold", isCompleted ? "text-emerald-600" : "text-muted-foreground")}>
          {isCompleted ? (
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Meta concluída</span>
          ) : (
            <>
              <span className="font-bold text-foreground">{progressPercent}%</span> da meta · faltam {remainingFormatted}
            </>
          )}
        </p>

        {/* Rodapé: estatísticas em 3 colunas */}
        <div className="mt-auto grid grid-cols-3 divide-x divide-border/40 border-t border-border/40 pt-3 text-center">
          <FooterStat label="Foco" value={totalMinutesFormatted} />
          <FooterStat
            label="Sessões"
            value={typeof subject.sessionCount === "number" ? String(subject.sessionCount) : "—"}
          />
          <FooterStat label="Último" value={lastStudiedFormatted} />
        </div>
      </CardContent>
    </Card>
  );
}

/** Atalho de notas por matéria: leva às notas filtradas (/notes?subject=). */
function NotesPill({ subjectId, count }: { subjectId: string; count: number }) {
  return (
    <Link
      href={`/notes?subject=${subjectId}`}
      onClick={(e) => e.stopPropagation()}
      title={`Ver ${count} ${count === 1 ? "nota desta matéria" : "notas desta matéria"}`}
      className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-2.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
    >
      <FileText className="h-3 w-3" /> {count}
    </Link>
  );
}

/** Atalho de revisão por matéria: leva à fila filtrada (/flashcards/review?subject=). */
function ReviewPill({ subjectId, due }: { subjectId: string; due: number }) {
  return (
    <Link
      href={`/flashcards/review?subject=${subjectId}`}
      onClick={(e) => e.stopPropagation()}
      title={`Revisar ${due} ${due === 1 ? "cartão vencido" : "cartões vencidos"} desta matéria`}
      className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 text-[10px] font-black uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
    >
      <Zap className="h-3 w-3" /> {due}
    </Link>
  );
}

function FooterStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-1">
      <p className="truncate text-xs font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{label}</p>
    </div>
  );
}
