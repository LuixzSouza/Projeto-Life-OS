"use client";

import { useMemo } from "react";
import { Workout } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Dumbbell, Footprints, Trash2, Tags, ChevronDown, StickyNote, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import type { ExerciseItem } from "./activity-types";

const FEELING_META: Record<string, { emoji: string; label: string }> = {
  GOOD: { emoji: "💪", label: "Bom" },
  TIRED: { emoji: "😮‍💨", label: "Cansativo" },
  HARD: { emoji: "🔥", label: "Intenso" },
};

// Volume total levantado: usa as séries reais (setLog) quando existem; senão o
// resumo carga × séries × reps do registro manual.
function workoutVolume(exercises: ExerciseItem[]): number {
  return exercises.reduce((acc, ex) => {
    if (ex.setLog && ex.setLog.length > 0) {
      return acc + ex.setLog.reduce((a, s) => a + (s.done ? (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0) : 0), 0);
    }
    const w = parseFloat(ex.weight) || 0;
    const sets = parseFloat(ex.sets || "0") || 0;
    const reps = parseFloat(ex.reps || "0") || 0;
    return acc + w * sets * reps;
  }, 0);
}

function fmtVolume(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1).replace(".", ",")}k kg` : `${Math.round(v)} kg`;
}

// Linha compacta e expansível do feed: toque mostra exercícios, notas e ações.
export function ActivityCard({ workout, expanded, onToggle, onDelete, onConnections }: {
  workout: Workout;
  expanded: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onConnections: (workout: Workout) => void;
}) {
  const isRun = workout.type === 'RUN' || workout.type === 'RUNNING';
  const feeling = workout.feeling ? FEELING_META[workout.feeling] : null;

  const parsedExercises = useMemo<ExerciseItem[]>(() => {
    try {
      return workout.exercises ? JSON.parse(workout.exercises) : [];
    } catch { return []; }
  }, [workout.exercises]);

  const volume = useMemo(() => (isRun ? 0 : workoutVolume(parsedExercises)), [isRun, parsedExercises]);

  // Linha de meta: hora · duração · (exercícios | distância/pace)
  const metaParts = [
    format(new Date(workout.date), "HH:mm"),
    `${workout.duration}min`,
    ...(isRun
      ? [workout.distance ? `${workout.distance}km` : null, workout.pace ? `${workout.pace}/km` : null]
      : [parsedExercises.length > 0 ? `${parsedExercises.length} exercício${parsedExercises.length > 1 ? "s" : ""}` : null]),
  ].filter(Boolean);

  return (
    <div className={cn("transition-colors", expanded && "bg-muted/20")}>
      {/* Linha principal (toque expande) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/30 sm:px-4"
      >
        <span className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          isRun ? "bg-blue-500/10 text-blue-500" : "bg-primary/10 text-primary"
        )}>
          {isRun ? <Footprints className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{workout.title}</span>
            {feeling && <span className="shrink-0 text-xs" title={feeling.label}>{feeling.emoji}</span>}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">{metaParts.join(" · ")}</span>
        </span>

        {volume > 0 && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-primary" title="Volume total levantado">
            {fmtVolume(volume)}
          </span>
        )}
        {isRun && workout.pace && (
          <span className="hidden shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-600 sm:inline-flex">
            <Zap className="h-3 w-3" /> {workout.pace}/km
          </span>
        )}

        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform", expanded && "rotate-180")} />
      </button>

      {/* Detalhes (expansão) */}
      {expanded && (
        <div className="space-y-2.5 px-3.5 pb-3 pl-[3.25rem] sm:px-4 sm:pl-16">
          {parsedExercises.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {parsedExercises.map((ex, i) => (
                <span key={i} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/40 bg-background px-2 py-1 text-[11px]">
                  <span className="truncate font-medium">{ex.name}</span>
                  {parseFloat(ex.weight) > 0 && (
                    <span className="shrink-0 font-mono tabular-nums text-primary">{ex.weight}kg</span>
                  )}
                  {ex.sets && ex.reps && (
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{ex.sets}×{ex.reps}</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {workout.notes && (
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <StickyNote className="mt-0.5 h-3 w-3 shrink-0 opacity-50" /> {workout.notes}
            </p>
          )}

          {/* Ações */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg border-border/40 text-xs" onClick={() => onConnections(workout)}>
              <Tags className="h-3.5 w-3.5" /> Tags & Anexos
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir &quot;{workout.title}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription>Este treino será removido permanentemente do histórico.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(workout.id)} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}
