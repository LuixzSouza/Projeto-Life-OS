"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { BookOpen } from "lucide-react";

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'
];

interface StudyData {
  name: string;
  value: number;
  [key: string]: string | number; 
}

// ✅ DEFINIÇÃO MANUAL DE TIPAGEM
// O Recharts Pie Chart passa 'fill' diretamente no objeto do payload do tooltip
interface StudyChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    fill: string; // O Recharts adiciona isso automaticamente
    payload: StudyData;
  }>;
}

const CustomTooltip = ({ active, payload }: StudyChartTooltipProps) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0];
    
    return (
      <div className="rounded-lg border border-border bg-popover p-2 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div 
            className="h-2 w-2 rounded-full" 
            style={{ backgroundColor: data.fill }} 
          />
          <span className="text-[10px] uppercase text-muted-foreground font-semibold">
            {data.name}
          </span>
        </div>
        <span className="font-bold text-popover-foreground font-mono text-sm pl-4 block">
          {data.value} min
        </span>
      </div>
    );
  }
  return null;
};

export function StudyChart({ data }: { data: StudyData[] }) {
  const isEmpty = data.length === 0 || data.every(d => d.value === 0);

  if (isEmpty) {
    return (
      <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground text-sm bg-muted/20 rounded-lg border border-dashed border-border">
        <div className="p-3 bg-muted rounded-full mb-2">
            <BookOpen className="h-5 w-5 opacity-50" />
        </div>
        <p>Sem sessões registradas</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          stroke="hsl(var(--card))"
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        
        <Tooltip content={<CustomTooltip />} cursor={false} />
        
        <Legend 
          verticalAlign="bottom" 
          height={36} 
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="text-xs text-muted-foreground ml-1 font-medium">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}