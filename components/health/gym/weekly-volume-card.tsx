"use client";

import { useMemo, useState } from "react";
import { BarChart3, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { MUSCLE_META } from "./exercise-db";
import { weeklyMuscleVolume, type VolumeStatus, type MuscleVolume } from "./gym-analytics";
import type { GymWorkout } from "./gym-types";

// Volume semanal por grupo muscular vs. marcos de hipertrofia (MEV/MAV/MRV).
// Cada barra mostra as séries de trabalho da semana e em qual zona caem —
// alertando sub ou sobretreino por músculo. Alterna entre semana atual e 7 dias.

const STATUS_META: Record<VolumeStatus, { label: string; tone: string; bar: string }> = {
  low: { label: "Baixo", tone: "text-amber-600 dark:text-amber-400", bar: "bg-amber-400" },
  maintenance: { label: "Manutenção", tone: "text-sky-600 dark:text-sky-400", bar: "bg-sky-400" },
  optimal: { label: "Ótimo", tone: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  high: { label: "Alto", tone: "text-orange-600 dark:text-orange-400", bar: "bg-orange-400" },
  over: { label: "Excesso", tone: "text-red-600 dark:text-red-400", bar: "bg-red-500" },
};

function VolumeRow({ mv }: { mv: MuscleVolume }) {
  const meta = STATUS_META[mv.status];
  const color = MUSCLE_META[mv.group]?.color;
  // Escala a barra pelo MRV (limite superior); marca a zona ótima (MEV→MAV).
  const scaleMax = Math.max(mv.landmarks.mrv, mv.sets);
  const pct = (n: number) => `${Math.min(100, (n / scaleMax) * 100)}%`;
  const label = MUSCLE_META[mv.group]?.label ?? mv.group;

  return (
    <li className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color ?? "hsl(var(--primary))" }} />
          {label}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-mono font-bold tabular-nums">{mv.sets}</span>
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", meta.tone)}>{meta.label}</span>
        </span>
      </div>
      {/* Trilha com zona ótima destacada + preenchimento até as séries feitas */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 bg-emerald-500/15"
          style={{ left: pct(mv.landmarks.mev), width: `calc(${pct(mv.landmarks.mav)} - ${pct(mv.landmarks.mev)})` }}
          title="Zona ótima (MEV→MAV)"
        />
        <div className={cn("absolute inset-y-0 left-0 rounded-full", meta.bar)} style={{ width: pct(mv.sets) }} />
      </div>
    </li>
  );
}

export function WeeklyVolumeCard({ workouts }: { workouts: GymWorkout[] }) {
  const [window, setWindow] = useState<0 | 1>(0); // 0 = só esta semana; 1 = últimas 2 semanas
  const data = useMemo(() => weeklyMuscleVolume(workouts, window), [workouts, window]);

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-3.5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5 text-primary" /> Volume por músculo
        </p>
        <div className="inline-flex overflow-hidden rounded-lg border border-border/50 text-[10px] font-semibold">
          <button type="button" onClick={() => setWindow(0)} className={cn("px-2 py-1 transition-colors", window === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>Semana</button>
          <button type="button" onClick={() => setWindow(1)} className={cn("px-2 py-1 transition-colors", window === 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>2 sem.</button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/40 bg-muted/10 py-8 text-center">
          <BarChart3 className="mb-1.5 h-5 w-5 text-muted-foreground/40" />
          <p className="text-xs font-medium">Sem séries {window === 0 ? "esta semana" : "nas 2 semanas"}</p>
          <p className="text-[11px] text-muted-foreground">Registre um treino para ver o volume.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2.5">
            {data.map((mv) => <VolumeRow key={mv.group} mv={mv} />)}
          </ul>
          <p className="mt-3 flex items-start gap-1.5 border-t border-border/30 pt-2.5 text-[10px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Séries de trabalho por grupo. A faixa verde é a zona ótima de hipertrofia (MEV→MAV); acima do máximo (MRV) tende ao excesso.
          </p>
        </>
      )}
    </div>
  );
}
