"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";

// ✅ CORREÇÃO: Index Signature segura
interface FinanceData {
  name: string;
  total: number;
  type: 'INCOME' | 'EXPENSE';
  [key: string]: string | number;
}

export function FinanceChart({ data }: { data: FinanceData[] }) {
  if (data.every(d => d.total === 0)) {
    return <div className="h-[200px] flex items-center justify-center text-zinc-400 text-sm bg-zinc-50/50 dark:bg-zinc-900/20 rounded-lg border border-dashed">Sem dados financeiros.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis 
            dataKey="name" 
            stroke="#888888" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickMargin={10}
        />
        <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `R$${value}`}
        />
        <Tooltip 
            cursor={{ fill: 'transparent' }}
            contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '12px' }}
        />
        <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={40}>
            {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.type === 'INCOME' ? '#10b981' : '#ef4444'} />
            ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}