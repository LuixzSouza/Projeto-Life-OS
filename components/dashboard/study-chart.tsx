"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// CORREÇÃO: Adicionamos [key: string]: any para satisfazer o Recharts
interface StudyData {
  name: string;
  value: number;
  [key: string]: unknown;
}


export function StudyChart({ data }: { data: StudyData[] }) {
  if (data.length === 0) {
    return <div className="h-[200px] flex items-center justify-center text-zinc-400 text-sm">Sem sessões de estudo.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}