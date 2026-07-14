"use client";

import { useMemo, useState, useEffect } from "react";
import { Flame, Minus, Plus, CalendarCheck } from "lucide-react";
import { consistency } from "./gym-analytics";
import type { GymWorkout } from "./gym-types";

// Consistência de treino: streak de semanas seguidas + anel de progresso da meta
// semanal. A meta fica no localStorage (frictionless, sem migração de banco).

const GOAL_KEY = "lifeos:gym:weekly-goal-v1";

export function ConsistencyCard({ workouts }: { workouts: GymWorkout[] }) {
  const c = useMemo(() => consistency(workouts), [workouts]);
  const [goal, setGoal] = useState(4);

  // Sincroniza a meta salva (store externo) só na montagem — ler no initializer
  // causaria mismatch de hidratação no SSR (mesmo padrão da sessão ao vivo).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GOAL_KEY);
      const n = raw ? parseInt(raw, 10) : NaN;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Number.isFinite(n) && n >= 1 && n <= 14) setGoal(n);
    } catch { /* ignore */ }
  }, []);

  const setGoalPersist = (n: number) => {
    const clamped = Math.max(1, Math.min(14, n));
    setGoal(clamped);
    try { window.localStorage.setItem(GOAL_KEY, String(clamped)); } catch { /* ignore */ }
  };

  const pct = Math.min(1, c.thisWeek / goal);
  const deg = Math.round(pct * 360);
  const done = c.thisWeek >= goal;

  if (c.totalWorkouts === 0) return null;

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-3.5 shadow-sm">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <CalendarCheck className="h-3.5 w-3.5 text-primary" /> Consistência
      </p>

      <div className="flex items-center gap-4">
        {/* Anel da meta semanal */}
        <div className="relative shrink-0" style={{ width: 84, height: 84 }}>
          <div
            className="h-full w-full rounded-full"
            style={{
              background: `conic-gradient(${done ? "hsl(142 71% 45%)" : "hsl(var(--primary))"} ${deg}deg, hsl(var(--muted)) ${deg}deg)`,
            }}
          />
          <div className="absolute inset-[6px] flex flex-col items-center justify-center rounded-full bg-card">
            <span className="font-mono text-xl font-black leading-none tabular-nums">{c.thisWeek}</span>
            <span className="text-[9px] font-semibold uppercase text-muted-foreground">/ {goal} sem.</span>
          </div>
        </div>

        {/* Streak + ajuste de meta */}
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-center gap-2">
            <Flame className={`h-6 w-6 ${c.streakWeeks > 0 ? "text-orange-500" : "text-muted-foreground/40"}`} />
            <div className="leading-tight">
              <p className="font-mono text-lg font-black tabular-nums">{c.streakWeeks}</p>
              <p className="-mt-0.5 text-[10px] font-medium text-muted-foreground">
                semana{c.streakWeeks === 1 ? "" : "s"} seguida{c.streakWeeks === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">Meta/semana</span>
            <div className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background">
              <button type="button" onClick={() => setGoalPersist(goal - 1)} className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground" aria-label="Diminuir meta"><Minus className="h-3.5 w-3.5" /></button>
              <span className="min-w-[1.5rem] text-center font-mono text-sm font-bold tabular-nums">{goal}</span>
              <button type="button" onClick={() => setGoalPersist(goal + 1)} className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground" aria-label="Aumentar meta"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 border-t border-border/30 pt-2.5 text-[11px] text-muted-foreground">
        {done
          ? "🎯 Meta da semana batida! Bora manter o ritmo."
          : `Faltam ${goal - c.thisWeek} treino${goal - c.thisWeek === 1 ? "" : "s"} pra bater a meta. `}
        <span className="text-muted-foreground/70">Média {c.weeklyAvg.toFixed(1)}/sem · {c.totalWorkouts} no total.</span>
      </p>
    </div>
  );
}
