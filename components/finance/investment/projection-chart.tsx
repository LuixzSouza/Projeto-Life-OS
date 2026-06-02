"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import type { ProjectionPoint } from "./investment-data";

interface ProjectionChartProps {
  data: ProjectionPoint[];
  compareSavings: boolean;
}

export function ProjectionChart({ data, compareSavings }: ProjectionChartProps) {
  const formatCurrency = useFormatCurrency();

  return (
    <div className="h-[300px] sm:h-[350px] w-full mt-6">
      <ChartContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="currentColor" strokeOpacity={0.06} />

          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            tickMargin={12}
            minTickGap={30} /* Evita que os anos fiquem encavalados se for 30/40 anos */
            interval="preserveStartEnd"
          />

          <YAxis
            width={60} /* Largura fixa evita que corte R$ 1.000k */
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
          />

          <Tooltip
            cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }}
            contentStyle={{
              backgroundColor: 'rgba(var(--background), 0.95)',
              backdropFilter: 'blur(8px)',
              borderColor: 'hsl(var(--border))',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: 'bold',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)'
            }}
            itemStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: number) => [formatCurrency(value), "Total Projetado"]}
            labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}
          />

          <Area
            type="monotone"
            dataKey="total"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            fill="url(#colorTotal)"
            activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
          />

          {compareSavings && (
            <Area
              type="monotone"
              dataKey="savings"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="4 4"
              fillOpacity={0}
              activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--muted-foreground))" }}
            />
          )}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
