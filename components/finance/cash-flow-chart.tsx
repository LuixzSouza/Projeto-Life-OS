"use client";

import dynamic from "next/dynamic";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  TooltipProps,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";

/* -------------------------------------------------------------------------- */
/* TIPAGEM                                                                    */
/* -------------------------------------------------------------------------- */

export interface CashFlowPoint {
  month: string;
  income: number;
  expense: number;
}

const formatCompact = (val: number) =>
  val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : String(val);

/* -------------------------------------------------------------------------- */
/* TOOLTIP CUSTOMIZADO                                                        */
/* -------------------------------------------------------------------------- */

interface FlowTooltipProps extends TooltipProps<number, string> {
  payload?: Array<{ value: number; dataKey: string; payload: CashFlowPoint }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: FlowTooltipProps) => {
  const formatMoney = useFormatCurrency();
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;
  const balance = point.income - point.expense;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/40 bg-background/95 p-3 shadow-2xl backdrop-blur-md min-w-[180px]">
      <span className="text-[10px] uppercase text-muted-foreground font-black tracking-widest border-b border-border/40 pb-2">
        {label}
      </span>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-tighter text-emerald-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Entradas
        </span>
        <span className="font-black font-mono text-sm tracking-tight text-emerald-500">
          {formatMoney(point.income)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-tighter text-rose-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Saídas
        </span>
        <span className="font-black font-mono text-sm tracking-tight text-rose-500">
          {formatMoney(point.expense)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          Saldo
        </span>
        <span
          className={cn(
            "font-black font-mono text-sm tracking-tight",
            balance >= 0 ? "text-foreground" : "text-rose-500"
          )}
        >
          {formatMoney(balance)}
        </span>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* CONTEÚDO DO GRÁFICO                                                        */
/* -------------------------------------------------------------------------- */

function CashFlowChartContent({ data, className }: { data: CashFlowPoint[]; className?: string }) {
  const isEmpty = !data || data.length === 0 || data.every((d) => d.income === 0 && d.expense === 0);

  if (isEmpty) {
    return (
      <div
        className={cn(
          "h-[300px] w-full flex flex-col items-center justify-center bg-muted/5 rounded-[2rem] border-2 border-dashed border-border/40",
          className
        )}
      >
        <Activity className="h-7 w-7 text-muted-foreground/40 mb-2" />
        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/50">
          Sem dados de fluxo de caixa
        </p>
        <p className="text-xs text-muted-foreground/40 mt-1">Registre transações para ver a evolução mensal.</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} style={{ width: "100%", height: 300 }}>
      <ChartContainer minWidth={0} minHeight={0}>
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="cashIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cashExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} className="stroke-muted/30" />
          <XAxis
            dataKey="month"
            tick={{ fill: "currentColor", fontSize: 11, fontWeight: 700 }}
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            className="text-muted-foreground uppercase"
          />
          <YAxis
            tick={{ fill: "currentColor", fontSize: 10, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompact}
            className="text-muted-foreground"
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "currentColor", strokeOpacity: 0.1, strokeWidth: 40 }} />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#10b981"
            strokeWidth={2.5}
            fill="url(#cashIncome)"
            animationDuration={900}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="#f43f5e"
            strokeWidth={2.5}
            fill="url(#cashExpense)"
            animationDuration={900}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* WRAPPER DINÂMICO (SSR-SAFE)                                                 */
/* -------------------------------------------------------------------------- */

const CashFlowChartDynamic = dynamic(() => Promise.resolve(CashFlowChartContent), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full bg-muted/5 animate-pulse rounded-[2rem] border border-border/40 flex items-center justify-center">
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
        Carregando fluxo de caixa...
      </span>
    </div>
  ),
});

export function CashFlowChart(props: { data: CashFlowPoint[]; className?: string }) {
  return <CashFlowChartDynamic {...props} />;
}
