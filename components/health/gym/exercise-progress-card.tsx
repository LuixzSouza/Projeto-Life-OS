"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { TrendingUp, ChevronsUpDown, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChartContainer } from "@/components/ui/chart-container";
import { ExerciseThumb } from "./session/exercise-thumb";
import { workingSets, epley1RM, muscleOf } from "./gym-analytics";
import type { GymWorkout, Exercise } from "./gym-types";

// Progressão POR EXERCÍCIO: escolha um movimento e veja a curva de 1RM estimado
// (Epley) sessão a sessão + as últimas cargas. Responde "estou evoluindo neste
// exercício?" — o que o volume global não mostra.

interface SessionPoint {
  date: string;
  ts: number;
  oneRm: number;
  topWeight: number;
  topReps: number;
  perHand: boolean;
  label: string;
}
interface ExerciseSeries {
  name: string;
  group?: string;
  count: number;
  points: SessionPoint[];
}

function bestSetOf(ex: Exercise): { oneRm: number; weight: number; reps: number } {
  let best = { oneRm: 0, weight: 0, reps: 0 };
  for (const s of workingSets(ex)) {
    const rm = epley1RM(s.weight, s.reps, s.mult);
    if (rm > best.oneRm) best = { oneRm: rm, weight: s.weight, reps: s.reps };
  }
  return best;
}

export function ExerciseProgressCard({ workouts }: { workouts: GymWorkout[] }) {
  const series = useMemo<ExerciseSeries[]>(() => {
    const map = new Map<string, ExerciseSeries>();
    // Percorre do mais antigo p/ o mais novo para a curva ficar cronológica.
    const ordered = [...workouts].sort((a, b) => +new Date(a.date) - +new Date(b.date));
    for (const w of ordered) {
      for (const ex of w.exercises) {
        const name = ex.name.trim();
        if (!name) continue;
        const best = bestSetOf(ex);
        if (best.oneRm <= 0) continue;
        const key = name.toLowerCase();
        const d = new Date(w.date);
        const point: SessionPoint = {
          date: format(d, "dd/MM"),
          ts: +d,
          oneRm: Math.round(best.oneRm),
          topWeight: best.weight,
          topReps: best.reps,
          perHand: ex.equipment === "dumbbell",
          label: format(d, "dd 'de' MMM", { locale: ptBR }),
        };
        const cur = map.get(key);
        if (cur) { cur.points.push(point); cur.count++; }
        else map.set(key, { name, group: muscleOf(ex), count: 1, points: [point] });
      }
    }
    return Array.from(map.values())
      .filter((s) => s.points.length >= 1)
      .sort((a, b) => b.count - a.count);
  }, [workouts]);

  const [selected, setSelected] = useState<string | null>(null);
  const active = useMemo(() => {
    if (series.length === 0) return null;
    return series.find((s) => s.name.toLowerCase() === selected) ?? series[0];
  }, [series, selected]);

  if (!active) return null;

  const points = active.points;
  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.oneRm - first.oneRm;
  const deltaPct = first.oneRm > 0 ? Math.round((delta / first.oneRm) * 100) : 0;
  const allRm = points.map((p) => p.oneRm);
  const yMin = Math.max(0, Math.min(...allRm) - 5);
  const yMax = Math.max(...allRm) + 5;

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-3.5 shadow-sm">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5 text-primary" /> Evolução por exercício
      </p>

      {/* Seletor de exercício */}
      <div className="relative mb-3">
        <select
          value={active.name.toLowerCase()}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full appearance-none rounded-lg border border-border/50 bg-background py-2 pl-9 pr-8 text-sm font-semibold outline-none focus:border-primary/50"
          aria-label="Escolher exercício"
        >
          {series.map((s) => (
            <option key={s.name} value={s.name.toLowerCase()}>
              {s.name} ({s.count})
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
          <ExerciseThumb name={active.name} group={active.group} showPlay={false} className="h-6 w-6 rounded-md" />
        </span>
        <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {/* 1RM atual + variação desde a 1ª sessão registrada */}
      <div className="mb-2 flex items-end justify-between">
        <div>
          <span className="font-mono text-2xl font-black tabular-nums">{last.oneRm}</span>
          <span className="ml-1 text-xs font-semibold text-muted-foreground">kg · 1RM est.</span>
        </div>
        {points.length > 1 && (
          <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${delta > 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : delta < 0 ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-muted text-muted-foreground"}`}>
            {delta > 0 ? <ArrowUp className="h-3.5 w-3.5" /> : delta < 0 ? <ArrowDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            {delta > 0 ? "+" : ""}{delta} kg {deltaPct !== 0 && `(${deltaPct > 0 ? "+" : ""}${deltaPct}%)`}
          </span>
        )}
      </div>

      {/* Gráfico */}
      {points.length > 1 ? (
        <div className="h-[150px] w-full">
          <ChartContainer>
            <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickMargin={8} />
              <YAxis domain={[yMin, yMax]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
              <ReferenceLine y={first.oneRm} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" opacity={0.35} />
              <Tooltip
                cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }}
                content={({ active: on, payload }) => {
                  if (on && payload && payload.length) {
                    const p = payload[0].payload as SessionPoint;
                    return (
                      <div className="rounded-xl border border-border/50 bg-background p-2.5 text-xs shadow-xl">
                        <p className="mb-0.5 font-semibold">{p.label}</p>
                        <p className="font-bold text-primary">{p.oneRm} kg <span className="font-normal text-muted-foreground">1RM</span></p>
                        <p className="text-muted-foreground">melhor: {p.topWeight}{p.perHand ? "kg/mão" : "kg"} × {p.topReps}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line type="monotone" dataKey="oneRm" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ChartContainer>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border/40 bg-muted/10 px-3 py-6 text-center text-xs text-muted-foreground">
          Só uma sessão registrada — melhor série {first.topWeight}{first.perHand ? "kg/mão" : "kg"} × {first.topReps}. Registre mais para ver a curva.
        </p>
      )}
    </div>
  );
}
