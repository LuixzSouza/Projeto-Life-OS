"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown, Receipt, PiggyBank } from "lucide-react";

interface FinanceOverviewProps {
    totalBalance: number;
    netSalary: number;
    totalRecurring: number;
}

export function FinanceOverview({ totalBalance, netSalary, totalRecurring }: FinanceOverviewProps) {
    const freeToSpend = netSalary - totalRecurring;
    
    // Cálculo de quanto da renda está comprometida
    const comprometidoPercent = netSalary > 0 ? (totalRecurring / netSalary) * 100 : 0;
    const isHighCommitment = comprometidoPercent > 50; // Alerta se gastar mais de 50% em fixos

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* --- CARD PRINCIPAL: PATRIMÔNIO (Preto/Vidro) --- */}
            <Card className="lg:col-span-2 bg-zinc-900 dark:bg-black text-white border-zinc-800 shadow-2xl relative overflow-hidden group">
                {/* Background Decorativo Animado */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-indigo-500/20 to-purple-500/0 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 group-hover:bg-indigo-500/30 transition-all duration-1000"></div>
                
                <CardContent className="p-8 relative z-10 flex flex-col justify-between h-full min-h-[220px]">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Patrimônio Líquido</p>
                            </div>
                            <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
                                R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h2>
                        </div>
                        <div className="hidden sm:flex h-12 w-12 bg-white/10 rounded-2xl items-center justify-center backdrop-blur-md border border-white/10">
                            <Wallet className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8 mt-auto pt-8 border-t border-white/10">
                        <div>
                            <p className="text-zinc-500 text-xs uppercase mb-1 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-emerald-500" /> Receita Est.
                            </p>
                            <p className="text-xl font-semibold text-white">R$ {netSalary.toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                            <p className="text-zinc-500 text-xs uppercase mb-1 flex items-center gap-1">
                                <TrendingDown className="h-3 w-3 text-red-500" /> Custos Fixos
                            </p>
                            <p className="text-xl font-semibold text-white">R$ {totalRecurring.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* --- CARD SECUNDÁRIO: LIVRE PARA GASTAR (Branco/Clean) --- */}
            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                 <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-600"></div>
                 
                 <CardContent className="p-8 h-full flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                                    <PiggyBank className="h-6 w-6" />
                                </div>
                                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">Livre Mensal</span>
                            </div>
                        </div>
                        
                        <p className="text-4xl font-bold text-zinc-900 dark:text-white mt-2">
                            R$ {freeToSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-zinc-400 mt-2">
                            Disponível após pagar contas fixas.
                        </p>
                    </div>

                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between text-xs font-medium text-zinc-500">
                            <span>Comprometido</span>
                            <span className={isHighCommitment ? "text-red-500" : "text-emerald-500"}>
                                {comprometidoPercent.toFixed(0)}%
                            </span>
                        </div>
                        
                        {/* CORREÇÃO: Substituímos o componente Progress por uma div customizada */}
                        {/* Isso permite mudar a cor (bg-red ou bg-emerald) dinamicamente sem erro de TS */}
                        <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                             <div 
                                className={`h-full rounded-full transition-all duration-1000 ${isHighCommitment ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${Math.min(comprometidoPercent, 100)}%` }}
                             />
                         </div>
                    </div>
                 </CardContent>
            </Card>
        </div>
    );
}