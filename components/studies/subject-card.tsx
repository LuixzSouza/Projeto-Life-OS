"use client";

import React, { useMemo } from "react";
import { StudySubject } from "@prisma/client";
import {
  MoreVertical,
  Clock,
  Edit,
  Trash2,
  BookOpen,
  Calendar,
  BarChart3,
  Target,
  Star,
  CornerDownRight,
  Folder,
  CheckCircle2,
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
import { Progress } from "@/components/ui/progress";
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
  onToggleFavorite?: (id: string) => void;
  parentName?: string | null;
  isFavorite?: boolean;
  viewMode?: "grid" | "list"; // 🟢 Nova prop para controlar o layout interno
}

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const DIFFICULTY_CONFIG = {
  1: { label: "Iniciante", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  2: { label: "Fácil", color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/20" },
  3: { label: "Interm.", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  4: { label: "Difícil", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  5: { label: "Expert", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
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
  onToggleFavorite,
  parentName,
  isFavorite = false,
  viewMode = "grid", // Padrão é grid se não for passado
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
    const difficultyInfo = DIFFICULTY_CONFIG[difficultyKey];
    
    const goalMinutes = subject.goalMinutes && subject.goalMinutes > 0 ? subject.goalMinutes : 3600;
    const totalMinutes = subject.totalMinutes ?? 0;
    const percent = goalMinutes > 0 ? Math.min((totalMinutes / goalMinutes) * 100, 100) : 0;
    const isCompleted = percent >= 100;

    return {
      difficultyInfo,
      progressPercent: Math.round(percent),
      isCompleted,
      totalMinutesFormatted: formatDuration(totalMinutes),
      goalMinutesFormatted: formatDuration(goalMinutes),
      lastStudiedFormatted: formatDate(subject.lastStudied),
    };
  }, [subject]);

  const handleCardClick: React.MouseEventHandler = (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("button") || t.closest("[role='menuitem']") || t.getAttribute("role") === "menuitem") {
      return;
    }
    onDetailsClick(subject.id);
  };

  const cardColor = subject.color || "hsl(var(--primary))";

  // Renderização condicional baseada no viewMode
  if (viewMode === "list") {
    return (
      <Card
        onClick={handleCardClick}
        className={cn(
          "group relative overflow-hidden transition-all duration-300 ease-out cursor-pointer",
          "border border-border/60 bg-card hover:shadow-md",
          isCompleted && "border-emerald-500/30 bg-emerald-500/5"
        )}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1.5 opacity-80 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: cardColor }} />
        
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4 pl-6">
          
          {/* BLOCO 1: Ícone e Título */}
          <div className="flex items-center gap-4 flex-1 min-w-0 w-full md:w-auto">
            <div 
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border shadow-sm"
              style={{ backgroundColor: `${cardColor}15`, borderColor: `${cardColor}30`, color: cardColor }}
            >
              {subject.icon ? <span className="text-xl">{subject.icon}</span> : <BookOpen className="h-5 w-5" />}
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base truncate text-foreground group-hover:text-primary transition-colors">
                  {subject.title}
                </h3>
                {isCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                {parentName && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Folder className="h-3 w-3" /> {parentName} <CornerDownRight className="h-3 w-3 opacity-50" />
                  </span>
                )}
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 uppercase bg-muted text-muted-foreground border-none">
                  {subject.category ?? "Geral"}
                </Badge>
              </div>
            </div>
          </div>

          {/* BLOCO 2: Estatísticas Rápidas (Escondidas em telas muito pequenas) */}
          <div className="hidden sm:flex items-center gap-6 shrink-0 text-sm">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                 <Clock className="h-3 w-3" /> Foco
              </span>
              <span className="font-black text-foreground">{totalMinutesFormatted}</span>
            </div>
            <div className="flex flex-col items-end w-20">
               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                 <Target className="h-3 w-3" /> Progresso
              </span>
              <span className={cn("font-black", isCompleted ? "text-emerald-500" : "text-foreground")}>{progressPercent}%</span>
            </div>
          </div>

          {/* BLOCO 3: Barra de Progresso (Compacta) */}
          <div className="w-full md:w-32 lg:w-48 shrink-0">
            <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("absolute top-0 left-0 h-full transition-all duration-1000 ease-out rounded-full", isCompleted && "bg-emerald-500")}
                style={{ width: `${progressPercent}%`, backgroundColor: isCompleted ? undefined : cardColor }}
              />
            </div>
          </div>

          {/* BLOCO 4: Ações */}
          <div className="flex items-center gap-1 shrink-0 ml-auto md:ml-0">
             {onToggleFavorite && (
              <Button variant="ghost" size="icon" className={cn("h-8 w-8 transition-all", isFavorite ? "text-amber-400 opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-50 hover:opacity-100")} onClick={(e) => { e.stopPropagation(); onToggleFavorite(subject.id); }}>
                <Star className={cn("h-4 w-4", isFavorite && "fill-amber-400")} />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(subject.id); }}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(subject.id); }} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---------------------------------------------------------
  // MODO GRID (Padrão e Atualizado)
  // ---------------------------------------------------------
  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        "group relative overflow-hidden transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between h-full",
        "border border-border/60 bg-card hover:-translate-y-1 hover:shadow-xl",
        isCompleted && "border-emerald-500/30 shadow-emerald-500/5"
      )}
    >
      <div className="absolute top-0 left-0 right-0 h-1.5 opacity-80 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: cardColor }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at top right, ${cardColor}, transparent 70%)` }} />

      <CardContent className="p-5 flex flex-col gap-5 h-full relative z-10">
        
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {parentName && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                <Folder className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{parentName}</span>
                <CornerDownRight className="h-3 w-3 opacity-50" />
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: `${cardColor}15`, borderColor: `${cardColor}30`, color: cardColor }}>
                {subject.icon ? <span className="text-2xl drop-shadow-sm">{subject.icon}</span> : <BookOpen className="h-6 w-6" />}
              </div>

              <div className="min-w-0">
                <h3 className="font-extrabold text-base truncate text-foreground group-hover:text-primary transition-colors">
                  {subject.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[9px] px-2 py-0.5 uppercase tracking-wider font-semibold bg-muted text-muted-foreground border-none">
                    {subject.category ?? "Geral"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-50 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(subject.id); }}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(subject.id); }} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {onToggleFavorite && (
              <Button variant="ghost" size="icon" className={cn("h-8 w-8 transition-all", isFavorite ? "text-amber-400 opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-50 hover:opacity-100")} onClick={(e) => { e.stopPropagation(); onToggleFavorite(subject.id); }}>
                <Star className={cn("h-4 w-4", isFavorite && "fill-amber-400")} />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-muted/40 border border-border/50 group-hover:bg-muted/60 transition-colors">
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider"><Clock className="h-3 w-3" /> Foco Total</span>
            <span className="text-sm font-black text-foreground">{totalMinutesFormatted}</span>
          </div>

          <div className={cn("flex flex-col gap-1 p-2.5 rounded-xl border transition-colors", difficultyInfo.bg, difficultyInfo.border)}>
            <span className={cn("flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider", difficultyInfo.color)}><Target className="h-3 w-3" /> Nível</span>
            <span className={cn("text-sm font-black", difficultyInfo.color)}>{difficultyInfo.label}</span>
          </div>

          {(subject.sessionCount !== undefined || subject.lastStudied) && (
            <div className="col-span-2 flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/50 mt-1">
                {subject.sessionCount !== undefined && <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"><BarChart3 className="h-3.5 w-3.5" /> {subject.sessionCount} sessões</span>}
                {subject.lastStudied !== undefined && <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> Último: {lastStudiedFormatted}</span>}
            </div>
          )}
        </div>

        <div className="space-y-2 mt-auto pt-2">
          <div className="flex justify-between items-end text-xs">
            <span className={cn("font-bold flex items-center gap-1", isCompleted ? "text-emerald-500" : "text-muted-foreground")}>
              {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
              {isCompleted ? "Meta Concluída!" : "Progresso da Meta"}
            </span>
            <span className={cn("font-black", isCompleted ? "text-emerald-500" : "text-foreground")}>{progressPercent}%</span>
          </div>

          <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
            <div className={cn("absolute top-0 left-0 h-full transition-all duration-1000 ease-out rounded-full", isCompleted && "bg-emerald-500")} style={{ width: `${progressPercent}%`, backgroundColor: isCompleted ? undefined : cardColor }} />
          </div>

          <div className="text-[10px] font-semibold text-muted-foreground/70 text-right">Objetivo: {goalMinutesFormatted}</div>
        </div>

      </CardContent>
    </Card>
  );
}