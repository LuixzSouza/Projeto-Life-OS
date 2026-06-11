"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitCompareArrows, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BodyDeltaItem {
    label: string;
    from: number;
    to: number;
    unit: "kg" | "cm";
    /** O que significa o delta cair: "good" (ex.: cintura), "neutral" (peso) ou "muscle" (subir é bom). */
    direction: "good-down" | "good-up" | "neutral";
}

export interface BodyProgressInfo {
    /** Data da medição anterior (dd/mm). */
    sinceLabel: string;
    /** Dias entre as duas medições. */
    days: number;
    items: BodyDeltaItem[];
}

function deltaTone(item: BodyDeltaItem): string {
    const delta = item.to - item.from;
    if (Math.abs(delta) < 0.05) return "text-muted-foreground";
    const improved =
        item.direction === "neutral" ? null :
        item.direction === "good-down" ? delta < 0 : delta > 0;
    if (improved === null) return "text-foreground";
    return improved ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
}

export function BodyProgressCard({ progress }: { progress: BodyProgressInfo | null }) {
    if (!progress || progress.items.length === 0) return null;

    const changed = progress.items.filter((i) => Math.abs(i.to - i.from) >= 0.05);

    return (
        <Card className="border-border/40 bg-card shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <div className="rounded-lg bg-violet-500/10 p-1.5 text-violet-500"><GitCompareArrows className="h-4 w-4" /></div>
                    O que mudou desde {progress.sinceLabel}
                </CardTitle>
                <Badge className="border-none bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    {progress.days <= 1 ? "1 dia" : `${progress.days} dias`}
                </Badge>
            </CardHeader>
            <CardContent className="pt-3">
                {changed.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Nenhuma medida mudou entre as duas últimas medições — consistência também é dado.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {changed.map((item) => {
                            const delta = item.to - item.from;
                            const Icon = Math.abs(delta) < 0.05 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
                            return (
                                <div key={item.label} className="rounded-xl border border-border/40 bg-muted/20 p-3">
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
                                    <div className="mt-1 flex items-baseline gap-1.5">
                                        <span className="text-lg font-bold tabular-nums">{item.to.toFixed(1)}</span>
                                        <span className="text-xs text-muted-foreground">{item.unit}</span>
                                    </div>
                                    <p className={cn("mt-0.5 flex items-center gap-1 text-xs font-semibold tabular-nums", deltaTone(item))}>
                                        <Icon className="h-3 w-3" />
                                        {delta > 0 ? "+" : ""}{delta.toFixed(1)} {item.unit}
                                        <span className="font-normal text-muted-foreground">(era {item.from.toFixed(1)})</span>
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
