"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, CartesianGrid, TooltipProps } from "recharts";
import { DollarSign } from "lucide-react";

// ✅ Exportamos a interface para uso em outros lugares (como no page.tsx)
export interface FinanceData {
  name: string;
  total: number;
  type: 'INCOME' | 'EXPENSE';
  [key: string]: string | number;
}

// ✅ CORREÇÃO DE TIPAGEM:
// Adicionamos 'label' explicitamente e tipamos o 'payload' de forma mais estrita
interface FinanceChartTooltipProps extends TooltipProps<number, string> {
  label?: string; 
  payload?: Array<{
    value: number;
    payload: FinanceData; // O objeto original dos dados
    color?: string;
  }>;
}

const CustomTooltip = ({ active, payload, label }: FinanceChartTooltipProps) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0];
    const financeData = data.payload;

    return (
      <div className="rounded-lg border border-border bg-popover p-3 shadow-lg min-w-[150px]">
        <span className="text-[10px] uppercase text-muted-foreground font-bold mb-1.5 block tracking-wider">
          {label}
        </span>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]" 
              style={{ 
                backgroundColor: financeData.type === 'INCOME' ? '#10b981' : '#ef4444',
                color: financeData.type === 'INCOME' ? '#10b981' : '#ef4444' 
              }}
            />
            <span className="text-xs text-muted-foreground font-medium">
              {financeData.type === 'INCOME' ? 'Receita' : 'Despesa'}
            </span>
          </div>
          <span className="font-bold text-popover-foreground font-mono text-sm">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function FinanceChart({ data }: { data: FinanceData[] }) {
  const isEmpty = data.every(d => d.total === 0);

  if (isEmpty) {
    return (
      <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground text-sm bg-muted/20 rounded-lg border border-dashed border-border animate-in fade-in duration-500">
        <div className="p-3 bg-background rounded-full mb-3 shadow-sm border border-border">
            <DollarSign className="h-5 w-5 opacity-50" />
        </div>
        <p>Sem movimentação financeira</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        {/* Grid mais sutil */}
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
        
        <XAxis 
            dataKey="name" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
            tickLine={false} 
            axisLine={false} 
            tickMargin={12}
        />
        
        <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `R$${value}`}
        />
        
        <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: 'hsl(var(--muted) / 0.2)', radius: 4 }} 
        />
        
        <Bar 
            dataKey="total" 
            radius={[4, 4, 0, 0]} 
            barSize={40} 
            animationDuration={1000}
        >
            {data.map((entry, index) => (
                <Cell 
                    key={`cell-${index}`} 
                    fill={entry.type === 'INCOME' ? '#10b981' : '#ef4444'} 
                    className="transition-all hover:opacity-80 cursor-pointer"
                    strokeWidth={0}
                />
            ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}