"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Database, Server } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatItem {
    label: string;
    count: number;
    percent: number;
    color: string;
}

export interface StorageStats {
    totalItems: number;
    breakdown: StatItem[];
    disk?: {
        path: string;
        total: string;
        used: string;
        free: string;
        percent: number;
    };
}

export function StorageAnalytics({ stats }: { stats: StorageStats }) {
    return (
        <Card className="border-border shadow-sm bg-card">
            <CardHeader className="pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                            <Database className="h-4 w-4 text-primary" /> Uso do Banco de Dados
                        </CardTitle>
                        <CardDescription>Visão geral dos registros no SQLite.</CardDescription>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-foreground">{stats.totalItems}</span>
                        <p className="text-xs text-muted-foreground">Registros Totais</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1">
                        <span>Distribuição</span>
                        <span>100%</span>
                    </div>
                    <div className="h-6 w-full flex rounded-md overflow-hidden bg-muted ring-1 ring-border">
                        {stats.breakdown.map((item, idx) => (
                            <div 
                                key={idx}
                                className={cn("h-full first:rounded-l-md last:rounded-r-md border-r border-background/20 last:border-0 hover:opacity-90 transition-opacity cursor-help", item.color)}
                                style={{ width: `${Math.max(item.percent, 2)}%` }} 
                                title={`${item.label}: ${item.count} items`}
                            />
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {stats.breakdown.map((item) => (
                        <div key={item.label} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
                                <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                            </div>
                            <span className="text-xs font-bold text-foreground">{item.count}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
            {stats.disk && (
                <CardFooter className="bg-muted/30 border-t border-border py-3 px-6 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Server className="h-3 w-3" />
                        <span>Armazenamento Físico ({stats.disk.path})</span>
                    </div>
                    <div className="font-mono">
                        <span className="font-bold text-foreground">{stats.disk.used}</span> usados de {stats.disk.total}
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}