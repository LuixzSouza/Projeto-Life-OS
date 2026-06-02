"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
    label: string;
    value: number;
    icon: React.ElementType;
    theme: "blue" | "yellow" | "emerald";
    hint?: string;
}

const THEMES: Record<StatsCardProps["theme"], string> = {
    blue: "text-blue-600 bg-blue-500/10",
    yellow: "text-amber-600 bg-amber-500/10",
    emerald: "text-emerald-600 bg-emerald-500/10",
};

export function StatsCard({ label, value, icon: Icon, theme, hint }: StatsCardProps) {
    return (
        <Card className="bg-card border-border/40 shadow-sm hover:shadow-md hover:border-border/80 transition-all">
            <CardContent className="p-5 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
                    {hint && <p className="text-xs text-muted-foreground truncate">{hint}</p>}
                </div>
                <div className={cn("p-2.5 rounded-xl shrink-0", THEMES[theme])}>
                    <Icon className="h-4 w-4" />
                </div>
            </CardContent>
        </Card>
    );
}
