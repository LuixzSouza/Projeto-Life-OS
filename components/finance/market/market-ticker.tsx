"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MarketData {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
}

export function MarketTicker({ initialData }: { initialData: MarketData[] }) {
  // Estado local para permitir atualização client-side se quiser implementar depois
  const [data] = useState(initialData);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
      {data.map((item) => {
        const isPositive = item.regularMarketChangePercent >= 0;
        return (
          <Card 
            key={item.symbol} 
            className="p-3 border-border/50 bg-card/50 backdrop-blur-sm flex flex-col justify-between hover:border-primary/20 transition-all"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {item.symbol === '^BVSP' ? 'IBOVESPA' : item.shortName || item.symbol}
              </span>
              {item.symbol === 'USD' || item.symbol === 'EUR' ? (
                <DollarSign className="h-4 w-4 text-primary/50" />
              ) : (
                <Activity className="h-4 w-4 text-primary/50" />
              )}
            </div>
            
            <div className="flex items-end justify-between gap-2">
              <span className="text-lg font-bold font-mono">
                {item.symbol === '^BVSP' 
                  ? (item.regularMarketPrice / 1000).toFixed(1) + 'k' 
                  : item.regularMarketPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              
              <div className={cn(
                "flex items-center text-xs font-bold px-1.5 py-0.5 rounded-md",
                isPositive 
                  ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400" 
                  : "text-red-600 bg-red-500/10 dark:text-red-400"
              )}>
                {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(item.regularMarketChangePercent).toFixed(2)}%
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}