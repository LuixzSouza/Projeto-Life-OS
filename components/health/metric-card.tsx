"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

// --- PROTOCOLOS DE TIPAGEM ---
interface Trend {
  value: string | number;
  direction: "up" | "down" | "neutral";
  label?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: Trend;
  color?: "primary" | "rose" | "blue" | "amber" | "emerald";
  isLoading?: boolean;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  trend,
  color = "primary",
  isLoading = false,
  onClick
}: MetricCardProps) {

  // --- CONFIGURAÇÃO DE CORES TÁTICAS ---
  const colorMap = {
    primary: "text-primary bg-primary/10 border-primary/20 ring-primary/20",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20 ring-rose-500/20",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20 ring-blue-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20 ring-amber-500/20",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 ring-emerald-500/20",
  };

  const renderTrend = () => {
    if (!trend) return null;

    const config = {
      up: { 
        icon: ArrowUpRight, 
        style: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" 
      },
      down: { 
        icon: ArrowDownRight, 
        style: "text-rose-500 bg-rose-500/10 border-rose-500/20" 
      },
      neutral: { 
        icon: Minus, 
        style: "text-muted-foreground bg-muted border-border/40" 
      },
    }[trend.direction];

    const TrendIcon = config.icon;

    return (
      <div className="flex items-center gap-2 mt-4">
        <div className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-tighter shadow-sm",
          config.style
        )}>
          <TrendIcon className="h-3 w-3 stroke-[3]" />
          {trend.value}
        </div>
        {trend.label && (
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 truncate">
            {trend.label}
          </span>
        )}
      </div>
    );
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden border-border/40 bg-card rounded-[1.5rem] transition-all duration-500 shadow-sm",
        "hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30",
        onClick && "cursor-pointer active:scale-[0.98]"
      )}
    >
      {/* Glow Effect de Fundo */}
      <div className={cn(
        "absolute -right-4 -top-4 h-24 w-24 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-20",
        colorMap[color].split(' ')[1] // Pega o bg-color
      )} />

      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                {subtitle}
              </p>
            )}
          </div>

          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center border shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
            colorMap[color]
          )}>
            <Icon className="h-5 w-5 stroke-[2.5]" />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 py-1">
            <Skeleton className="h-10 w-3/4 rounded-lg bg-muted/40" />
            <Skeleton className="h-4 w-1/2 rounded-lg bg-muted/40" />
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black tracking-tighter text-foreground tabular-nums">
                {value}
              </span>
              {unit && (
                <span className="text-xs font-black text-muted-foreground/60 uppercase tracking-widest">
                  {unit}
                </span>
              )}
            </div>
            {renderTrend()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}