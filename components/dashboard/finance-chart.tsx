"use client";

import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  CartesianGrid, 
  TooltipProps,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

// --- 1. TIPAGEM ESTRITA ---

export interface FinanceData {
  name: string;
  total: number;
  type: 'INCOME' | 'EXPENSE';
  [key: string]: string | number;
}

interface CustomCursorProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
}

interface FinanceChartTooltipProps extends TooltipProps<number, string> {
  label?: string; 
  payload?: Array<{
    value: number;
    payload: FinanceData;
    color?: string;
    dataKey?: string | number;
  }>;
}

interface FinanceChartProps {
  data: FinanceData[];
  title?: string;
  className?: string;
}

// --- 2. COMPONENTES VISUAIS ---

const CustomTooltip = ({ active, payload, label }: FinanceChartTooltipProps) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0];
    const financeData = data.payload;
    const isIncome = financeData.type === 'INCOME';

    return (
      <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 p-3 shadow-xl backdrop-blur-sm min-w-[160px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
          <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">
            {label}
          </span>
          {isIncome ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
          )}
        </div>

        {/* Valor */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span 
              className={cn(
                "h-2 w-2 rounded-full ring-2 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900",
                isIncome ? "bg-emerald-500 ring-emerald-500/30" : "bg-rose-500 ring-rose-500/30"
              )}
            />
            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
              {isIncome ? 'Entrada' : 'Saída'}
            </span>
          </div>
          <span className={cn(
            "font-bold font-mono text-sm tracking-tight",
            isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          )}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomCursor = (props: CustomCursorProps) => {
  const { x, y, width, height } = props;
  
  if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
    return null;
  }

  return (
    <rect 
      x={x} 
      y={y} 
      width={width} 
      height={height} 
      className="fill-zinc-100 dark:fill-zinc-800/60 transition-all duration-200"
      rx={6} 
    />
  );
};

// --- 3. COMPONENTE PRINCIPAL ---

export function FinanceChart({ data, title = "Fluxo de Caixa", className }: FinanceChartProps) {
  const isEmpty = !data || data.length === 0 || data.every(d => d.total === 0);

  if (isEmpty) {
    return (
      <div className={cn("h-[250px] w-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-500", className)}>
        <div className="p-3 bg-white dark:bg-zinc-900 rounded-full mb-3 shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800">
            <Activity className="h-5 w-5 text-zinc-400" />
        </div>
        <p className="font-medium text-xs text-zinc-400">Sem dados para exibir</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full space-y-4", className)}>
      
      {/* Header Minimalista */}
      <div className="flex items-center justify-between px-2">
         <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{title}</h4>
         <div className="flex gap-3 text-[10px] font-medium">
            <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
               Entradas
            </span>
            <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
               <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
               Saídas
            </span>
         </div>
      </div>

      <div className="h-[250px] w-full select-none">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -24, bottom: 0 }}>
            
            {/* Definições de Gradiente Premium */}
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.6} />
              </linearGradient>
            </defs>

            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="currentColor" 
              className="text-zinc-200 dark:text-zinc-800 opacity-50" 
            />
            
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 500 }} 
              tickLine={false} 
              axisLine={false} 
              tickMargin={12}
              className="text-zinc-400 dark:text-zinc-500"
            />
            
            <YAxis
              tick={{ fill: 'currentColor', fontSize: 10, fontFamily: 'monospace' }} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => {
                  if (value === 0) return "0";
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return value;
              }}
              className="text-zinc-400 dark:text-zinc-500"
            />
            
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={<CustomCursor />} 
              animationDuration={200}
              isAnimationActive={true}
            />
            
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeOpacity={0.5} />

            <Bar 
              dataKey="total" 
              radius={[4, 4, 2, 2]} 
              barSize={32} 
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.type === 'INCOME' ? 'url(#incomeGradient)' : 'url(#expenseGradient)'}
                  // ✅ CORREÇÃO AQUI: 
                  // 1. stroke-transparent para remover bordas indesejadas
                  // 2. outline-none e focus:outline-none para remover a borda branca ao clicar
                  // 3. style={{ outline: 'none' }} como garantia extra
                  className="transition-all duration-300 hover:opacity-80 cursor-pointer outline-none focus:outline-none"
                  style={{ outline: 'none' }}
                  strokeWidth={0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}