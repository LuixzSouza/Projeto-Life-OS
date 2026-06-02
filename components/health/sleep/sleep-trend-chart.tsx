"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, TrendingUp } from "lucide-react";
import { Bar, BarChart, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { cn } from "@/lib/utils";
import type { SleepChartPoint } from "./sleep-types";

interface SleepTrendChartProps {
  data: SleepChartPoint[];
  goal?: number;
}

// Cor de cada noite: cinza (sem registro), primária (na meta) ou âmbar (abaixo).
const barColor = (hours: number, goal: number) => {
  if (hours <= 0) return "hsl(var(--muted))";
  return hours >= goal ? "hsl(var(--primary))" : "#f59e0b";
};

export function SleepTrendChart({ data, goal = 8 }: SleepTrendChartProps) {
  const maxHours = Math.max(goal + 1, ...data.map(d => d.hours || 0));
  const yMax = Math.ceil(Math.max(10, maxHours));

  return (
    <Card className="lg:col-span-2 border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-2 border-b border-border/40 bg-muted/20">
        <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2 py-1">
          <TrendingUp className="h-4 w-4 text-primary" /> Tendência (14 Dias)
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] pt-6">
        <ChartContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              interval="preserveStartEnd"
              minTickGap={10}
            />
            <YAxis
              domain={[0, yMax]}
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={42}
              tickFormatter={(v) => `${v}h`}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const point = payload[0].payload as SleepChartPoint;
                  const logged = point.hours > 0;
                  return (
                    <div className="bg-popover text-popover-foreground text-xs p-3 rounded-xl shadow-xl border border-border">
                      <p className="font-bold mb-1 text-foreground">{point.fullDate}</p>
                      {logged ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Moon className="h-3 w-3 text-primary" />
                            <span className="text-lg font-bold text-primary">{point.hours}h</span>
                          </div>
                          <p className={cn("mt-1 font-medium", point.hours >= goal ? "text-emerald-500" : "text-amber-500")}>
                            {point.hours >= goal ? "Descanso ideal" : "Abaixo da meta"}
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">Sem registro</p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine
              y={goal}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{ position: "right", value: `${goal}h`, fill: "hsl(var(--primary))", fontSize: 10 }}
            />
            <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={26}>
              {data.map((d, i) => (
                <Cell key={i} fill={barColor(d.hours, goal)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
