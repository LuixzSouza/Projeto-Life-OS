"use client";

import { History, Timer, Flame, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityStatsData } from "./activity-types";

export function ActivityStats({ stats }: { stats: ActivityStatsData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatBox label="Frequência" value={stats.count} unit="Logs" icon={History} color="text-primary" />
      <StatBox label="Carga de Tempo" value={stats.duration} unit="Min" icon={Timer} color="text-blue-500" isTime />
      <StatBox label="Energia Estimada" value={stats.calories} unit="Kcal" icon={Flame} color="text-orange-500" />
    </div>
  );
}

function StatBox({ label, value, unit, icon: Icon, color, isTime }: { label: string, value: number, unit: string, icon: LucideIcon, color: string, isTime?: boolean }) {
  return (
    <div className="bg-muted/10 border border-border/30 rounded-3xl p-5 flex items-center gap-5 shadow-inner group hover:bg-muted/20 transition-all">
      <div className={cn("h-12 w-12 rounded-2xl bg-background border border-border/40 shadow-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform", color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none">{label}</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl font-black tracking-tighter tabular-nums text-foreground">
            {isTime ? `${Math.floor(value / 60)}h ${value % 60}` : value}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground/40 uppercase">{unit}</span>
        </div>
      </div>
    </div>
  );
}
