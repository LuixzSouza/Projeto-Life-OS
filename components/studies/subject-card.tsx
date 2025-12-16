"use client";

import { StudySubject } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Clock,
  Edit,
  Trash2,
  Zap,
  Gauge,
  ArrowRight,
  Heart,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import React, { useCallback } from "react";
import { cn } from "@/lib/utils";

/* =========================
   TIPOS
========================= */

interface RichSubject extends StudySubject {
  totalMinutes: number;
}

interface SubjectCardProps {
  subject: RichSubject;
  onDetailsClick: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/* =========================
   CONSTANTES
========================= */

const DIFFICULTY_MAP = {
  1: { text: "Muito Fácil" },
  2: { text: "Fácil" },
  3: { text: "Padrão" },
  4: { text: "Difícil" },
  5: { text: "Expert" },
};

const DEFAULT_GOAL_MINUTES = 3600;

/* =========================
   HELPERS
========================= */

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/* =========================
   COMPONENTE
========================= */

export function SubjectCard({
  subject,
  onDetailsClick,
  onEdit,
  onDelete,
}: SubjectCardProps) {
  /* -------------------------
     DADOS DERIVADOS
  -------------------------- */

  const totalMinutes = subject.totalMinutes ?? 0;

  const goalMinutes =
    subject.goalMinutes && subject.goalMinutes > 0
      ? subject.goalMinutes
      : DEFAULT_GOAL_MINUTES;

  const progressToGoal = Math.min(
    (totalMinutes / goalMinutes) * 100,
    100
  );

  const difficultyLevel = Math.min(
    Math.max(subject.difficulty ?? 3, 1),
    5
  );

  const difficultyInfo =
    DIFFICULTY_MAP[difficultyLevel as keyof typeof DIFFICULTY_MAP];

  const SubjectIcon = subject.icon ? Zap : BookOpen;

  /* -------------------------
     HANDLERS
  -------------------------- */

  const handleCardClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (!target.closest("button")) {
        onDetailsClick(subject.id);
      }
    },
    [onDetailsClick, subject.id]
  );

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit(subject.id);
    },
    [onEdit, subject.id]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(subject.id);
    },
    [onDelete, subject.id]
  );

  /* =========================
     RENDER
  ========================= */

  return (
    <Card
      onClick={handleCardClick}
      className="
        bg-card
        border-border
        hover:border-primary/50
        transition-all
        duration-300
        group
        relative
        cursor-pointer
        shadow-sm
        hover:shadow-md
        hover:shadow-primary/20
      "
    >
      <CardContent className="p-4 space-y-4">
        {/* CABEÇALHO */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* ÍCONE */}
            <div
              className="
                h-10 w-10
                rounded-lg
                flex items-center justify-center
                bg-primary/10
                text-primary
                border border-border
                shadow-sm
                group-hover:scale-105
                transition-transform
              "
            >
              <SubjectIcon className="h-5 w-5" />
            </div>

            {/* TÍTULO */}
            <div>
              <h4 className="font-bold text-lg text-foreground">
                {subject.title}
              </h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3 w-3 text-primary" />
                Dificuldade:
                <span className="font-semibold text-foreground">
                  {difficultyInfo.text}
                </span>
              </p>
            </div>
          </div>

          {/* AÇÕES */}
          <div
            className="
              flex gap-1
              absolute right-2 top-2
              opacity-0
              group-hover:opacity-100
              transition-opacity
              p-1.5
              bg-card
              rounded-lg
              border border-border
              backdrop-blur
            "
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="space-y-2 pt-4 border-t border-border">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Foco Total:
              <span className="font-semibold text-foreground">
                {formatDuration(totalMinutes)}
              </span>
            </span>

            <span className="font-medium text-foreground">
              Meta: {formatDuration(goalMinutes)}
            </span>
          </div>

          <Progress
            value={progressToGoal}
            className="h-2 bg-muted"
          />

          <div className="text-[10px] text-muted-foreground flex justify-between items-center pt-1">
            {progressToGoal >= 100 ? (
              <span className="text-primary font-bold flex items-center gap-1">
                <Heart className="h-3 w-3 fill-primary" />
                Meta Atingida!
              </span>
            ) : (
              <span>{progressToGoal.toFixed(1)}% Completo</span>
            )}

            <ArrowRight
              className="
                h-4 w-4
                transition-transform
                group-hover:translate-x-1
                text-muted-foreground
                group-hover:text-primary
              "
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
