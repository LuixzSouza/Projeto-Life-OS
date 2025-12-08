"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

// 1. Definindo o formato exato dos dados
interface FinanceData {
  name: string;
  total: number;
}

// 2. Usando a interface nas props
export function FinanceChart({ data }: { data: FinanceData[] }) {
  if (data.length === 0) {
    return <div className="h-[200px] flex items-center justify-center text-zinc-400 text-sm">Sem dados financeiros este mês.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis 
            dataKey="name" 
            stroke="#888888" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
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
            contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px' }}
        />
        <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} className="fill-primary" />
      </BarChart>
    </ResponsiveContainer>
  );
}