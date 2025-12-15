"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, TrendingUp, AlertTriangle, PiggyBank, Pencil, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { updateSalary } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FinanceOverviewProps {
    totalBalance: number;
    netSalary: number;
    grossSalary: number;
    totalRecurring: number;
    hasSalarySet?: boolean; 
}

export function FinanceOverview({ 
    totalBalance, 
    netSalary, 
    grossSalary,
    totalRecurring, 
}: FinanceOverviewProps) {
    
    // --- ESTADO LOCAL ---
    const [isMounted, setIsMounted] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Inicializa com o valor bruto ou 0
    const [tempSalary, setTempSalary] = useState((grossSalary ?? 0).toString());
    
    const [isPending, startTransition] = useTransition();

    // 1. Correção do isMounted (Hydration)
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // 2. Correção do Sync de Salário
    // Atualiza o input apenas se o valor externo mudar E for diferente do atual
    useEffect(() => {
        const newValue = (grossSalary ?? 0).toString();
        if (tempSalary !== newValue && !isEditing) {
            setTempSalary(newValue);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [grossSalary]); 

    // Cálculos Dinâmicos
    const hasSalary = netSalary > 0;
    const freeToSpend = Math.max(0, netSalary - totalRecurring);
    
    const committedPercent = hasSalary 
        ? Math.min((totalRecurring / netSalary) * 100, 100) 
        : 0;

    const getHealthStatus = () => {
        if (!hasSalary) return { color: "bg-zinc-500", text: "text-zinc-500", label: "Não definido" };
        if (committedPercent > 60) return { color: "bg-red-500", text: "text-red-500", label: "Crítico" };
        if (committedPercent > 40) return { color: "bg-amber-500", text: "text-amber-500", label: "Alerta" };
        return { color: "bg-emerald-500", text: "text-emerald-500", label: "Saudável" };
    };

    const health = getHealthStatus();

    const handleSaveSalary = () => {
        // Remove caracteres não numéricos exceto ponto e vírgula
        const cleanValue = tempSalary.replace(/[^\d.,]/g, '').replace(',', '.');
        const val = parseFloat(cleanValue);

        if (isNaN(val) || val < 0) {
            toast.error("Valor inválido");
            return;
        }

        startTransition(async () => {
            await updateSalary(val);
            setIsEditing(false);
            toast.success("Renda atualizada!");
        });
    };

    const formatMoney = (val: number) => {
        // Garante formatação consistente entre server/client
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    // Evita erro de hidratação visual
    if (!isMounted) return <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[220px] animate-pulse bg-muted/10 rounded-xl" />;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* --- CARD 1: PATRIMÔNIO --- */}
            <Card className="md:col-span-1 bg-zinc-900 text-white border-zinc-800 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-all duration-1000"></div>
                
                <CardContent className="p-6 h-full flex flex-col justify-between relative z-10">
                    <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-white/5 rounded-xl backdrop-blur-md border border-white/10 shadow-inner">
                            <Wallet className="h-5 w-5 text-zinc-100" />
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></span>
                        </div>
                    </div>

                    <div className="space-y-1 mt-6">
                        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Patrimônio Líquido</p>
                        <h2 className="text-3xl font-mono font-bold tracking-tight truncate text-white drop-shadow-md">
                            {formatMoney(totalBalance)}
                        </h2>
                    </div>
                </CardContent>
            </Card>

            {/* --- CARD 2: FLUXO & CONFIGURAÇÃO --- */}
            <Card className="bg-card border-border shadow-sm">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Fluxo Mensal
                        </h3>
                        {hasSalary && committedPercent > 60 && (
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-600 text-[10px] font-bold rounded-full flex items-center gap-1 border border-red-500/20">
                                <AlertTriangle className="h-3 w-3" /> Comprometido
                            </span>
                        )}
                    </div>

                    <div className="space-y-4">
                        {/* Linha da Renda (Editável) */}
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground text-xs">Renda Bruta</span>
                            
                            {isEditing ? (
                                <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                                    <Input 
                                        autoFocus
                                        type="text" 
                                        value={tempSalary} 
                                        onChange={(e) => setTempSalary(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSaveSalary()}
                                        className="h-7 w-24 text-right px-2 py-0 text-xs font-mono bg-background border-input"
                                        placeholder="0.00"
                                    />
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/10" onClick={handleSaveSalary} disabled={isPending}>
                                        {isPending ? <Loader2 className="h-3 w-3 animate-spin"/> : <Check className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-500/10" onClick={() => setIsEditing(false)}>
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditing(true)}>
                                    <span className="font-bold text-foreground border-b border-dashed border-transparent group-hover:border-muted-foreground/50 transition-colors">
                                        {formatMoney(grossSalary || 0)}
                                    </span>
                                    <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}
                        </div>

                        {/* Linha dos Gastos Fixos */}
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground text-xs">Custos Fixos</span>
                            <span className="font-bold text-red-600 dark:text-red-400">-{formatMoney(totalRecurring)}</span>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="space-y-2 pt-1">
                            <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                                <span>Comprometido: {Math.round(committedPercent)}%</span>
                                <span>Status: <span className={health.text}>{health.label}</span></span>
                            </div>
                            <Progress 
                                value={committedPercent} 
                                className="h-2 bg-secondary" 
                                indicatorClassName={health.color} 
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* --- CARD 3: LIVRE PARA GASTAR --- */}
            <Card className={cn(
                "bg-card border-border shadow-sm relative overflow-hidden transition-colors",
                !hasSalary && "opacity-60 grayscale"
            )}>
                {/* Faixa de cor no topo */}
                <div className={cn("absolute top-0 left-0 w-full h-1", health.color)} />
                
                <CardContent className="p-6 h-full flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className={cn("p-1.5 rounded-md", hasSalary ? "bg-emerald-500/10 text-emerald-600" : "bg-zinc-100 text-zinc-500")}>
                                <PiggyBank className="h-4 w-4" />
                            </div>
                            <span className={cn("text-sm font-bold uppercase tracking-wide", hasSalary ? "text-emerald-600" : "text-muted-foreground")}>
                                Livre para Gastar
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                            {hasSalary 
                                ? "O que sobra do seu salário líquido após pagar todas as contas fixas." 
                                : "Defina sua renda bruta ao lado para calcular seu potencial de gastos."}
                        </p>
                    </div>

                    <div className="mt-4">
                        <h3 className="text-3xl font-bold text-foreground tracking-tight">
                            {formatMoney(freeToSpend)}
                        </h3>
                        {hasSalary && (
                            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-semibold tracking-wider">
                                Renda Líquida Estimada: {formatMoney(netSalary)}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}