"use client";

import { useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Activity, ArrowDownLeft } from "lucide-react";
import { MetricCard } from "@/components/finance/metric-card";
import { CashFlowChart, type CashFlowPoint } from "@/components/finance/cash-flow-chart";
import { useSmartView } from "@/components/finance/smart-view-context";
import { cn } from "@/lib/utils";

interface MonthlySummaryProps {
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
  monthlyFlow: CashFlowPoint[];
}

export function MonthlySummary({ totalBalance, monthIncome, monthExpense, monthlyFlow }: MonthlySummaryProps) {
  const { smartView } = useSmartView();
  const monthBalance = monthIncome - monthExpense;

  // Período visível do gráfico de fluxo de caixa (dados vêm com 12 meses)
  const [flowMonths, setFlowMonths] = useState<3 | 6 | 12>(6);
  const flowData = monthlyFlow.slice(-flowMonths);

  return (
    <section className="px-6 md:px-8 pt-4 pb-10 max-w-[1600px] mx-auto space-y-6">
      {/* StatCards rápidos do mês */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Saldo Total"
          value={totalBalance}
          icon={<Wallet className="h-5 w-5 text-primary" />}
          variant="primary"
          tooltip="Soma de todas as suas contas e carteiras."
          isSmartView={smartView}
        />
        <MetricCard
          title="Receitas do Mês"
          value={monthIncome}
          icon={<ArrowDownLeft className="h-5 w-5 text-emerald-500" />}
          variant="success"
          trend="up"
          isSmartView={smartView}
        />
        <MetricCard
          title="Despesas do Mês"
          value={monthExpense}
          icon={<TrendingDown className="h-5 w-5 text-destructive" />}
          variant="danger"
          trend="down"
          isSmartView={smartView}
        />
        <MetricCard
          title="Balanço do Mês"
          value={monthBalance}
          icon={<Activity className="h-5 w-5 text-foreground" />}
          variant={monthBalance >= 0 ? "success" : "danger"}
          description={monthBalance >= 0 ? "Você está no positivo 🎉" : "Atenção: gastos acima das receitas"}
          isSmartView={smartView}
        />
      </div>

      {/* Gráfico de Fluxo de Caixa (AreaChart) */}
      <div className="rounded-[2rem] border border-border/40 bg-card shadow-sm p-6 md:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h3 className="text-lg font-extrabold text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl"><TrendingUp className="h-5 w-5 text-primary" /></div>
            Fluxo de Caixa
          </h3>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Legenda */}
            <div className="hidden sm:flex gap-4 text-[10px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-2 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Entradas</span>
              <span className="flex items-center gap-2 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-rose-500" /> Saídas</span>
            </div>

            {/* Seletor de período (segmented control) */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/50">
              {([3, 6, 12] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFlowMonths(m)}
                  aria-pressed={flowMonths === m}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                    flowMonths === m
                      ? "bg-background text-primary shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m}M
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className={cn("transition-all duration-300", smartView && "blur-md select-none pointer-events-none")}>
          <CashFlowChart data={flowData} />
        </div>
      </div>
    </section>
  );
}
