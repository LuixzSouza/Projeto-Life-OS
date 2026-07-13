"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Info, TrendingUp, Wallet, Banknote, CheckCircle2, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { PRODUCTS, InvestmentProduct, GLOSSARY } from "./investment-data";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";

interface ComparatorProps {
    cdi: number;
}

export function ProductComparator({ cdi }: ComparatorProps) {
    const formatCurrency = useFormatCurrency();
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

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            
            {/* Disclaimer / Info Contextual */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center shadow-sm">
                <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0 shadow-sm border border-primary/20">
                    <Info className="h-5 w-5" />
                </div>
                <div>
                    <h4 className="font-extrabold text-foreground text-sm uppercase tracking-wider mb-1.5">Como ler esta simulação</h4>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                        Aporte único de <strong>R$ 1.000</strong> com resgate em <strong>5 anos</strong>, calculado com o <strong>CDI ao vivo de {cdi}% a.a.</strong> (Banco Central). As taxas de cada produto abaixo são <strong>exemplos ilustrativos</strong> de mercado — use para comparar o efeito de isenção de IR e do % do CDI. Sua carteira real fica na aba <strong>Carteira</strong>.
                    </p>
                </div>
            </div>

            {/* Grid de Produtos */}
            <div className="grid gap-6 lg:grid-cols-2">
                {PRODUCTS.map((product) => {
                    const result = calculateProduct(product);
                    const isBest = result.equivalentCDI > 105;

                    return (
                        <Dialog key={product.id}>
                            <DialogTrigger asChild>
                                <div className={cn(
                                    "group relative bg-card border rounded-2xl p-6 sm:p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 outline-none",
                                    "hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary",
                                    isBest 
                                        ? "border-primary/50 shadow-[0_0_30px_-10px_rgba(var(--primary),0.2)] bg-primary/[0.02]" 
                                        : "border-border/60 hover:border-primary/30"
                                )}>
                                    
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-8">
                                        <div className="flex items-start gap-4">
                                            <div className={cn(
                                                "p-3.5 rounded-2xl transition-colors shadow-sm border border-border/50 bg-background",
                                                product.type === 'TESOURO' ? "text-amber-500" :
                                                product.type === 'FII' ? "text-blue-500" :
                                                "text-primary"
                                            )}>
                                                {product.type === 'TESOURO' ? <Banknote className="h-6 w-6" /> : 
                                                 product.type === 'FII' ? <TrendingUp className="h-6 w-6" /> : 
                                                 <Wallet className="h-6 w-6" />}
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="secondary" className="text-[9px] font-black bg-muted text-muted-foreground uppercase tracking-widest">
                                                        {product.type}
                                                    </Badge>
                                                    {isBest && (
                                                        <Badge variant="secondary" className="text-[9px] font-black bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest shadow-sm gap-1 pl-1.5 border-0">
                                                            <Zap className="h-3 w-3 fill-current" /> Top Retorno
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h3 className="font-extrabold text-xl text-foreground leading-tight group-hover:text-primary transition-colors">
                                                    {product.name}
                                                </h3>
                                                <p className="text-xs font-medium text-muted-foreground line-clamp-2 sm:line-clamp-1">
                                                    {product.desc}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer do Card */}
                                    <div className="flex flex-col sm:flex-row sm:items-end justify-between border-t border-dashed border-border/60 pt-5 gap-5">
                                        <div className="flex flex-wrap gap-2">
                                            {product.isTaxFree && (
                                                <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 px-2 py-0.5">
                                                    Isento IR
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground border-border/80 px-2 py-0.5">
                                                Risco {product.risk}
                                            </Badge>
                                        </div>
                                        <div className="sm:text-right mt-2 sm:mt-0">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                                                Retorno Líquido
                                            </p>
                                            <div className="flex items-center sm:justify-end gap-2 text-primary">
                                                <span className="text-2xl font-black font-mono tracking-tighter">{formatCurrency(result.netAmount)}</span>
                                                <ArrowRight className="h-5 w-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 hidden sm:block" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </DialogTrigger>
                            
                            {/* --- MODAL DE DETALHES --- */}
                            <DialogContent size="lg">

                                {/* Header do Modal Otimizado */}
                                <div className="bg-card border-b border-border/40 p-6 md:p-8 relative shrink-0">
                                    <DialogHeader className="text-left space-y-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-0 font-black tracking-widest text-[10px] uppercase">
                                                {product.type}
                                            </Badge>
                                            {product.hasFGC && (
                                                <Badge variant="outline" className="text-muted-foreground border-border/60 flex items-center gap-1 font-bold text-[10px] uppercase tracking-widest">
                                                    <ShieldCheck className="h-3.5 w-3.5" /> FGC Garantido
                                                </Badge>
                                            )}
                                        </div>
                                        <div>
                                            <DialogTitle className="text-2xl md:text-3xl font-black tracking-tight text-foreground">{product.name}</DialogTitle>
                                            <DialogDescription className="text-muted-foreground mt-2 text-sm font-medium leading-relaxed max-w-lg">
                                                {product.desc}
                                            </DialogDescription>
                                        </div>
                                    </DialogHeader>
                                </div>

                                {/* Corpo do Modal com Scroll */}
                                <div className="p-6 md:p-8 space-y-8 bg-background overflow-y-auto flex-1">
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2 bg-muted/20 p-5 rounded-2xl border border-border/50 shadow-inner">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Lucro Líquido</p>
                                            <p className="text-3xl md:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-500 tracking-tighter">
                                                + {formatCurrency(result.netProfit)}
                                            </p>
                                            <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">Já descontando taxas/IR.</p>
                                        </div>
                                        
                                        <div className="space-y-4 bg-muted/20 p-5 rounded-2xl border border-border/50 shadow-inner">
                                            <div>
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Força contra o CDI</p>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-3xl md:text-4xl font-black font-mono text-foreground tracking-tighter">
                                                        {result.equivalentCDI.toFixed(0)}%
                                                    </span>
                                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">do CDI Base</span>
                                                </div>
                                            </div>
                                            <Progress 
                                                value={Math.min((result.equivalentCDI / 150) * 100, 100)} 
                                                className="h-2.5 bg-muted/50 [&>div]:bg-primary shadow-inner" 
                                            />
                                        </div>
                                    </div>

                                    {/* Veredito */}
                                    <div className="bg-muted/30 border border-border/60 p-5 rounded-2xl flex gap-4 items-start shadow-sm">
                                        <div className={cn(
                                            "p-2.5 rounded-xl shadow-sm border shrink-0",
                                            result.equivalentCDI > 100 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-background border-border text-muted-foreground"
                                        )}>
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <h4 className="font-extrabold text-foreground text-base">Veredito da Rentabilidade</h4>
                                            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                                {result.equivalentCDI > 100 
                                                    ? `Excelente opção! Supera o CDI tradicional. Mesmo com impostos (se houver), você ganha aproximadamente ${Math.round(result.equivalentCDI - 100)}% acima da renda fixa básica.`
                                                    : "Rende próximo ou abaixo do CDI. Geralmente escolhido por investidores que buscam segurança extrema ou liquidez imediata (resgate a qualquer momento)."
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <Button className="w-full h-14 rounded-xl text-lg font-bold bg-foreground text-background hover:bg-foreground/90 shadow-lg transition-all active:scale-[0.98]">
                                        Planejar Aporte
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    );
                })}
            </div>

            {/* Glossário Tático */}
            <div className="pt-10 mt-10 border-t border-border/40">
                <h3 className="text-sm font-extrabold text-foreground mb-6 flex items-center gap-3 uppercase tracking-widest">
                    <div className="p-1.5 bg-primary/10 rounded-md text-primary"><Info className="h-4 w-4" /></div> 
                    Glossário do Investidor
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(GLOSSARY).map(([term, def]) => (
                        <HoverCard key={term}>
                            <HoverCardTrigger asChild>
                                <div className="bg-muted/20 border border-border/50 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm p-4 rounded-xl text-center cursor-help transition-all duration-300">
                                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">{term}</span>
                                </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-[280px] sm:w-80 text-sm z-50 border-border/50 shadow-2xl rounded-2xl p-6" sideOffset={12}>
                                <p className="font-black text-lg mb-2 text-primary tracking-tight">{term}</p>
                                <p className="text-muted-foreground font-medium leading-relaxed">{def}</p>
                            </HoverCardContent>
                        </HoverCard>
                    ))}
                </div>
            </div>
        </div>
    );
}