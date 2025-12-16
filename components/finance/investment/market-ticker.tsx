"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { MarketItem } from "@/lib/market-service";
import { cn } from "@/lib/utils";
import { 
    TrendingUp, 
    TrendingDown, 
    Minus, 
    DollarSign, 
    Bitcoin, 
    Activity, 
    BarChart3, 
    Landmark 
} from "lucide-react";

export function MarketTicker({ data }: { data: MarketItem[] }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.map((item) => (
                <TickerCard key={item.ticker} item={item} />
            ))}
        </div>
    );
}

function TickerCard({ item }: { item: MarketItem }) {
    // Determine asset status (Positive, Negative, Neutral)
    const status = useMemo(() => {
        if (item.variation > 0) return "up";
        if (item.variation < 0) return "down";
        return "neutral";
    }, [item.variation]);

    // Dynamic colors based on status using theme variables
    const statusColor = {
        up: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        down: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
        neutral: "text-muted-foreground bg-muted/50 border-transparent",
    };

    // Icon based on asset type
    const iconType = useMemo(() => getAssetIcon(item.type, item.ticker), [item.type, item.ticker]);

    // Format value (prioritize displayValue if exists, otherwise manual format)
    const formattedValue = item.displayValue ?? (
        item.type === 'INDEX' 
            ? `${item.value}%` 
            : item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    );

    return (
        <Card className="group relative overflow-hidden border border-border/60 bg-card p-4 transition-all duration-300 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5">
            {/* Subtle gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

            <div className="relative flex flex-col gap-3">
                {/* Header: Icon and Ticker */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                                {iconType && iconType({ className: "h-4 w-4" })}
                            </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                            {item.ticker}
                        </span>
                    </div>
                    
                    {/* Variation Badge */}
                    <div className={cn(
                        "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold shadow-sm transition-colors",
                        statusColor[status]
                    )}>
                        {status === "up" && <TrendingUp className="h-3 w-3" />}
                        {status === "down" && <TrendingDown className="h-3 w-3" />}
                        {status === "neutral" && <Minus className="h-3 w-3" />}
                        <span className="font-mono">{Math.abs(item.variation).toFixed(2)}%</span>
                    </div>
                </div>

                {/* Main Value */}
                <div>
                    <div className="font-mono text-lg font-bold tracking-tight text-foreground tabular-nums">
                        {formattedValue}
                    </div>
                    {/* Asset Name (optional, for context) */}
                    <p className="text-[10px] text-muted-foreground truncate opacity-80 mt-0.5 font-medium">
                        {item.name}
                    </p>
                </div>
            </div>
        </Card>
    );
}

// --- Helpers ---

function getAssetIcon(type: string, ticker: string) {
    if (ticker === 'BTC' || type === 'CRYPTO') return Bitcoin;
    if (ticker === 'USD' || ticker === 'EUR' || type === 'CURRENCY') return DollarSign;
    if (type === 'INDEX') return Activity;
    if (type === 'FII') return Landmark;
    return BarChart3; // Default for Stocks
}