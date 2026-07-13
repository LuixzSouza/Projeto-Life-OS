"use client";

import { useSyncExternalStore, type FC, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";

/* TEXTOS E CONFIGURAÇÕES */

export const TOOLTIPS = {
  patrimonio: "A soma total de dinheiro que você tem hoje em todas as contas conectadas.",
  dividaAtiva: "O valor total de faturas pendentes e contas a pagar em aberto.",
  metas: "Dinheiro que você já separou para seus objetivos na Lista de Desejos.",
  custosFixos: "Contas obrigatórias projetadas para este mês (Assinaturas, Serviços, etc).",
  salarioBruto: "O valor total das suas receitas ou salário antes de qualquer desconto.",
  deducoes: "Estimativa de impostos, taxas ou retenções na fonte.",
  salarioLiquido: "O dinheiro real que cai na sua conta e você pode usar.",
  dividasPagas: "Dinheiro que já saiu da sua conta este mês para quitar pendências.",
  residual: "O seu Fluxo Livre! O que sobra no fim do mês após pagar os custos fixos.",
};

export interface HealthStatus {
  color: string;
  text: string;
  label: string;
  border: string;
}

export interface FinanceMetrics {
  taxes: number;
  residual: number;
  committed: number;
  health: HealthStatus;
  hasSalary: boolean;
}

export const getHealthStatus = (committed: number, hasSalary: boolean): HealthStatus => {
  if (!hasSalary) return { color: "bg-muted", text: "text-muted-foreground", label: "Definir Renda", border: "border-border/50" };
  if (committed > 80) return { color: "bg-rose-500", text: "text-rose-500", label: "Crítico", border: "border-rose-500/30" };
  if (committed > 50) return { color: "bg-amber-500", text: "text-amber-500", label: "Atenção", border: "border-amber-500/30" };
  return { color: "bg-emerald-500", text: "text-emerald-500", label: "Saudável", border: "border-emerald-500/30" };
};

export function useIsClient() {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}

/* COMPONENTES AUXILIARES (UI) */

export const PrivacyText: FC<{ value: number; isSmartView: boolean; className?: string; prefix?: string; }> = ({ value, isSmartView, className, prefix = "" }) => {
  const formatMoney = useFormatCurrency();
  const formattedValue = formatMoney(Math.abs(value));
  return (
    <div className={cn("relative overflow-hidden inline-flex items-center align-baseline h-[1.2em]", className)}>
      <span className={cn("absolute inset-0 transition-all duration-500", isSmartView ? "translate-y-[120%] opacity-0 blur-sm" : "translate-y-0 opacity-100 blur-0")}>
        {prefix}{formattedValue}
      </span>
      <span className={cn("absolute inset-0 flex items-center transition-all duration-500 font-sans tracking-widest text-muted-foreground/40 select-none", isSmartView ? "translate-y-0 opacity-100" : "-translate-y-[120%] opacity-0")} aria-hidden="true">
        ••••••••
      </span>
      <span className="invisible pointer-events-none select-none">{prefix}{formattedValue}</span>
    </div>
  );
};

export const MetricCard: FC<{ title: string; value: number; icon: ReactNode; trend?: "up" | "down"; variant?: "default" | "primary" | "warning" | "danger"; isSmartView?: boolean; tooltip?: string; description?: string; }> = ({ title, value, icon, trend, variant = "default", isSmartView = false, tooltip, description }) => {
  const variants = {
    default: "bg-card border-border/40 text-foreground",
    primary: "bg-gradient-to-br from-primary/10 to-transparent border-primary/20 text-primary",
    warning: "bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20 text-amber-600",
    danger: "bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20 text-rose-600",
  };

  return (
    <Card className={cn("relative overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group", variants[variant])}>
      <CardContent className="p-6 flex flex-col justify-between h-full min-h-[160px]">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3.5 rounded-2xl bg-background/80 backdrop-blur-md shadow-sm border border-border/50 group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
          <div className="flex items-center gap-2">
            {trend && (
              <Badge variant="secondary" className={cn("font-bold text-[10px] uppercase tracking-wider h-6 px-2.5 bg-background/80 backdrop-blur-md border-border/50 shadow-sm", trend === "up" ? "text-emerald-600" : "text-rose-500")}>
                {trend === "up" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {trend === "up" ? "Alta" : "Baixa"}
              </Badge>
            )}
            {tooltip && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help p-1.5 opacity-40 hover:opacity-100 hover:bg-background/80 rounded-full transition-all">
                      <Info className="h-4 w-4 text-current" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs p-3 max-w-[220px] shadow-xl leading-relaxed rounded-xl font-medium">{tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <div className="space-y-1 mt-auto">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</p>
          <div className="text-2xl sm:text-3xl font-black font-mono tracking-tighter tabular-nums flex items-center">
            <PrivacyText value={value} isSmartView={!!isSmartView} />
          </div>
          {description && <p className="text-[10px] font-bold opacity-60 mt-1">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export const ValueRow: FC<{ label: string; value: number; tooltip: string; isNegative?: boolean; isTotal?: boolean; isSmartView?: boolean; }> = ({ label, value, tooltip, isNegative, isTotal, isSmartView }) => (
  <div className={cn("flex justify-between items-center py-3.5 px-4 -mx-4 rounded-xl transition-colors group/row hover:bg-muted/40", isTotal && "mt-2 mb-4 bg-muted/30 border border-border/50 shadow-inner")}>
    <div className="flex items-center gap-2">
      <span className={cn("text-xs sm:text-sm font-semibold tracking-tight transition-colors", isTotal ? "text-foreground font-black uppercase tracking-wider text-[11px]" : "text-muted-foreground group-hover/row:text-foreground")}>
        {label}
      </span>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:text-primary">
              <Info className="h-3.5 w-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs max-w-[240px] shadow-xl p-3 font-medium rounded-xl">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    <div className={cn("font-mono font-bold tabular-nums tracking-tight flex items-center justify-end text-sm sm:text-base", isTotal ? "text-primary text-lg" : "text-muted-foreground", isNegative && value > 0 && "text-rose-500")}>
      <PrivacyText value={value} isSmartView={!!isSmartView} prefix={isNegative && value > 0 ? "- " : ""} />
    </div>
  </div>
);
