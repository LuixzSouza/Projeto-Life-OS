"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, Sparkles } from "lucide-react";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import type { ProjectionPoint } from "./investment-data";

interface ProjectionResultsProps {
  mode: "GROWTH" | "GOAL";
  years: number;
  finalData: ProjectionPoint;
  requiredMonthly: number;
  targetAmount: number;
  compareSavings: boolean;
  realProfit: number;
  differenceToSavings: number;
}

export function ProjectionResults({
  mode,
  years,
  finalData,
  requiredMonthly,
  targetAmount,
  compareSavings,
  realProfit,
  differenceToSavings,
}: ProjectionResultsProps) {
  const formatCurrency = useFormatCurrency();

  return (
    <Card className={cn(
      "relative overflow-hidden border-0 shadow-md transition-all duration-700 rounded-2xl h-full",
      "bg-zinc-950 dark:bg-zinc-950 text-zinc-50"
    )}>
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

      <CardContent className="p-8 md:p-10 relative z-10 flex flex-col h-full justify-center min-h-[400px]">

        <div className="mb-auto">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
            {mode === "GROWTH" ? <TrendingUp className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-amber-400" />}
            {mode === "GROWTH" ? `Patrimônio em ${years} anos` : "Aporte Mensal Necessário"}
          </p>

          <div className="text-4xl sm:text-5xl font-black font-mono tracking-tighter mb-2 text-white drop-shadow-md">
            {mode === "GROWTH"
              ? formatCurrency(finalData.total)
              : formatCurrency(requiredMonthly)
            }
          </div>

          {mode === "GOAL" && (
            <p className="text-sm font-bold text-zinc-400 mt-2">
              para atingir a meta de <span className="text-white">{formatCurrency(targetAmount)}</span>
            </p>
          )}
        </div>

        <div className="space-y-4 mt-8 bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm shadow-inner">
          <ResultRow label="Total Investido" value={formatCurrency(finalData.invested)} />

          {compareSavings && (
            <ResultRow label="Se fosse na Poupança" value={formatCurrency(finalData.savings)} opacity="text-zinc-400" />
          )}

          <div className="h-px bg-white/10 my-4" />

          <div className="flex justify-between items-center pt-1">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
              Lucro Realizado
            </span>
            <span className="text-xl font-black font-mono tracking-tighter text-emerald-400 drop-shadow-md">
              + {formatCurrency(realProfit)}
            </span>
          </div>

          {compareSavings && differenceToSavings > 0 && (
            <div className="text-[10px] font-bold text-zinc-500 text-right mt-2">
              Rende <span className="text-emerald-400/80">{formatCurrency(differenceToSavings)}</span> a mais que a poupança
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ResultRow({ label, value, opacity = "text-zinc-100" }: { label: string, value: string, opacity?: string }) {
  return (
    <div className={`flex justify-between items-center text-sm transition-all ${opacity}`}>
      <span className="font-semibold">{label}</span>
      <span className="font-black font-mono tracking-tight text-base">{value}</span>
    </div>
  );
}
