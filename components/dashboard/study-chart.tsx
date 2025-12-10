"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

// ✅ CORREÇÃO: Usamos 'string | number' em vez de 'any'.
// Isso satisfaz o Recharts e o ESLint ao mesmo tempo.
interface StudyData {
  name: string;
  value: number;
  [key: string]: string | number; 
}

export function StudyChart({ data }: { data: StudyData[] }) {
  if (data.length === 0) {
    return <div className="h-[200px] flex items-center justify-center text-zinc-400 text-sm bg-zinc-50/50 dark:bg-zinc-900/20 rounded-lg border border-dashed">Sem sessões registradas.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={4}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
            contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '12px' }}
            formatter={(value: number) => [`${value} min`, 'Duração']}
        />
        <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            formatter={(value) => <span className="text-xs text-zinc-500 ml-1">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}