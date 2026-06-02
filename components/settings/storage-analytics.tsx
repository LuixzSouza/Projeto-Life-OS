"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Database, HardDrive, BarChart3, Weight } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Tipagem rigorosa para evitar conflitos
export interface StatItem {
    label: string;
    count: number;
    bytes: number;
    formattedSize: string;
    percentCount: number;
    percentSize: number;
    color: string;
}

export interface StorageStats {
    totalItems: number;
    totalSize: string;
    breakdown: StatItem[];
    disk?: {
        path: string;
        used: string;
        rawSize: number;
    } | null;
}

export function StorageAnalytics({ stats }: { stats: StorageStats }) {
    const [viewMode, setViewMode] = useState<"size" | "count">("size");

    // Filtra itens com 0% para não quebrar o layout visual
    const activeItems = stats.breakdown.filter(item => 
        (viewMode === 'size' ? item.percentSize : item.percentCount) > 0
    );

    return (
        <Card className="border-border shadow-sm bg-card">
            <CardHeader className="pb-2 border-b border-border/40 bg-muted/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Database className="h-4 w-4 text-primary" /> 
                            Uso de Dados
                        </CardTitle>
                        <CardDescription>Gerenciamento de espaço do banco de dados.</CardDescription>
                    </div>
                    
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "size" | "count")}>
                        <TabsList className="h-8">
                            <TabsTrigger value="size" className="text-xs px-3 h-6 gap-2"><Weight className="h-3 w-3" /> Peso</TabsTrigger>
                            <TabsTrigger value="count" className="text-xs px-3 h-6 gap-2"><BarChart3 className="h-3 w-3" /> Itens</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-8">
                
                {/* 1. Métrica Principal */}
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tighter text-foreground">
                        {viewMode === 'size' ? stats.totalSize : formatNumber(stats.totalItems)}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground uppercase">
                        {viewMode === 'size' ? "utilizados" : "registros totais"}
                    </span>
                </div>

                {/* 2. Barra de Progresso Segmentada (Estilo macOS) */}
                <div className="space-y-2">
                    <TooltipProvider delayDuration={100}>
                        <div className="flex h-8 w-full overflow-hidden rounded-lg bg-secondary/30 ring-1 ring-black/5 dark:ring-white/10">
                            {activeItems.map((item, idx) => {
                                const percent = viewMode === 'size' ? item.percentSize : item.percentCount;
                                return (
                                    <Tooltip key={idx}>
                                        <TooltipTrigger asChild>
                                            <div 
                                                className={cn("h-full hover:brightness-110 transition-all cursor-help border-r border-background/10 last:border-0", item.color)}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <div className="text-xs font-medium">
                                                <p className="font-bold mb-1">{item.label}</p>
                                                <p>Peso: {item.formattedSize}</p>
                                                <p>Itens: {item.count}</p>
                                                <p className="opacity-70 mt-1">{percent.toFixed(1)}%</p>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    </TooltipProvider>
                    
                    {/* Legenda dos Maiores Consumidores */}
                    <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                        <span>0%</span>
                        <span>Distribuição de {viewMode === 'size' ? "Armazenamento" : "Quantidade"}</span>
                        <span>100%</span>
                    </div>
                </div>

                {/* 3. Grid de Detalhes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {stats.breakdown.map((item) => {
                        const percent = viewMode === 'size' ? item.percentSize : item.percentCount;
                        if (percent < 0.1 && item.count === 0) return null; // Esconde vazios

                        return (
                            <div key={item.label} className="flex items-center justify-between p-2.5 rounded-md border border-border/60 bg-background hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-2.5">
                                    <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", item.color)} />
                                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                                </div>
                                <div className="text-right flex flex-col">
                                    <span className="text-xs font-bold text-foreground">
                                        {viewMode === 'size' ? item.formattedSize : item.count}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">{percent.toFixed(1)}%</span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* 4. Informação do Arquivo Físico */}
                {stats.disk && (
                    <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-3 text-xs border border-border/50">
                        <div className="p-2 bg-background rounded-md border shadow-sm">
                            <HardDrive className="h-4 w-4 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">Arquivo: life_os.db</p>
                            <p className="text-muted-foreground truncate" title={stats.disk.path}>{stats.disk.path}</p>
                        </div>
                        <div className="text-right pl-2 border-l border-border/50">
                            <p className="font-bold text-foreground">{stats.disk.used}</p>
                            <p className="text-[10px] text-muted-foreground">Em disco</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}