"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import type { VolumePoint } from "./gym-types";

interface VolumeChartProps {
  data: VolumePoint[];
}

export function VolumeChart({ data }: VolumeChartProps) {
  return (
    <Card className="border-border/40 shadow-sm bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Volume Carga Total (kg)
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[220px] w-full pt-0 pb-4 px-2">
        {data.length > 1 ? (
          <ChartContainer>
            <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
              />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const point = payload[0].payload as VolumePoint;
                    return (
                      <div className="bg-background text-foreground text-xs p-3 rounded-xl shadow-xl border border-border/50">
                        <p className="font-semibold mb-1">{point.fullDate}</p>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                          <p className="font-bold">{point.load.toLocaleString()} kg</p>
                        </div>
                        <p className="text-muted-foreground truncate max-w-[150px]">{point.title}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="load"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorLoad)"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-2 rounded-lg bg-muted/10 border border-dashed border-border/40">
            <Activity className="h-6 w-6 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium">Dados insuficientes</p>
              <p className="text-xs text-muted-foreground">Registre ao menos 2 treinos.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
