"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Info, TrendingUp, Wallet, Banknote, CheckCircle2, ArrowRight } from "lucide-react";
import { PRODUCTS, InvestmentProduct, GLOSSARY } from "./investment-data";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

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
        <>
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900 mb-6">
                <CardContent className="p-4 flex gap-4 items-center">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full text-blue-600"><Info className="h-5 w-5" /></div>
                    <div>
                        <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm">Cenário de Comparação</h4>
                        <p className="text-xs text-blue-700/80 dark:text-blue-300/80">
                            Simulação padronizada: Aporte único de <strong>R$ 1.000</strong> por <strong>5 anos</strong> com CDI a {cdi}%.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
                {PRODUCTS.map((product) => {
                    const result = calculateProduct(product);
                    const isBest = result.equivalentCDI > 105;

                    return (
                        <Dialog key={product.id}>
                            <DialogTrigger asChild>
                                <div className={`group relative bg-white dark:bg-zinc-900 border rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01] ${isBest ? 'border-emerald-500 shadow-emerald-500/10' : 'border-zinc-200 dark:border-zinc-800'}`}>
                                    {isBest && <div className="absolute -top-3 left-6 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1"><TrendingUp className="h-3 w-3" /> RENTABILIDADE TOP</div>}
                                    
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-xl ${product.type === 'TESOURO' ? 'bg-yellow-100 text-yellow-700' : product.type === 'FII' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800'}`}>
                                                {product.type === 'TESOURO' ? <Banknote className="h-6 w-6" /> : product.type === 'FII' ? <TrendingUp className="h-6 w-6" /> : <Wallet className="h-6 w-6" />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-zinc-900 dark:text-white leading-tight">{product.name}</h3>
                                                <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{product.desc}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between border-t border-dashed border-zinc-100 dark:border-zinc-800 pt-4">
                                        <div className="flex gap-2">
                                            {product.isTaxFree && <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700">Isento IR</Badge>}
                                            <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-200">Risco {product.risk}</Badge>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Retorno (5 anos)</p>
                                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                                <span className="text-2xl font-black">{formatCurrency(result.netAmount)}</span>
                                                <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </DialogTrigger>
                            
                            {/* Conteúdo do Modal (Detalhes) */}
                            <DialogContent className="max-w-2xl p-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950 border-0">
                                <div className="bg-zinc-900 p-8 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                    <DialogHeader className="relative z-10 text-left">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">{product.type}</Badge>
                                            {product.hasFGC && <Badge variant="outline" className="text-blue-300 border-blue-300/30">Garantia FGC</Badge>}
                                        </div>
                                        <DialogTitle className="text-3xl font-black tracking-tight">{product.name}</DialogTitle>
                                        <DialogDescription className="text-zinc-400 mt-2 text-base text-left">{product.desc}</DialogDescription>
                                    </DialogHeader>
                                </div>

                                <div className="p-8 space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Lucro Líquido</p>
                                            <p className="text-3xl font-black text-emerald-600">+ {formatCurrency(result.netProfit)}</p>
                                            <p className="text-sm text-zinc-500 mt-1">Já descontando impostos.</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Equivalência</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-3xl font-black text-zinc-800 dark:text-white">{result.equivalentCDI.toFixed(0)}%</span>
                                                <span className="text-sm font-bold text-zinc-400 mt-2">do CDI</span>
                                            </div>
                                            <Progress value={(result.equivalentCDI / 130) * 100} className="h-2 mt-2 bg-zinc-200" />
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm flex gap-4">
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full h-fit text-blue-600"><CheckCircle2 className="h-6 w-6" /></div>
                                        <div>
                                            <h4 className="font-bold text-zinc-900 dark:text-white">Análise</h4>
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                                                {result.equivalentCDI > 100 
                                                    ? `Este investimento supera o CDI. Mesmo com impostos (se houver), você ganha ${Math.round(result.equivalentCDI - 100)}% acima do benchmark básico.`
                                                    : "Rende próximo ou abaixo do CDI. Geralmente escolhido pela segurança extrema ou liquidez imediata."
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <Button className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20">
                                        Simular Aporte
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    );
                })}
            </div>

            {/* Glossário ao final */}
            <div className="mt-8 grid grid-cols-2 gap-2">
                {Object.entries(GLOSSARY).map(([term, def]) => (
                    <HoverCard key={term}>
                        <HoverCardTrigger asChild>
                            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 rounded text-center cursor-help hover:border-emerald-300 transition-colors">
                                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">{term}</span>
                            </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-60 text-xs z-50">
                            <p className="font-bold mb-1 text-emerald-600">{term}</p>
                            <p className="text-zinc-500">{def}</p>
                        </HoverCardContent>
                    </HoverCard>
                ))}
            </div>
        </>
    );
}