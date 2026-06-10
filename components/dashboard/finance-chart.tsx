"use client";

import dynamic from "next/dynamic";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  TooltipProps,
  ReferenceLine,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";

/* -------------------------------------------------------------------------------------------------
 * 1. TIPAGEM E COMPONENTES AUXILIARES
 * -----------------------------------------------------------------------------------------------*/

export interface FinanceData {
  name: string;
  total: number;
  type: 'INCOME' | 'EXPENSE';
  [key: string]: string | number;
}

interface CustomCursorProps {
  x?: number; y?: number; width?: number; height?: number;
}

interface FinanceChartTooltipProps extends TooltipProps<number, string> {
  label?: string; 
  payload?: Array<{ value: number; payload: FinanceData }>;
}

const CustomTooltip = ({ active, payload, label }: FinanceChartTooltipProps) => {
  const formatMoney = useFormatCurrency();
  if (active && payload && payload.length > 0) {
    const data = payload[0];
    const isIncome = data.payload.type === 'INCOME';

    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border/40 bg-background/95 p-3 shadow-2xl backdrop-blur-md min-w-[160px]">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <span className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">{label}</span>
          {isIncome ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : <TrendingDown className="h-3.5 w-3.5 text-rose-500" />}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">{isIncome ? 'Entrada' : 'Saída'}</span>
          <span className={cn("font-black font-mono text-sm tracking-tight", isIncome ? "text-emerald-500" : "text-rose-500")}>
            {formatMoney(data.value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomCursor = ({ x, y, width, height }: CustomCursorProps) => {
  if (typeof x !== 'number') return null;
  return <rect x={x} y={y} width={width} height={height} className="fill-muted/30 transition-all duration-200" rx={8} />;
};

/* -------------------------------------------------------------------------------------------------
 * 2. COMPONENTE DE CONTEÚDO (O Gráfico em si)
 * -----------------------------------------------------------------------------------------------*/

function FinanceChartContent({ data, title = "Fluxo de Caixa", className }: { data: FinanceData[], title?: string, className?: string }) {
  const isEmpty = !data || data.length === 0 || data.every(d => d.total === 0);

  if (isEmpty) {
    return (
      <div className={cn("h-[250px] w-full flex flex-col items-center justify-center bg-muted/5 rounded-[2rem] border-2 border-dashed border-border/40", className)}>
        <Activity className="h-6 w-6 text-muted-foreground/40 mb-2" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Dados insuficientes</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full space-y-3 sm:space-y-6", className)}>
      {/* Sem título quando o Card pai já o exibe (title="") — só a legenda. */}
      <div className={cn("flex flex-wrap items-center gap-2 px-2", title ? "justify-between" : "justify-end")}>
        {title && <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{title}</h4>}
        <div className="flex gap-3 sm:gap-4 text-[9px] font-black uppercase tracking-widest">
          <span className="flex items-center gap-1.5 sm:gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" /> Entradas</span>
          <span className="flex items-center gap-1.5 sm:gap-2"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" /> Saídas</span>
        </div>
      </div>

      <div style={{ width: '100%', height: 250 }}>
        <ChartContainer minWidth={0} minHeight={0}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} className="stroke-muted/30" />
            <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 900 }} tickLine={false} axisLine={false} tickMargin={15} className="text-muted-foreground uppercase tracking-tighter" />
            <YAxis tick={{ fill: 'currentColor', fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} className="text-muted-foreground" />
            {/* allowEscapeViewBox desligado: o tooltip vazando da viewport criava
                scroll horizontal fantasma no celular. */}
            <Tooltip content={<CustomTooltip />} cursor={<CustomCursor />} animationDuration={300} isAnimationActive={true} />
            <ReferenceLine y={0} stroke="currentColor" className="text-border" />
            <Bar dataKey="total" radius={[6, 6, 2, 2]} barSize={35} animationDuration={1500} animationEasing="ease-out">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.type === 'INCOME' ? 'url(#incomeGradient)' : 'url(#expenseGradient)'} className="hover:opacity-80 transition-opacity cursor-crosshair" />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * 3. WRAPPER DINÂMICO (A Solução para o Erro)
 * -----------------------------------------------------------------------------------------------*/

// Carregamos o conteúdo do gráfico desativando o SSR
// Isso remove o erro de width(-1) e evita o uso de useEffect/setState no mount
const FinanceChartDynamic = dynamic(() => Promise.resolve(FinanceChartContent), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] w-full bg-muted/5 animate-pulse rounded-2xl border border-border/40 flex items-center justify-center">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">Carregando…</span>
    </div>
  ),
});

export function FinanceChart(props: { data: FinanceData[], title?: string, className?: string }) {
  return <FinanceChartDynamic {...props} />;
}