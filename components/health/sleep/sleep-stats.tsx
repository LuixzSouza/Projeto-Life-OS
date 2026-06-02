"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Battery, TrendingUp, TrendingDown, Gauge, Repeat, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreLabel, type SleepInsights } from "@/lib/sleep-math";

const toneClasses: Record<string, string> = {
  emerald: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  blue: "text-blue-600 bg-blue-500/10 border-blue-500/20",
  amber: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  rose: "text-rose-600 bg-rose-500/10 border-rose-500/20",
};

export function SleepStats({ insights, goal }: { insights: SleepInsights; goal: number }) {
  const { score, avg7, debt, consistency, streak } = insights;
  const sl = scoreLabel(score);
  const onGoal = avg7 >= goal;

  return (
    <>
      {/* SLEEP SCORE */}
      <Card className="relative overflow-hidden border-border/60 bg-card shadow-sm h-full flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" /> Sleep Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-5xl font-black tracking-tighter text-foreground">{score || "--"}</span>
            <span className="text-xl font-bold text-muted-foreground">/100</span>
          </div>
          <Badge variant="outline" className={cn("border", toneClasses[sl.tone])}>{sl.label}</Badge>
        </CardContent>
      </Card>

      {/* MÉDIA 7 DIAS */}
      <Card className="relative overflow-hidden border-border/60 bg-card shadow-sm h-full flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Média (7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-5xl font-black tracking-tighter text-foreground">{avg7 || "--"}</span>
            <span className="text-xl font-bold text-muted-foreground">h</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("border", onGoal ? toneClasses.emerald : toneClasses.amber)}>
              {onGoal ? <><TrendingUp className="h-3 w-3 mr-1" /> Na meta</> : <><TrendingDown className="h-3 w-3 mr-1" /> Abaixo</>}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">Meta: {goal}h</span>
          </div>
        </CardContent>
      </Card>

      {/* BANCO DE SONO (DÍVIDA) */}
      <Card className="relative overflow-hidden border-border/60 bg-card shadow-sm h-full flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Battery className="h-4 w-4 text-primary" /> Banco de Sono
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1 mb-3">
            <span className={cn("text-5xl font-black tracking-tighter", debt > 0 ? "text-destructive" : "text-emerald-500")}>
              {debt > 0 ? `-${debt}` : `+${Math.abs(debt)}`}
            </span>
            <span className="text-xl font-bold text-muted-foreground">h</span>
          </div>
          <p className="text-xs text-muted-foreground leading-tight">
            {debt > 2 ? "Déficit acumulado — durma mais cedo para recuperar." : "Balanço saudável. Boa recuperação!"}
          </p>
        </CardContent>
      </Card>

      {/* CONSISTÊNCIA */}
      <Card className="relative overflow-hidden border-border/60 bg-card shadow-sm h-full flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Repeat className="h-4 w-4 text-primary" /> Consistência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-5xl font-black tracking-tighter text-foreground">{consistency || "--"}</span>
            <span className="text-xl font-bold text-muted-foreground">%</span>
          </div>
          {streak > 0 ? (
            <Badge variant="outline" className={cn("border", toneClasses.amber)}>
              <Flame className="h-3 w-3 mr-1" /> {streak} {streak === 1 ? "noite" : "noites"} na meta
            </Badge>
          ) : (
            <p className="text-xs text-muted-foreground leading-tight">Horários regulares melhoram a qualidade.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
