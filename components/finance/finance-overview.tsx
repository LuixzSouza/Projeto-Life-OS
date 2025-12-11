"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Wallet, TrendingUp, AlertTriangle, PiggyBank, ArrowRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ✅ CORREÇÃO 1: Adicionada a prop hasSalarySet (opcional, com default true na lógica)
interface FinanceOverviewProps {
    totalBalance: number;
    netSalary: number;
    totalRecurring: number;
    hasSalarySet?: boolean; 
}

export function FinanceOverview({ 
    totalBalance, 
    netSalary, 
    totalRecurring, 
    hasSalarySet = false 
}: FinanceOverviewProps) {
    
    // Cálculos de segurança (evita números negativos estranhos)
    const freeToSpend = Math.max(0, netSalary - totalRecurring);
    
    // Evita divisão por zero
    const comprometidoPercent = netSalary > 0 
        ? Math.min((totalRecurring / netSalary) * 100, 100) 
        : 0;
        
    const isCritical = comprometidoPercent > 60; // Alerta se gastar > 60% em fixos
    const isWarning = comprometidoPercent > 40 && comprometidoPercent <= 60;

    // Helper de formatação
    const money = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* --- CARD 1: PATRIMÔNIO TOTAL (O mais importante) --- */}
            <Card className="md:col-span-1 bg-zinc-900 dark:bg-black text-white border-zinc-800 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-600/30 transition-all duration-700"></div>
                
                <CardContent className="p-6 h-full flex flex-col justify-between relative z-10">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                            <Wallet className="h-5 w-5 text-white" />
                        </div>
                        {/* Indicador visual sutil */}
                        <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        </div>
                    </div>

                    <div className="mt-6">
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Patrimônio Líquido</p>
                        <h2 className="text-3xl font-mono font-bold tracking-tight text-white truncate" title={money(totalBalance)}>
                            {money(totalBalance)}
                        </h2>
                    </div>
                </CardContent>
            </Card>

            {/* --- CARD 2: SAÚDE MENSAL (Renda vs Fixos) --- */}
            <Card className="md:col-span-1 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Fluxo Mensal
                        </h3>
                        {isCritical && hasSalarySet && (
                            <div className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Atenção
                            </div>
                        )}
                    </div>

                    {hasSalarySet ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-zinc-500">Renda Líquida</p>
                                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{money(netSalary)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500">Fixos & Assinaturas</p>
                                    <p className="font-bold text-red-600 dark:text-red-400">-{money(totalRecurring)}</p>
                                </div>
                            </div>

                            {/* Barra de Progresso Customizada */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-medium text-zinc-500">
                                    <span>Comprometido: {comprometidoPercent.toFixed(0)}%</span>
                                    <span>Ideal: &lt; 50%</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div 
                                        className={cn(
                                            "h-full rounded-full transition-all duration-1000 ease-out",
                                            isCritical ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-emerald-500"
                                        )}
                                        style={{ width: `${comprometidoPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        // ✅ EMPTY STATE: Se não tiver salário configurado
                        <div className="flex flex-col items-center justify-center text-center h-full gap-3 py-2">
                            <p className="text-sm text-zinc-500">Configure sua renda mensal para ver a análise de gastos.</p>
                            <Link href="/settings">
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Settings className="h-3 w-3" /> Configurar
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* --- CARD 3: LIVRE PARA GASTAR (Resultado) --- */}
            <Card className="md:col-span-1 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-zinc-950 border-emerald-100 dark:border-emerald-900/30">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-md text-emerald-600 dark:text-emerald-400">
                                <PiggyBank className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                                Livre para Gastar
                            </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 leading-snug">
                            O que sobra da sua renda após pagar todas as contas fixas.
                        </p>
                    </div>

                    <div className="mt-4">
                        {hasSalarySet ? (
                            <>
                                <h3 className="text-3xl font-bold text-zinc-900 dark:text-white">
                                    {money(freeToSpend)}
                                </h3>
                                <p className="text-xs text-zinc-400 mt-1">
                                    Disponível para lazer e investimentos.
                                </p>
                            </>
                        ) : (
                            <div className="flex items-center gap-2 text-zinc-400 italic text-sm mt-2">
                                <ArrowRight className="h-4 w-4" /> Aguardando configuração...
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}