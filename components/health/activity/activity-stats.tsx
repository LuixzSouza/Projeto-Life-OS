"use client";

import { History, Timer, Flame, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityStatsData } from "./activity-types";

// Resumo inline compacto (uma linha) — substitui as 3 caixas grandes antigas.
export function ActivityStats({ stats }: { stats: ActivityStatsData }) {
  const hours = Math.floor(stats.duration / 60);
  const mins = stats.duration % 60;
  const time = hours > 0 ? `${hours}h ${String(mins).padStart(2, "0")}min` : `${mins}min`;
  const kcal = stats.calories >= 1000 ? `~${(stats.calories / 1000).toFixed(1)}k` : `~${stats.calories}`;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <StatChip icon={History} color="text-primary" value={`${stats.count} treino${stats.count === 1 ? "" : "s"}`} />
      <Dot />
      <StatChip icon={Timer} color="text-blue-500" value={time} />
      <Dot />
      <StatChip icon={Flame} color="text-orange-500" value={`${kcal} kcal`} />
    </div>
  );
}

function StatChip({ icon: Icon, value, color }: { icon: LucideIcon; value: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className={cn("h-3.5 w-3.5", color)} />
      <span className="tabular-nums text-foreground/80">{value}</span>
    </span>
  );
}

function Dot() {
  return <span className="hidden text-muted-foreground/30 sm:inline">·</span>;
}
