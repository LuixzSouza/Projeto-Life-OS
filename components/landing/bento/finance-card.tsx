// components/landing/bento/finance-card.tsx
"use client";

import { useState, useMemo } from "react";
import { Wallet, ArrowUpRight, ArrowDownRight, LineChart } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BaseCard } from "./base-card";

// models Account (balance) + Transaction (income/expense). Subrotas: Investimentos, Mercado, Transações.
const CHART_DATA = [
  { month: "Jan", income: 35, expense: 20, label: "Janeiro" },
  { month: "Fev", income: 60, expense: 35, label: "Fevereiro" },
  { month: "Mar", income: 45, expense: 40, label: "Março" },
  { month: "Abr", income: 70, expense: 25, label: "Abril" },
  { month: "Mai", income: 50, expense: 30, label: "Maio" },
  { month: "Jun", income: 85, expense: 20, label: "Junho" },
];

export function FinanceCard() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeData = useMemo(() => {
    if (hoveredIndex !== null) {
      const d = CHART_DATA[hoveredIndex];
      return {
        income: d.income * 100,
        expense: d.expense * 100,
        label: d.label,
        balance: (d.income - d.expense) * 100,
      };
    }
    return { income: 12450, expense: 3400, label: "Visão geral", balance: 9050 };
  }, [hoveredIndex]);

  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <BaseCard title="Financeiro" description="Contas, fluxo e investimentos." icon={Wallet} className="col-span-2 md:col-span-2 lg:col-span-2">
      <div className="flex h-full w-full">
        {/* Métricas dinâmicas */}
        <div className="flex w-[35%] flex-col justify-between border-r border-border/60 bg-card/30 p-5">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{activeData.label}</p>
            <div className="text-xl font-bold tabular-nums text-foreground">
              <span className="mr-1 text-sm text-muted-foreground">R$</span>
              {activeData.balance.toLocaleString("pt-BR")}
            </div>
          </div>

          <div className="space-y-3">
            {/* Entrada (seta p/ cima) */}
            <div className="flex items-center justify-between rounded-lg border border-primary/15 bg-primary/5 p-2">
              <div className="flex items-center gap-2">
                <div className="rounded bg-primary/15 p-1 text-primary">
                  <ArrowUpRight className="size-3" />
                </div>
                <span className="text-[10px] text-muted-foreground">Entrada</span>
              </div>
              <span className="text-xs font-bold tabular-nums text-foreground">{fmt(activeData.income)}</span>
            </div>

            {/* Saída (seta p/ baixo) */}
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-2">
              <div className="flex items-center gap-2">
                <div className="rounded bg-muted p-1 text-muted-foreground">
                  <ArrowDownRight className="size-3" />
                </div>
                <span className="text-[10px] text-muted-foreground">Saída</span>
              </div>
              <span className="text-xs font-bold tabular-nums text-muted-foreground">{fmt(activeData.expense)}</span>
            </div>
          </div>
        </div>

        {/* Gráfico interativo */}
        <div className="relative flex flex-1 items-end justify-between gap-2 px-6 pb-6 pt-8">
          {/* linhas de grid themeable */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-6 pb-6 pt-8 opacity-30">
            <div className="h-px w-full border-t border-dashed border-border" />
            <div className="h-px w-full border-t border-dashed border-border" />
            <div className="h-px w-full border-t border-dashed border-border" />
          </div>

          {CHART_DATA.map((item, i) => (
            <div key={item.month} className="group/bar relative z-10 flex h-full flex-1 items-end">
              <div className="absolute bottom-0 h-full w-full rounded-t-sm bg-muted/30" />
              <motion.div
                initial={{ height: 0 }}
                whileInView={{ height: `${item.income}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, type: "spring", bounce: 0 }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={cn(
                  "relative w-full cursor-crosshair overflow-hidden rounded-t-sm transition-all duration-200",
                  hoveredIndex === i
                    ? "z-20 bg-gradient-brand shadow-[0_0_15px_-2px_var(--color-primary)]"
                    : hoveredIndex !== null
                      ? "bg-muted opacity-50"
                      : "bg-primary/70"
                )}
              >
                <div className="absolute top-0 h-1 w-full bg-foreground/20" />
              </motion.div>

              <div className={cn("absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-[9px] text-muted-foreground transition-all duration-200", hoveredIndex === i ? "-translate-y-1 font-bold text-foreground" : "opacity-0")}>
                {item.month}
              </div>
            </div>
          ))}

          {/* selo de módulo */}
          <div className="absolute right-3 top-3 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-primary/70">
            <LineChart className="size-3" /> +18%
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
