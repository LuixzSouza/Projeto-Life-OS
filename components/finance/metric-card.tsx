"use client";

import { FC, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number;
  description?: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  isSmartView?: boolean;
  tooltip?: string;
}

export const MetricCard: FC<MetricCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  variant = "default",
  isSmartView = false,
  tooltip
}) => {
  const variants = {
    default: "border-border/50 bg-card hover:border-primary/30",
    primary: "border-primary/20 bg-primary/5 hover:bg-primary/10",
    success: "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10",
    warning: "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10",
    danger: "border-destructive/20 bg-destructive/5 hover:bg-destructive/10",
  };

  const formatMoney = (val: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <Card className={cn("relative overflow-hidden transition-all duration-300 hover:shadow-lg group", variants[variant])}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 rounded-xl bg-background border shadow-sm group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
          <div className="flex items-center gap-1">
             {trend && (
              <Badge variant="outline" className={cn(
                "font-mono text-[10px] gap-1 border-none bg-background/50",
                trend === "up" ? "text-emerald-600" : "text-destructive"
              )}>
                {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend === "up" ? "Entrada" : "Saída"}
              </Badge>
            )}
            {tooltip && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="cursor-help opacity-50 hover:opacity-100 transition-opacity">
                                <HelpCircle className="h-3.5 w-3.5" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs p-2 max-w-[200px]">{tooltip}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
          <h3 className={cn(
            "text-2xl font-black font-mono tracking-tighter tabular-nums text-foreground transition-all",
            isSmartView && "blur-[6px] select-none"
          )}>
            {formatMoney(value)}
          </h3>
          {description && <p className="text-[10px] text-muted-foreground/80 font-medium">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
};