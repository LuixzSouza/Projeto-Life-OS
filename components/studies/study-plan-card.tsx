"use client";

import { Flame, Target, Play, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requestStudyStart } from "./study-launch";

export interface PlanSubject {
  id: string;
  title: string;
  icon: string | null;
  color: string | null;
  progress: number;
  lastStudied: Date | string | null;
}

interface StudyPlanCardProps {
  todayMinutes: number;
  streak: number;
  /** Meta diária de minutos (padrão 30). */
  dailyGoal?: number;
  suggestions: PlanSubject[];
}

function lastStudiedLabel(date: Date | string | null): string {
  if (!date) return "nunca estudada";
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "estudada hoje";
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  return "faz tempo";
}

/**
 * "Plano de hoje": o foco do dia em um cartão. Junta a ofensiva (streak), a meta
 * diária de minutos e quais matérias atacar agora (as mais esquecidas / abaixo
 * da meta). Complementa a faixa de Revisão (que cuida dos flashcards) — aqui é a
 * sessão de foco. Botão "Estudar" abre o modo foco direto na matéria.
 */
export function StudyPlanCard({ todayMinutes, streak, dailyGoal = 30, suggestions }: StudyPlanCardProps) {
  const goalPct = dailyGoal > 0 ? Math.min(100, Math.round((todayMinutes / dailyGoal) * 100)) : 0;
  const goalHit = todayMinutes >= dailyGoal;
  const remaining = Math.max(0, dailyGoal - todayMinutes);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" /> Plano de hoje
        </h3>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600">
            <Flame className="h-3.5 w-3.5" /> {streak} {streak === 1 ? "dia" : "dias"} seguidos
          </span>
        )}
      </div>

      {/* Meta diária */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Target className="h-3.5 w-3.5" /> Meta diária
          </span>
          <span className={cn(goalHit ? "text-emerald-600" : "text-foreground")}>
            {todayMinutes} / {dailyGoal} min
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-700", goalHit ? "bg-emerald-500" : "bg-primary")}
            style={{ width: `${goalPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
          {goalHit ? "Meta batida hoje! 🎉 Cada minuto extra é lucro." : `Faltam ${remaining} min para a meta de hoje.`}
        </p>
      </div>

      {/* Sugestões de matérias */}
      <div className="mt-5 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Estudar agora</p>
        {suggestions.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Todas as matérias na meta. Bom descanso! 🎉
          </div>
        ) : (
          suggestions.map((s) => {
            const accent = s.color || "hsl(var(--primary))";
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-background px-3 py-2.5 transition-colors hover:border-primary/30"
              >
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base"
                  style={{ backgroundColor: `${accent}1f`, color: accent }}
                >
                  {s.icon || s.title.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {lastStudiedLabel(s.lastStudied)} · {s.progress}% da meta
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => requestStudyStart(s.id)}
                  className="h-8 shrink-0 gap-1.5 rounded-lg font-bold"
                >
                  <Play className="h-3.5 w-3.5" /> Estudar
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
