// components/landing/bento/finance-card.tsx
"use client";

import { useState, useMemo } from "react";
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { BaseCard } from "./base-card";

// Dados simulados mais ricos
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

  // Calcula os totais (ou pega do item em hover)
  const activeData = useMemo(() => {
    if (hoveredIndex !== null) {
      return {
        income: CHART_DATA[hoveredIndex].income * 100, // Valor simulado
        expense: CHART_DATA[hoveredIndex].expense * 100,
        label: CHART_DATA[hoveredIndex].label,
        balance: (CHART_DATA[hoveredIndex].income - CHART_DATA[hoveredIndex].expense) * 100
      };
    }
    // Default (Visão Geral)
    return {
      income: 12450, // Média ou Total
      expense: 3400,
      label: "Visão Geral",
      balance: 9050
    };
  }, [hoveredIndex]);

  return (
    <BaseCard
      title="Financeiro"
      description="Fluxo de caixa inteligente."
      icon={Wallet}
      className="col-span-2 md:col-span-2 lg:col-span-2"
    >
      <div className="flex h-full w-full">
        
        {/* --- LADO ESQUERDO: METRICAS DINÂMICAS --- */}
        <div className="flex flex-col justify-between p-5 w-[35%] border-r border-white/5 bg-zinc-900/30">
            <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {activeData.label}
                </p>
                <div className="text-xl font-bold text-white tabular-nums">
                    <span className="text-sm text-zinc-500 mr-1">R$</span>
                    {activeData.balance.toLocaleString('pt-BR')}
                </div>
            </div>

            <div className="space-y-3">
                {/* Receitas */}
                <div className="group flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-emerald-500/20 text-emerald-500">
                            <ArrowUpRight className="h-3 w-3" />
                        </div>
                        <span className="text-[10px] text-zinc-400">Entrada</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 tabular-nums">
                        {activeData.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    </span>
                </div>

                {/* Despesas */}
                <div className="group flex items-center justify-between p-2 rounded-lg bg-rose-500/5 border border-rose-500/10 transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-rose-500/20 text-rose-500">
                            <ArrowDownRight className="h-3 w-3" />
                        </div>
                        <span className="text-[10px] text-zinc-400">Saída</span>
                    </div>
                    <span className="text-xs font-bold text-rose-400 tabular-nums">
                        {activeData.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    </span>
                </div>
            </div>
        </div>

        {/* --- LADO DIREITO: GRÁFICO INTERATIVO --- */}
        <div className="relative flex-1 flex items-end justify-between gap-2 px-6 pb-6 pt-8">
            
            {/* Linhas de Grid (Fundo) */}
            <div className="absolute inset-0 px-6 pb-6 pt-8 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="w-full h-px bg-zinc-500 border-t border-dashed" />
                <div className="w-full h-px bg-zinc-500 border-t border-dashed" />
                <div className="w-full h-px bg-zinc-500 border-t border-dashed" />
            </div>

            {/* Barras */}
            {CHART_DATA.map((item, i) => (
                <div key={i} className="relative flex-1 h-full flex items-end group/bar z-10">
                    
                    {/* Barra de Fundo (Placeholder) */}
                    <div className="absolute bottom-0 w-full h-full bg-zinc-800/30 rounded-t-sm" />

                    {/* Barra Ativa */}
                    <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: `${item.income}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05, type: "spring", bounce: 0 }}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className={cn(
                            "w-full rounded-t-sm cursor-crosshair relative overflow-hidden transition-all duration-200",
                            hoveredIndex === i 
                                ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)] z-20" 
                                : hoveredIndex !== null // Se estiver hover em outro, diminui opacidade deste
                                    ? "bg-zinc-700 opacity-40"
                                    : "bg-emerald-600 opacity-80"
                        )}
                    >
                        {/* Brilho no topo da barra */}
                        <div className="absolute top-0 w-full h-1 bg-white/20" />
                    </motion.div>
                    
                    {/* Label do Mês (Aparece no Hover) */}
                    <div className={cn(
                        "absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono text-zinc-500 transition-all duration-200",
                        hoveredIndex === i ? "text-white font-bold -translate-y-1" : "opacity-0"
                    )}>
                        {item.month}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </BaseCard>
  );
}