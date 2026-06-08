"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { Flame, CalendarDays, Clock, Gauge, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMinutes, type DailyPoint, type StudyStats } from "@/lib/studies-math";

interface StudyAnalyticsProps {
  daily: DailyPoint[];
  stats: StudyStats;
}

export function StudyAnalytics({ daily, stats }: StudyAnalyticsProps) {
  const maxMin = Math.max(30, ...daily.map((d) => d.minutes));

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:order-2 content-start">
        <Kpi icon={Clock} tone="primary" label="Hoje" value={formatMinutes(stats.todayMinutes)} />
        <Kpi icon={CalendarDays} tone="blue" label="Esta semana" value={formatMinutes(stats.weekMinutes)} />
        <Kpi
          icon={Flame}
          tone="amber"
          label="Sequência"
          value={`${stats.streak}`}
          unit={stats.streak === 1 ? "dia" : "dias"}
        />
        <Kpi
          icon={Gauge}
          tone="emerald"
          label="Foco médio"
          value={stats.avgFocus ? stats.avgFocus.toFixed(1) : "—"}
          unit={stats.avgFocus ? "/ 5" : ""}
        />
      </div>

      {/* GRÁFICO DE ATIVIDADE */}
      <Card className="lg:col-span-2 lg:order-1 border-border/50 bg-card shadow-sm">
        <CardHeader className="pb-2 border-b border-border/40">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 py-1">
            <BarChart3 className="h-4 w-4 text-primary" /> Atividade dos últimos 14 dias
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[240px] pt-6">
          <ChartContainer>
            <BarChart data={daily} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
                minTickGap={10}
              />
              <YAxis
                domain={[0, Math.ceil(maxMin / 30) * 30]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={42}
                tickFormatter={(v) => (v >= 60 ? `${Math.round((v / 60) * 10) / 10}h` : `${v}m`)}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const p = payload[0].payload as DailyPoint;
                    return (
                      <div className="bg-popover text-popover-foreground text-xs p-3 rounded-xl shadow-xl border border-border">
                        <p className="font-bold mb-1 text-foreground">{p.full}</p>
                        <p className={cn("font-medium", p.minutes > 0 ? "text-primary" : "text-muted-foreground")}>
                          {p.minutes > 0 ? formatMinutes(p.minutes) : "Sem estudo"}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {daily.map((d, i) => (
                  <Cell key={i} fill={d.minutes <= 0 ? "hsl(var(--muted))" : d.isToday ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.55)"} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </section>
  );
}

const TONES: Record<string, string> = {
  primary: "text-primary bg-primary/10",
  blue: "text-blue-600 bg-blue-500/10",
  amber: "text-amber-600 bg-amber-500/10",
  emerald: "text-emerald-600 bg-emerald-500/10",
};

function Kpi({
  icon: Icon, tone, label, value, unit,
}: {
  icon: React.ElementType;
  tone: keyof typeof TONES;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <Card className="border-border/40 bg-card shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("p-2 rounded-lg shrink-0", TONES[tone])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold leading-tight">
            {value} {unit && <span className="text-xs font-medium text-muted-foreground">{unit}</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
