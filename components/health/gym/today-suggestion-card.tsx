"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Play, Dumbbell, Moon, ClipboardList, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MUSCLE_META, groupOfExercise } from "./exercise-db";
import { recommendToday, type TodayRec } from "./gym-analytics";
import { listWorkoutPlans } from "@/app/(dashboard)/health/actions";
import { savePendingStart } from "./session/session-storage";
import { divisionToStart } from "./session/plan-start";
import type { WorkoutPlan, PlanDivision } from "./session/plan-types";
import type { MuscleRecovery } from "./session/session-types";
import type { GymWorkout } from "./gym-types";

// "Treino de hoje": recomenda o grupo muscular a treinar cruzando recuperação +
// déficit de volume semanal + frescor, e sugere a divisão da ficha que melhor
// atende — iniciável com um toque. Se tudo está fadigado/saturado, sugere descanso.

const label = (g: string) => MUSCLE_META[g]?.label ?? g;

interface Match { plan: WorkoutPlan; div: PlanDivision; score: number }

// Divisão da ficha que melhor cobre os grupos recomendados (média p/ não premiar
// divisões enormes). Só retorna se o casamento for positivo.
function bestDivision(plans: WorkoutPlan[], recs: TodayRec[]): Match | null {
  const scoreOf = new Map(recs.map((r) => [r.group, r.avoid ? -0.5 : r.score]));
  let best: Match | null = null;
  for (const plan of plans) {
    for (const div of plan.divisions) {
      if (div.exercises.length === 0) continue;
      const groups = div.muscleGroups.length
        ? div.muscleGroups
        : Array.from(new Set(div.exercises.map((e) => e.group ?? groupOfExercise(e.name)).filter((g): g is string => !!g)));
      if (groups.length === 0) continue;
      const s = groups.reduce((acc, g) => acc + (scoreOf.get(g) ?? 0), 0) / groups.length;
      if (!best || s > best.score) best = { plan, div, score: s };
    }
  }
  return best && best.score > 0 ? best : null;
}

export function TodaySuggestionCard({
  workouts, recovery, onPlanTab,
}: {
  workouts: GymWorkout[];
  recovery: MuscleRecovery[];
  onPlanTab?: () => void;
}) {
  const router = useRouter();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);

  useEffect(() => {
    let active = true;
    listWorkoutPlans().then((p) => { if (active) setPlans(p); }).catch(() => { /* sem fichas, tudo bem */ });
    return () => { active = false; };
  }, []);

  const recs = useMemo(() => recommendToday(workouts, recovery), [workouts, recovery]);
  const picks = useMemo(() => recs.filter((r) => !r.avoid).slice(0, 3), [recs]);
  const match = useMemo(() => (plans.length ? bestDivision(plans, recs) : null), [plans, recs]);

  // Nada registrado ainda → não polui o dashboard vazio.
  if (workouts.length === 0 && recovery.every((r) => r.lastTrainedAt === null)) return null;

  const restDay = picks.length === 0;
  const top = picks[0];

  const start = () => {
    if (!match) return;
    savePendingStart(divisionToStart(match.plan, match.div));
    router.push("/health/gym/session");
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-4 shadow-sm sm:p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Sugestão de hoje
          </p>

          {restDay ? (
            <>
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <Moon className="h-5 w-5 text-indigo-400" /> Dia de recuperação
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Seus grupos principais ainda estão se recuperando ou já bem treinados esta semana. Que tal um cardio leve, mobilidade ou descanso?
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold">
                Treine <span className="text-primary">{label(top.group)}</span>
                {picks[1] && <span className="text-foreground"> + {label(picks[1].group)}</span>}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{top.reason}.</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {picks.map((p) => (
                  <span
                    key={p.group}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background px-2.5 py-1 text-xs font-medium"
                    title={p.reason}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: MUSCLE_META[p.group]?.color ?? "hsl(var(--primary))" }} />
                    {label(p.group)}
                    <span className="text-[10px] text-muted-foreground">· {p.sets} sér.</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Ação: iniciar a ficha que melhor casa, ou atalho pras fichas */}
        {!restDay && (
          <div className="shrink-0">
            {match ? (
              <div className="flex flex-col items-stretch gap-1.5">
                <Button onClick={start} className="h-11 gap-2 px-5 font-bold shadow-sm">
                  <Play className="h-4 w-4" /> Iniciar {match.div.label.split("—")[0].trim()}
                </Button>
                <span className="text-center text-[10px] text-muted-foreground">
                  {match.plan.name} · {match.div.exercises.length} exercícios
                </span>
              </div>
            ) : (
              <Button
                onClick={onPlanTab}
                variant="outline"
                className="h-11 gap-2 px-4 font-semibold"
                title="Criar uma ficha para esse treino"
              >
                <ClipboardList className="h-4 w-4" /> Montar ficha <ChevronRight className="h-4 w-4 opacity-60" />
              </Button>
            )}
          </div>
        )}
        {restDay && (
          <div className="shrink-0">
            <Button onClick={onPlanTab} variant="outline" className="h-10 gap-2 px-4 text-sm font-medium">
              <Dumbbell className="h-4 w-4" /> Ver fichas
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
