"use client";

import { useMemo } from "react";
import { Workout } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Footprints, Clock, Trash2, Pencil, Zap, Timer, Target, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import type { ExerciseItem } from "./activity-types";

export function ActivityCard({ workout, onDelete }: { workout: Workout, onDelete: (id: string) => void }) {
  const isRun = workout.type === 'RUN' || workout.type === 'RUNNING';

  const parsedExercises = useMemo<ExerciseItem[]>(() => {
    try {
      return workout.exercises ? JSON.parse(workout.exercises) : [];
    } catch { return []; }
  }, [workout.exercises]);

  return (
    <Card className="group border-border/40 bg-card hover:border-primary/30 transition-all rounded-[2rem] shadow-sm hover:shadow-xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Indicador de Tipo */}
          <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner transition-all",
            isRun
              ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
              : "bg-primary/10 border-primary/20 text-primary"
          )}>
            {isRun ? <Footprints className="h-7 w-7" /> : <Dumbbell className="h-7 w-7" />}
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <h4 className="font-black text-foreground text-lg uppercase tracking-tight truncate leading-none">
                  {workout.title}
                </h4>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="outline" className="font-mono text-[9px] font-bold bg-muted/30 border-border/40 px-2">
                    <Clock className="h-3 w-3 mr-1 opacity-40" />
                    {format(new Date(workout.date), "HH:mm")}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[9px] font-bold bg-muted/30 border-border/40 px-2">
                    <Timer className="h-3 w-3 mr-1 opacity-40" />
                    {workout.duration} MIN
                  </Badge>
                </div>
              </div>

              {/* AÇÕES */}
              <div className="flex gap-1.5 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[2.5rem] border-border/40 p-8 shadow-2xl fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md">
                    <AlertDialogHeader className="flex flex-col items-center text-center">
                      <div className="h-14 w-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                        <Trash2 className="h-7 w-7" />
                      </div>
                      <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter">Excluir Log?</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm font-medium">Esta atividade será removida permanentemente do histórico biometrizado.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center gap-3 mt-6">
                      <AlertDialogCancel className="rounded-xl font-black uppercase text-[10px] tracking-widest h-12 px-6">Abortar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(workout.id)} className="rounded-xl bg-rose-500 text-white hover:bg-rose-600 font-black uppercase text-[10px] tracking-widest h-12 px-6 shadow-lg shadow-rose-500/20">Confirmar Exclusão</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Badges de Performance */}
            <div className="flex flex-wrap gap-2">
              {workout.feeling && (
                <Badge className={cn(
                  "text-[9px] font-black uppercase tracking-widest border-none px-2",
                  workout.feeling === 'GOOD' ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"
                )}>
                  Feel: {workout.feeling}
                </Badge>
              )}
              {workout.distance && <MetricBadge icon={Target} value={`${workout.distance} KM`} color="text-blue-500" />}
              {workout.pace && <MetricBadge icon={Zap} value={`${workout.pace}/KM`} color="text-amber-500" />}
            </div>

            {/* LISTA DE EXERCÍCIOS (Se existir) */}
            {parsedExercises.length > 0 && (
              <div className="pt-4 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {parsedExercises.map((ex, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground bg-muted/20 p-2 rounded-lg border border-border/40">
                    <span className="text-foreground uppercase truncate">{ex.name}</span>
                    {ex.weight && <span className="ml-auto text-primary font-mono tabular-nums">{ex.weight}kg</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBadge({ icon: Icon, value, color }: { icon: LucideIcon, value: string, color: string }) {
  return (
    <Badge variant="outline" className={cn("border-current/20 bg-current/5 gap-1.5 font-mono text-[9px] font-black", color)}>
      <Icon className="h-3 w-3" /> {value}
    </Badge>
  );
}
