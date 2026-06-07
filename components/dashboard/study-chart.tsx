"use client";

import dynamic from "next/dynamic";
import {
  Cell,
  Pie,
  PieChart,
  Tooltip,
  Legend,
  TooltipProps,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { BookOpen, Activity } from "lucide-react";

/* -------------------------------------------------------------------------------------------------
 * 1. INTERFACES
 * -----------------------------------------------------------------------------------------------*/

export interface StudyData {
  name: string;
  value: number;
  fill?: string;
  [key: string]: string | number | undefined;
}

interface StudyChartProps {
  data: StudyData[];
}

interface TooltipPayloadItem {
  name?: NameType;
  value?: ValueType;
  color?: string;
  payload?: StudyData;
}

/* -------------------------------------------------------------------------------------------------
 * 2. CUSTOM TOOLTIP
 * -----------------------------------------------------------------------------------------------*/

type CustomTooltipProps = TooltipProps<ValueType, NameType> & {
  payload?: TooltipPayloadItem[];
};

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length > 0) {
    const item = payload[0];

    const chartData: StudyData = item.payload ?? {
      name: String(item.name ?? "Unknown"),
      value: Number(item.value ?? 0),
    };

    const indicatorColor =
      chartData.fill || item.color || "#3b82f6";

    return (
      <div className="rounded-xl border border-border/40 bg-background/95 p-3 shadow-2xl backdrop-blur-md min-w-[150px] animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-2 mb-2 border-b border-border/40 pb-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_currentColor]"
            style={{
              backgroundColor: indicatorColor,
              color: indicatorColor,
            }}
          />

          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {chartData.name}
          </span>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="font-black text-foreground font-mono text-lg tracking-tighter">
            {chartData.value}
          </span>

          <span className="text-[9px] font-black uppercase text-muted-foreground/50">
            Minutos_Sessão
          </span>
        </div>
      </div>
    );
  }

  return null;
};

/* -------------------------------------------------------------------------------------------------
 * 3. COMPONENTE DO GRÁFICO
 * -----------------------------------------------------------------------------------------------*/

function StudyChartContent({ data }: StudyChartProps) {
  const isEmpty = !data || data.length === 0 || data.every((d) => d.value === 0);

  if (isEmpty) {
    return (
      <div className="h-[220px] flex flex-col items-center justify-center bg-muted/5 rounded-[2.5rem] border-2 border-dashed border-border/40">
        <div className="p-4 bg-background rounded-3xl mb-3 shadow-inner border border-border/10">
          <BookOpen className="h-6 w-6 text-muted-foreground/30" />
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
          Offline_Data_Null
        </p>
      </div>
    );
  }

  const colors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#8b5cf6",
    "#06b6d4",
  ];

  return (
    <div className="w-full">
      <div style={{ width: "100%", height: 220 }}>
        <ChartContainer minWidth={0} minHeight={0}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={90}
              paddingAngle={10}
              dataKey="value"
              stroke="transparent"
              className="outline-none"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                />
              ))}
            </Pie>

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="bottom"
              height={40}
              iconType="circle"
              iconSize={6}
              formatter={(value: string) => (
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 ml-2">
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ChartContainer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * 4. EXPORT DINÂMICO (SSR SAFE)
 * -----------------------------------------------------------------------------------------------*/

export const StudyChart = dynamic<StudyChartProps>(
  () => Promise.resolve(StudyChartContent),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] w-full bg-muted/5 animate-pulse rounded-[2.5rem] border border-border/40 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Activity className="h-4 w-4 text-muted-foreground/20 animate-spin" />

          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
            Analysing_Brain_State...
          </span>
        </div>
      </div>
    ),
  }
);