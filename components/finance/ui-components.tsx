"use client";

import { FC, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// --- HELPERS DE FORMATAÇÃO ---
export const formatMoney = (val: number) => 
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

// --- COMPONENTE DE TEXTO COM SMART VIEW (ANIMAÇÃO PREMIUM) ---
interface PrivacyTextProps {
  value: number;
  isSmartView: boolean;
  className?: string;
  prefix?: string;
}

export const PrivacyText: FC<PrivacyTextProps> = ({ value, isSmartView, className, prefix = "" }) => {
  const formattedValue = formatMoney(Math.abs(value));
  
  return (
    <div className={cn("relative overflow-hidden inline-flex items-center align-baseline h-[1.2em]", className)}>
      {/* Valor Real */}
      <span 
        className={cn(
          "absolute inset-0 transition-all duration-500 ease-spring",
          isSmartView ? "translate-y-[120%] opacity-0 blur-sm" : "translate-y-0 opacity-100 blur-0"
        )}
      >
        {prefix}{formattedValue}
      </span>

      {/* Máscara de Privacidade (Bolinhas) */}
      <span 
        className={cn(
          "absolute inset-0 flex items-center transition-all duration-500 ease-spring font-sans tracking-widest text-muted-foreground/40 select-none",
          isSmartView ? "translate-y-0 opacity-100" : "-translate-y-[120%] opacity-0"
        )}
        aria-hidden="true"
      >
        ••••••••
      </span>
      
      {/* Spacer invisível para manter a largura do container */}
      <span className="invisible pointer-events-none select-none">
        {prefix}{formattedValue}
      </span>
    </div>
  );
};

// --- METRIC CARD ---
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
    default: "border-border/60 bg-card hover:border-primary/20",
    primary: "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:from-primary/10",
    success: "border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent hover:from-emerald-500/10",
    warning: "border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent hover:from-amber-500/10",
    danger: "border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent hover:from-destructive/10",
  };

  return (
    <Card className={cn("relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group", variants[variant])}>
      <CardContent className="p-6 flex flex-col justify-between h-full min-h-[140px]">
        
        {/* Header do Card */}
        <div className="flex justify-between items-start mb-2">
          <div className="p-2.5 rounded-xl bg-background/80 backdrop-blur-sm border shadow-sm group-hover:scale-105 transition-transform duration-300">
            {icon}
          </div>
          
          <div className="flex items-center gap-1.5">
             {trend && (
              <Badge variant="secondary" className={cn(
                "font-mono text-[10px] gap-1 h-5 px-1.5 bg-background/50 backdrop-blur-sm border-border/50",
                trend === "up" ? "text-emerald-600" : "text-destructive"
              )}>
                {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend === "up" ? "Alta" : "Baixa"}
              </Badge>
            )}
            
            {tooltip && (
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="cursor-help opacity-40 hover:opacity-100 transition-all p-1 hover:bg-background/80 rounded-full hover:shadow-sm">
                                <Info className="h-4 w-4 text-foreground" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="left" 
                          className="text-xs p-3 max-w-[220px] bg-foreground text-background font-medium shadow-xl border-none leading-relaxed"
                        >
                          {tooltip}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
          </div>
        </div>

        {/* Corpo do Card */}
        <div className="space-y-1 mt-auto">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
          <div className="text-3xl font-black font-mono tracking-tighter tabular-nums text-foreground flex items-center">
            <PrivacyText value={value} isSmartView={!!isSmartView} />
          </div>
          {description && (
            <p className="text-[11px] text-muted-foreground/80 font-medium border-t border-border/10 pt-2 mt-1">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// --- VALUE ROW ---
interface ValueRowProps {
  label: string;
  value: number;
  tooltip: string;
  isNegative?: boolean;
  isTotal?: boolean;
  className?: string;
  isSmartView?: boolean;
}

export const ValueRow: FC<ValueRowProps> = ({ label, value, tooltip, isNegative, isTotal, className, isSmartView }) => (
  <div className={cn(
    "flex justify-between items-center py-3 px-3 -mx-3 rounded-lg transition-colors group/row",
    "hover:bg-accent/50", // Hover sutil
    className
  )}>
    <div className="flex items-center gap-2">
      <span className={cn("text-xs font-medium tracking-tight transition-colors", 
        isTotal ? "text-foreground font-bold text-sm" : "text-muted-foreground group-hover/row:text-foreground"
      )}>
        {label}
      </span>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:text-primary">
               <Info className="h-3.5 w-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            className="text-xs max-w-[240px] bg-popover border-border/50 shadow-xl p-3 font-medium text-popover-foreground z-50"
            align="center"
          >
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    
    <div className={cn("font-mono font-bold tabular-nums tracking-tight flex items-center justify-end", 
      isTotal ? "text-base text-primary" : "text-sm text-muted-foreground",
      isNegative && value > 0 && "text-destructive",
      // Adiciona um sutil glow no hover se for o total
      isTotal && "group-hover/row:drop-shadow-sm"
    )}>
      <PrivacyText 
        value={value} 
        isSmartView={!!isSmartView} 
        prefix={isNegative && value > 0 ? "- " : ""}
      />
    </div>
  </div>
);