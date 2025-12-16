"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger 
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
    Info, TrendingUp, Wallet, Banknote, CheckCircle2, ArrowRight, ShieldCheck 
} from "lucide-react";
import { PRODUCTS, InvestmentProduct, GLOSSARY } from "./investment-data";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

interface ComparatorProps {
    cdi: number;
}

export function ProductComparator({ cdi }: ComparatorProps) {
    const calculateProduct = (product: InvestmentProduct) => {
        // Exemplo fixo: 5 anos, R$ 1000 inicial (para comparação padronizada)
        const initialAmount = 1000;
        const years = 5;
        
        let annualRate = 0;
        if (product.fixed) annualRate = product.rateVal / 100;
        else if (product.variable) annualRate = product.rateVal / 100;
        else annualRate = (product.rateVal / 100) * (cdi / 100);

        const grossAmount = initialAmount * Math.pow(1 + annualRate, years);
        const grossProfit = grossAmount - initialAmount;
        
        // IR Regressivo (15% para > 2 anos)
        const taxRate = product.isTaxFree ? 0 : 0.15;
        const tax = grossProfit * taxRate;
        const netAmount = grossAmount - tax;
        const netProfit = netAmount - initialAmount;

        const cdiReturn = (Math.pow(1 + (cdi / 100), years) - 1);
        const equivalentCDI = ((netAmount / initialAmount - 1) / cdiReturn) * 100;

        return { netAmount, netProfit, equivalentCDI };
    };

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="space-y-6">
            
            {/* Disclaimer / Info Contextual */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-4 items-center animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="p-2.5 bg-primary/10 rounded-full text-primary shrink-0">
                    <Info className="h-5 w-5" />
                </div>
                <div>
                    <h4 className="font-bold text-foreground text-sm">Cenário de Simulação</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Comparativo padronizado: Aporte único de <strong>R$ 1.000</strong> por <strong>5 anos</strong> considerando CDI atual de <strong>{cdi}% a.a.</strong>
                    </p>
                </div>
            </div>

            {/* Grid de Produtos */}
            <div className="grid gap-4 md:grid-cols-2">
                {PRODUCTS.map((product) => {
                    const result = calculateProduct(product);
                    const isBest = result.equivalentCDI > 105;

                    return (
                        <Dialog key={product.id}>
                            <DialogTrigger asChild>
                                <div className={cn(
                                    "group relative bg-card border rounded-xl p-6 cursor-pointer transition-all duration-300",
                                    "hover:shadow-lg hover:scale-[1.01]",
                                    isBest 
                                        ? "border-primary/50 shadow-primary/5" 
                                        : "border-border/60 hover:border-primary/30"
                                )}>
                                    {isBest && (
                                        <div className="absolute -top-3 left-6 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 z-10">
                                            <TrendingUp className="h-3 w-3" /> RENTABILIDADE TOP
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="flex items-start gap-4">
                                            <div className={cn(
                                                "p-3 rounded-xl transition-colors",
                                                product.type === 'TESOURO' ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" :
                                                product.type === 'FII' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                                                "bg-primary/10 text-primary"
                                            )}>
                                                {product.type === 'TESOURO' ? <Banknote className="h-6 w-6" /> : 
                                                 product.type === 'FII' ? <TrendingUp className="h-6 w-6" /> : 
                                                 <Wallet className="h-6 w-6" />}
                                            </div>
                                            <div>
                                                <Badge variant="secondary" className="mb-2 text-[10px] bg-muted text-muted-foreground hover:bg-muted font-mono uppercase tracking-wider">
                                                    {product.type}
                                                </Badge>
                                                <h3 className="font-bold text-lg text-foreground leading-tight group-hover:text-primary transition-colors">
                                                    {product.name}
                                                </h3>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1 max-w-[200px]">
                                                    {product.desc}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between border-t border-dashed border-border/60 pt-4 mt-2">
                                        <div className="flex gap-2">
                                            {product.isTaxFree && (
                                                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900">
                                                    Isento IR
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                                                Risco {product.risk}
                                            </Badge>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                                                Retorno Líquido
                                            </p>
                                            <div className="flex items-center justify-end gap-1.5 text-primary">
                                                <span className="text-xl font-black tracking-tight">{formatCurrency(result.netAmount)}</span>
                                                <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </DialogTrigger>
                            
                            {/* --- MODAL DE DETALHES --- */}
                            <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-0 shadow-2xl">
                                {/* Header com Gradiente */}
                                <div className="bg-primary text-primary-foreground p-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                                    <DialogHeader className="relative z-10 text-left space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                                                {product.type}
                                            </Badge>
                                            {product.hasFGC && (
                                                <Badge variant="outline" className="text-primary-foreground border-white/40 flex items-center gap-1">
                                                    <ShieldCheck className="h-3 w-3" /> Garantia FGC
                                                </Badge>
                                            )}
                                        </div>
                                        <div>
                                            <DialogTitle className="text-3xl font-black tracking-tight">{product.name}</DialogTitle>
                                            <DialogDescription className="text-primary-foreground/80 mt-2 text-base text-left leading-relaxed max-w-lg">
                                                {product.desc}
                                            </DialogDescription>
                                        </div>
                                    </DialogHeader>
                                </div>

                                {/* Corpo do Modal */}
                                <div className="p-8 space-y-8 bg-card">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Lucro Líquido</p>
                                            <p className="text-4xl font-black text-primary tracking-tighter">
                                                + {formatCurrency(result.netProfit)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">Já descontando impostos e taxas.</p>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Equivalência</p>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-3xl font-black text-foreground">
                                                        {result.equivalentCDI.toFixed(0)}%
                                                    </span>
                                                    <span className="text-sm font-bold text-muted-foreground">do CDI</span>
                                                </div>
                                            </div>
                                            <Progress 
                                                value={Math.min((result.equivalentCDI / 150) * 100, 100)} 
                                                className="h-2 bg-muted [&>div]:bg-primary" 
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-muted/30 border border-border p-5 rounded-xl flex gap-4 items-start">
                                        <div className={cn(
                                            "p-2.5 rounded-full h-fit mt-0.5",
                                            result.equivalentCDI > 100 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                        )}>
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-foreground">Análise de Rentabilidade</h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {result.equivalentCDI > 100 
                                                    ? `Excelente opção! Este investimento supera o CDI tradicional. Mesmo com impostos (se houver), você ganha aproximadamente ${Math.round(result.equivalentCDI - 100)}% acima do benchmark básico de renda fixa.`
                                                    : "Rende próximo ou abaixo do CDI. Geralmente escolhido pela segurança extrema ou liquidez imediata (resgate a qualquer momento)."
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <Button className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                                        Simular Aporte Real
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    );
                })}
            </div>

            {/* Glossário */}
            <div className="pt-8 border-t border-border mt-8">
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" /> Glossário Rápido
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(GLOSSARY).map(([term, def]) => (
                        <HoverCard key={term}>
                            <HoverCardTrigger asChild>
                                <div className="bg-muted/30 border border-border/60 hover:border-primary/40 hover:bg-primary/5 p-3 rounded-lg text-center cursor-help transition-all duration-200">
                                    <span className="text-xs font-bold text-muted-foreground group-hover:text-primary">{term}</span>
                                </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-64 text-xs z-50 border-border/60 shadow-xl" sideOffset={8}>
                                <p className="font-bold mb-1 text-primary">{term}</p>
                                <p className="text-muted-foreground leading-relaxed">{def}</p>
                            </HoverCardContent>
                        </HoverCard>
                    ))}
                </div>
            </div>
        </div>
    );
}