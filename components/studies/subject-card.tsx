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
  TrendingUp,
  Star,
  StarOff,
  CornerDownRight,
  Folder,
  Target,
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

// Estendemos para garantir que o componente saiba lidar com dados extras se vierem do backend
interface RichSubject extends StudySubject {
  totalMinutes: number;
  sessionCount?: number; // Opcional, caso você adicione no futuro
  lastStudied?: Date | null; // Opcional
}

interface SubjectCardProps {
  subject: RichSubject;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDetailsClick: (id: string) => void;
  onToggleFavorite?: (id: string) => void; // Opcional, preparado para o futuro
  parentName?: string | null;
  isFavorite?: boolean;
}

/* -------------------------------------------------------------------------- */
/* CONSTANTS & HELPERS                                                        */
/* -------------------------------------------------------------------------- */

const DIFFICULTY_CONFIG = {
  1: { label: "Iniciante", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  2: { label: "Fácil", color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/20" },
  3: { label: "Interm.", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  4: { label: "Difícil", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  5: { label: "Expert", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
} as const;

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m > 0 ? `${m}m` : ""}`;
};

const formatDate = (date?: Date | null) => {
  if (!date) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", { month: "short", day: "numeric" }).format(new Date(date));
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
}: SubjectCardProps) {
  
  /* --- DADOS DERIVADOS --- */
  const difficultyInfo = DIFFICULTY_CONFIG[subject.difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG[3];
  
  const goalMinutes = subject.goalMinutes || 3600;
  const progressPercent = Math.min((subject.totalMinutes / goalMinutes) * 100, 100);
  const isCompleted = progressPercent >= 100;

  // Handler seguro para o clique no card
  const handleCardClick = (e: React.MouseEvent) => {
    // Evita disparar se clicar em botões internos
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[role='menuitem']")) return;
    onDetailsClick(subject.id);
  };

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "border border-border/60 bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
        "cursor-pointer flex flex-col justify-between h-full"
      )}
    >
      {/* HEADER VISUAL (Background Gradient Suave no Topo) */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardContent className="p-5 flex flex-col gap-5 h-full">
        
        {/* --- TOPO: Ícone, Título e Ações --- */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Breadcrumb (Hierarquia) */}
            {parentName && (
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2 animate-in fade-in slide-in-from-left-2">
                <Folder className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{parentName}</span>
                <CornerDownRight className="h-3 w-3 opacity-50" />
              </div>
            )}

            <div className="flex items-center gap-3">
              {/* Ícone com Container Premium */}
              <div className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-colors",
                "bg-primary/5 border-primary/10 text-primary group-hover:bg-primary/10 group-hover:border-primary/20"
              )}>
                {subject.icon ? (
                  <span className="text-xl leading-none">{subject.icon}</span>
                ) : (
                  <BookOpen className="h-6 w-6" />
                )}
              </div>

              {/* Título e Categoria */}
              <div className="min-w-0">
                <h3 className="font-bold text-base leading-tight text-foreground truncate group-hover:text-primary transition-colors">
                  {subject.title}
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-1 truncate">
                  {subject.category || "Geral"}
                </p>
              </div>
            </div>
          </div>

          {/* Menu de Ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mt-1 -mr-2 text-muted-foreground/50 hover:text-foreground data-[state=open]:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(subject.id)}>
                <Edit className="mr-2 h-4 w-4 text-muted-foreground" /> Editar
              </DropdownMenuItem>
              {onToggleFavorite && (
                <DropdownMenuItem onClick={() => onToggleFavorite(subject.id)}>
                  {isFavorite ? <StarOff className="mr-2 h-4 w-4 text-amber-500" /> : <Star className="mr-2 h-4 w-4 text-muted-foreground" />}
                  {isFavorite ? "Desfavoritar" : "Favoritar"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(subject.id)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* --- MEIO: Grid de Estatísticas (Clean) --- */}
        <div className="grid grid-cols-2 gap-3 py-2">
          {/* Tempo Estudado */}
          <div className="flex flex-col gap-1 p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
            <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground">
              <Clock className="h-3 w-3" /> Foco Total
            </span>
            <span className="text-sm font-bold text-foreground">
              {formatDuration(subject.totalMinutes)}
            </span>
          </div>

          {/* Dificuldade */}
          <div className={cn(
            "flex flex-col gap-1 p-2 rounded-lg border transition-colors",
            difficultyInfo.bg,
            difficultyInfo.border
          )}>
            <span className={cn("flex items-center gap-1.5 text-[10px] uppercase font-bold", difficultyInfo.color)}>
              <Target className="h-3 w-3" /> Nível
            </span>
            <span className={cn("text-sm font-bold", difficultyInfo.color)}>
              {difficultyInfo.label}
            </span>
          </div>

          {/* Opcional: Sessões (Se tiver dados) */}
          {subject.sessionCount !== undefined && (
            <div className="flex flex-col gap-1 p-2 rounded-lg bg-muted/30 border border-border/40">
              <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground">
                <BarChart3 className="h-3 w-3" /> Sessões
              </span>
              <span className="text-sm font-bold text-foreground">
                {subject.sessionCount}
              </span>
            </div>
          )}

          {/* Opcional: Última vez (Se tiver dados) */}
          {subject.lastStudied !== undefined && (
            <div className="flex flex-col gap-1 p-2 rounded-lg bg-muted/30 border border-border/40">
              <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground">
                <Calendar className="h-3 w-3" /> Último
              </span>
              <span className="text-sm font-bold text-foreground">
                {formatDate(subject.lastStudied)}
              </span>
            </div>
          )}
        </div>

        {/* --- RODAPÉ: Progresso --- */}
        <div className="mt-auto space-y-2">
          <div className="flex justify-between items-end text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              {isCompleted ? (
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Concluído
                </span>
              ) : (
                "Progresso da Meta"
              )}
            </span>
            <span className="font-bold text-foreground">
              {progressPercent.toFixed(0)}%
            </span>
          </div>
          
          <Progress 
            value={progressPercent} 
            className="h-1.5 bg-secondary" 
            indicatorClassName={isCompleted ? "bg-emerald-500" : "bg-primary"}
          />
          
          {/* Meta Label */}
          <div className="text-[10px] text-muted-foreground text-right opacity-70">
            Meta: {formatDuration(goalMinutes)}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}