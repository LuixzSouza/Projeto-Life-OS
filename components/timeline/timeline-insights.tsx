// Painel de insights da Linha do Tempo: 4 métricas + heatmap de atividade
// (estilo GitHub, 15 semanas). Componente de servidor puro (sem hooks) — os
// dados chegam prontos de getActivityInsights().

import { Flame, Activity, TrendingUp, TrendingDown, Minus, CalendarCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityInsights } from "@/lib/activity";
import { moduleMeta } from "./timeline-meta";

const WEEKDAY_HINTS = ["", "seg", "", "qua", "", "sex", ""];

/** Intensidade do dia → opacidade do primário (0 = célula vazia). */
function heatClass(count: number, max: number): string {
  if (count === 0) return "bg-muted/50";
  const r = count / Math.max(1, max);
  if (r > 0.75) return "bg-primary";
  if (r > 0.5) return "bg-primary/70";
  if (r > 0.25) return "bg-primary/45";
  return "bg-primary/25";
}

function dayTitle(date: string, count: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${label} · ${count} ${count === 1 ? "registro" : "registros"}`;
}

export function TimelineInsights({ insights }: { insights: ActivityInsights }) {
  const { total, last7, prev7, streakDays, activeDays, topModule, topModuleCount, heatmap } = insights;
  const max = heatmap.reduce((a, d) => Math.max(a, d.count), 0);
  const trend = last7 - prev7;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const top = topModule ? moduleMeta(topModule) : null;

  // Colunas do grid = semanas (cada coluna tem 7 células, dom→sáb).
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < heatmap.length; i += 7) weeks.push(heatmap.slice(i, i + 7));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 gap-3 lg:col-span-4">
        <StatCard
          icon={<Activity className="h-4 w-4 text-primary" />}
          value={total.toLocaleString("pt-BR")}
          label="Registros no total"
        />
        <StatCard
          icon={<Flame className={cn("h-4 w-4", streakDays > 0 ? "text-orange-500" : "text-muted-foreground/40")} />}
          value={`${streakDays}d`}
          label="Sequência ativa"
        />
        <StatCard
          icon={<TrendIcon className={cn("h-4 w-4", trend > 0 ? "text-emerald-500" : trend < 0 ? "text-rose-500" : "text-muted-foreground/50")} />}
          value={String(last7)}
          label={`Esta semana (${trend >= 0 ? "+" : ""}${trend} vs anterior)`}
        />
        {top ? (
          <StatCard
            icon={<top.icon className="h-4 w-4" style={{ color: top.color }} />}
            value={top.label}
            label={`Módulo mais ativo · ${topModuleCount}`}
            small
          />
        ) : (
          <StatCard
            icon={<CalendarCheck2 className="h-4 w-4 text-muted-foreground/50" />}
            value="—"
            label="Módulo mais ativo"
            small
          />
        )}
      </div>

      {/* HEATMAP */}
      <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm lg:col-span-8">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Vida registrada · últimas {weeks.length} semanas
          </p>
          <p className="text-[10px] font-bold tabular-nums text-muted-foreground/60">
            {activeDays} {activeDays === 1 ? "dia ativo" : "dias ativos"}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Dicas de dia da semana */}
          <div className="grid shrink-0 grid-rows-7 gap-[3px] pr-1">
            {WEEKDAY_HINTS.map((h, i) => (
              <span key={i} className="flex h-3 items-center text-[8px] font-bold uppercase text-muted-foreground/40">{h}</span>
            ))}
          </div>
          <div className="flex flex-1 justify-between gap-[3px] overflow-hidden">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-rows-7 gap-[3px]">
                {week.map((d) => (
                  <span
                    key={d.date}
                    title={dayTitle(d.date, d.count)}
                    className={cn("h-3 w-3 rounded-[3px] transition-colors", heatClass(d.count, max))}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
          menos
          <span className="h-2.5 w-2.5 rounded-[3px] bg-muted/50" />
          <span className="h-2.5 w-2.5 rounded-[3px] bg-primary/25" />
          <span className="h-2.5 w-2.5 rounded-[3px] bg-primary/45" />
          <span className="h-2.5 w-2.5 rounded-[3px] bg-primary/70" />
          <span className="h-2.5 w-2.5 rounded-[3px] bg-primary" />
          mais
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, small }: { icon: React.ReactNode; value: string; label: string; small?: boolean }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border/40 bg-card p-3.5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/60">{icon}</span>
      <div className="mt-2.5">
        <p className={cn("font-black leading-none tracking-tight text-foreground", small ? "truncate text-base" : "text-xl tabular-nums")}>{value}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{label}</p>
      </div>
    </div>
  );
}
