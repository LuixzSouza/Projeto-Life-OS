"use client";

import { LayoutGrid, ArrowUpRight, Zap, Target } from "lucide-react";
import { BaseCard } from "./base-card";
import { Area, AreaChart, Tooltip, XAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { cn } from "@/lib/utils";

// Dados simulados da semana (Produtividade)
const DATA = [
  { day: "D", value: 30 },
  { day: "S", value: 45 },
  { day: "T", value: 60 },
  { day: "Q", value: 85 }, // Pico
  { day: "Q", value: 70 },
  { day: "S", value: 90 }, // Hoje
  { day: "S", value: 50 },
];

export function OverviewCard() {
  return (
    <BaseCard 
        title="Visão Geral" 
        icon={LayoutGrid} 
        description="Performance semanal."
        className="col-span-1 min-h-[180px]" // Altura fixa compatível com o grid
    >
        <div className="flex flex-col h-full w-full bg-card relative overflow-hidden">
            
            <div className="flex flex-1 gap-4 p-4 pb-0">
                
                {/* --- LADO ESQUERDO: BIG NUMBER & SCORE --- */}
                <div className="flex flex-col justify-between pb-4 w-[40%] shrink-0">
                    <div>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-bold text-foreground tracking-tighter">84%</span>
                            <div className="flex items-center text-emerald-500 mb-1.5">
                                <ArrowUpRight className="h-3 w-3" />
                                <span className="text-[10px] font-bold">12%</span>
                            </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Score Diário</span>
                    </div>

                    {/* Mini Stats */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1 rounded bg-amber-500/10 text-amber-500">
                                <Zap className="h-3 w-3" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] text-muted-foreground uppercase">Foco</span>
                                <span className="text-xs font-bold text-foreground">4h 20m</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="p-1 rounded bg-indigo-500/10 text-indigo-500">
                                <Target className="h-3 w-3" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] text-muted-foreground uppercase">Metas</span>
                                <span className="text-xs font-bold text-foreground">8 / 10</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- LADO DIREITO: GRÁFICO (CHART) --- */}
                <div className="flex-1 min-w-0 relative pt-2">
                    {/* Gradiente para o gráfico */}
                    <div className="absolute inset-0 bg-gradient-to-l from-[#09090b] via-transparent to-transparent z-10 pointer-events-none" />
                    
                    <ChartContainer>
                        <AreaChart data={DATA}>
                            <defs>
                                <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Tooltip 
                                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-card border border-border px-2 py-1 rounded shadow-xl">
                                            <p className="text-[10px] font-bold text-indigo-400">{payload[0].value}%</p>
                                        </div>
                                    );
                                    }
                                    return null;
                                }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#6366f1" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorProd)" 
                            />
                        </AreaChart>
                    </ChartContainer>
                </div>

            </div>

            {/* Rodapé Decorativo (Barra de Tendência) */}
            <div className="h-1 w-full bg-card mt-auto flex">
                <div className="w-[84%] h-full bg-gradient-brand shadow-[0_0_10px_var(--color-primary)]" />
            </div>

        </div>
    </BaseCard>
  );
}