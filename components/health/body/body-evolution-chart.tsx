"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { TrendingUp, TrendingDown, LineChart as LineChartIcon, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface BodyEvolutionPoint {
  date: string;          // ISO
  weight: number | null; // kg
  bodyFat: number | null; // %
}

// Variação entre o primeiro e o último ponto com valor (para o "desde o início").
function delta(points: BodyEvolutionPoint[], key: "weight" | "bodyFat"): { first: number; last: number; diff: number } | null {
  const vals = points.filter((p) => p[key] != null) as (BodyEvolutionPoint & Record<typeof key, number>)[];
  if (vals.length < 2) return null;
  const first = vals[0][key] as number;
  const last = vals[vals.length - 1][key] as number;
  return { first, last, diff: Math.round((last - first) * 10) / 10 };
}

// `neutral` = não há direção "boa" universal (caso do peso: depende de cutting/bulking),
// então mostra só a tendência sem julgar. Caso contrário, verde/vermelho por `lowerIsGood`.
function DeltaBadge({ label, unit, d, lowerIsGood = true, neutral = false }: { label: string; unit: string; d: { last: number; diff: number } | null; lowerIsGood?: boolean; neutral?: boolean }) {
  if (!d) return null;
  const down = d.diff < 0;
  const Icon = down ? TrendingDown : TrendingUp;
  const tone = neutral ? "text-muted-foreground" : (lowerIsGood ? down : !down) ? "text-emerald-500" : "text-rose-500";
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold tabular-nums">{d.last}{unit}</span>
        {d.diff !== 0 && (
          <span className={cn("flex items-center gap-0.5 text-[11px] font-semibold", tone)}>
            <Icon className="h-3 w-3" />
            {d.diff > 0 ? "+" : ""}{d.diff}{unit}
          </span>
        )}
      </div>
    </div>
  );
}

export function BodyEvolutionChart({ data }: { data: BodyEvolutionPoint[] }) {
  const chartData = useMemo(
    () =>
      data.map((p) => ({
        ...p,
        label: format(new Date(p.date), "dd/MM"),
        fullDate: format(new Date(p.date), "d 'de' MMM, yyyy", { locale: ptBR }),
      })),
    [data]
  );

  const weightDelta = useMemo(() => delta(data, "weight"), [data]);
  const fatDelta = useMemo(() => delta(data, "bodyFat"), [data]);
  const hasWeight = data.some((p) => p.weight != null);
  const hasFat = data.some((p) => p.bodyFat != null);
  const enoughPoints = chartData.length >= 2;

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-2 border-b border-border/40 bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-3 py-1">
          <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2">
            <LineChartIcon className="h-4 w-4 text-primary" /> Evolução Corporal
          </CardTitle>
          {enoughPoints && (
            <div className="flex items-center gap-6">
              <DeltaBadge label="Peso" unit="kg" d={weightDelta} neutral />
              <DeltaBadge label="Gordura" unit="%" d={fatDelta} lowerIsGood />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="h-[300px] w-full pt-6">
        {enoughPoints ? (
          <ChartContainer>
            <LineChart data={chartData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickMargin={10} minTickGap={20} />
              <YAxis yAxisId="weight" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}kg`} domain={["dataMin - 2", "dataMax + 2"]} width={45} />
              <YAxis yAxisId="fat" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={["dataMin - 2", "dataMax + 2"]} width={40} />
              <Tooltip
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof chartData)[number];
                  return (
                    <div className="bg-popover text-popover-foreground text-xs p-3 rounded-xl shadow-xl border border-border space-y-1">
                      <p className="font-bold text-foreground mb-1">{d.fullDate}</p>
                      {d.weight != null && (
                        <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /> Peso: <span className="font-bold">{d.weight} kg</span></p>
                      )}
                      {d.bodyFat != null && (
                        <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" /> Gordura: <span className="font-bold">{d.bodyFat}%</span></p>
                      )}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
              {hasWeight && (
                <Line yAxisId="weight" type="monotone" dataKey="weight" name="Peso (kg)" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 5 }} connectNulls />
              )}
              {hasFat && (
                <Line yAxisId="fat" type="monotone" dataKey="bodyFat" name="Gordura (%)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 5 }} connectNulls />
              )}
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-2">
            <Activity className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-foreground">Sem histórico suficiente</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Registre suas medidas em datas diferentes para ver a tendência de peso e % de gordura ao longo do tempo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
