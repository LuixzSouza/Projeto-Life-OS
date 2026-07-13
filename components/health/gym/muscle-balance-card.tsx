"use client";

import { useMemo } from "react";
import { Scale, AlertTriangle, CheckCircle2, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { muscleBalance, type MovementPattern, type BalanceStatus } from "./gym-analytics";
import type { GymWorkout } from "./gym-types";

// Equilíbrio Empurrar / Puxar / Pernas nas últimas semanas. Detecta o desbalanço
// clássico (empurra muito, puxa pouco → ombro à frente) e o "pula perna".

const PATTERN_META: Record<MovementPattern, { label: string; color: string }> = {
  push: { label: "Empurrar", color: "#ef4444" },   // peito/ombro/tríceps
  pull: { label: "Puxar", color: "#3b82f6" },       // costas/bíceps
  legs: { label: "Pernas", color: "#22c55e" },
  core: { label: "Core", color: "#14b8a6" },
};

const STATUS_TONE: Record<BalanceStatus, string> = {
  balanced: "text-emerald-600 dark:text-emerald-400",
  "push-heavy": "text-amber-600 dark:text-amber-400",
  "pull-heavy": "text-amber-600 dark:text-amber-400",
  "skip-legs": "text-orange-600 dark:text-orange-400",
  "low-data": "text-muted-foreground",
};

export function MuscleBalanceCard({ workouts }: { workouts: GymWorkout[] }) {
  const bal = useMemo(() => muscleBalance(workouts, 2), [workouts]);
  const max = Math.max(1, ...bal.patterns.map((p) => p.sets));
  const totalSets = bal.patterns.reduce((a, p) => a + p.sets, 0);

  if (totalSets === 0) return null;

  const ok = bal.status === "balanced";
  const StatusIcon = ok ? CheckCircle2 : bal.status === "low-data" ? Scale : AlertTriangle;

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-3.5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Scale className="h-3.5 w-3.5 text-primary" /> Equilíbrio muscular
        </p>
        {bal.pushPull !== null && Number.isFinite(bal.pushPull) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tabular-nums" title="Razão empurrar : puxar (ideal ≈ 1:1)">
            <ArrowLeftRight className="h-3 w-3" /> {bal.pushPull.toFixed(1)}:1
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {bal.patterns.map((p) => {
          const meta = PATTERN_META[p.pattern];
          return (
            <li key={p.pattern} className="flex items-center gap-2.5">
              <span className="w-16 shrink-0 text-xs font-medium">{meta.label}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(3, (p.sets / max) * 100)}%`, backgroundColor: meta.color }} />
              </div>
              <span className="w-7 shrink-0 text-right font-mono text-xs font-bold tabular-nums">{p.sets}</span>
            </li>
          );
        })}
      </ul>

      <p className={cn("mt-3 flex items-start gap-1.5 border-t border-border/30 pt-2.5 text-[11px] font-medium leading-relaxed", STATUS_TONE[bal.status])}>
        <StatusIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{bal.insight} <span className="font-normal text-muted-foreground/70">· últimas {bal.weeks} semanas</span></span>
      </p>
    </div>
  );
}
