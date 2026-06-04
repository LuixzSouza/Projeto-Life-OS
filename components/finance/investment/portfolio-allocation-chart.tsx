"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import type { Position } from "@/lib/portfolio-compute";

const PALETTE = [
  "#3B5BDB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#06B6D4", "#EC4899", "#84CC16", "#F97316", "#14B8A6",
];

interface SliceTooltipProps {
  active?: boolean;
  payload?: { payload: Record<string, string | number> }[];
  formatMoney?: (n: number) => string;
}

// Tooltip a nível de módulo (não recriar no render). O recharts injeta
// active/payload ao clonar o elemento passado em `content`.
function SliceTooltip({ active, payload, formatMoney }: SliceTooltipProps) {
  if (!active || !payload?.length || !formatMoney) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-border/60 bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs font-black uppercase tracking-wider text-foreground">{String(p.ticker)}</p>
      <p className="text-sm font-mono font-bold text-foreground">{formatMoney(Number(p.currentValue))}</p>
      <p className="text-[11px] text-muted-foreground">{Number(p.allocation).toFixed(1)}% da carteira</p>
    </div>
  );
}

export function PortfolioAllocationChart({ positions }: { positions: Position[] }) {
  const formatMoney = useFormatCurrency();
  const data = positions.filter((p) => p.currentValue > 0);

  if (data.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados para o gráfico.</div>;
  }

  // Recharts exige um array com index signature de string.
  const chartData: Record<string, string | number>[] = data.map((p) => ({
    id: p.id, ticker: p.ticker, currentValue: p.currentValue, allocation: p.allocation,
  }));

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="h-[180px] w-[180px] shrink-0">
        <ChartContainer>
          <PieChart>
            <Pie data={chartData} dataKey="currentValue" nameKey="ticker" cx="50%" cy="50%" innerRadius={52} outerRadius={84} paddingAngle={2} stroke="none">
              {chartData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip content={<SliceTooltip formatMoney={formatMoney} />} />
          </PieChart>
        </ChartContainer>
      </div>

      {/* Legenda */}
      <div className="flex-1 w-full space-y-1.5">
        {data.slice(0, 8).map((p, i) => (
          <div key={p.id} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            <span className="font-bold text-foreground">{p.ticker}</span>
            <span className="ml-auto font-mono text-muted-foreground tabular-nums">{p.allocation.toFixed(1)}%</span>
          </div>
        ))}
        {data.length > 8 && <p className="text-[11px] text-muted-foreground/60 pl-4.5">+{data.length - 8} outros</p>}
      </div>
    </div>
  );
}
