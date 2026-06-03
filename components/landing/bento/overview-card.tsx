"use client";

import { LayoutDashboard, Flame, Target, Clock } from "lucide-react";
import { BaseCard } from "./base-card";
import { StatRow, ProgressBar } from "./bento-atoms";

// Produtividade da semana (%) — alimenta o sparkline.
const WEEK = [30, 45, 60, 85, 70, 92, 50];

export function OverviewCard() {
  return (
    <BaseCard
      title="Visão Geral"
      icon={LayoutDashboard}
      description="Seu dia em um número."
      className="col-span-1 min-h-[180px]"
    >
      <div className="flex h-full flex-col gap-3 p-4">
        {/* Score diário + streak */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold tracking-tighter text-foreground">84</span>
              <span className="mb-1.5 text-sm font-bold text-primary">%</span>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Score diário
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            <Flame className="size-3.5" /> 12
          </span>
        </div>

        {/* Sparkline semanal (accent) */}
        <div className="flex flex-1 items-end gap-1">
          {WEEK.map((v, i) => (
            <div key={i} className="flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t bg-gradient-brand opacity-80"
                style={{ height: `${v}%` }}
              />
            </div>
          ))}
        </div>

        {/* Métricas do dia */}
        <div className="space-y-2 border-t border-border/60 pt-3">
          <StatRow icon={Clock} label="Foco" value="4h 20m" />
          <div className="flex items-center gap-2.5">
            <div className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Target className="size-3.5" />
            </div>
            <ProgressBar value={80} className="flex-1" />
            <span className="shrink-0 text-xs font-bold tabular-nums text-foreground">8/10</span>
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
