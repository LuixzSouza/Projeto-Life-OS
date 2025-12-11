"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
    TrendingUp, Calculator, PieChart, Info, 
    ShieldCheck, Rocket, Banknote, HelpCircle, 
    CheckCircle2, RefreshCcw, Landmark, Wallet, ArrowRight, Percent, LucideIcon
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { MarketItem } from "@/lib/market-service";

// --- CONSTANTES ---
const INFLATION_RATE = 4.5;
const SAVINGS_RATE = 6.17;

const GLOSSARY = {
    CDI: "Taxa referência da renda fixa (Nubank, CDBs). Segue a Selic.",
    SELIC: "Taxa básica de juros. Se sobe, renda fixa paga mais.",
    IPCA: "A inflação oficial. Seu lucro real é o que excede isso.",
    LCI_LCA: "Investimentos isentos de Imposto de Renda focados em Imóveis/Agro.",
    FGC: "Fundo Garantidor de Créditos. Segura até R$ 250k se o banco quebrar."
};

// --- TIPAGEM DOS PRODUTOS ---
type ProductType = "CDB" | "LCI_LCA" | "TESOURO" | "FII";

interface InvestmentProduct {
    id: string;
    name: string;
    type: ProductType;
    rateVal: number;
    fixed?: boolean;
    variable?: boolean;
    isTaxFree: boolean;
    hasFGC: boolean;
    maturity: string;
    risk: "Baixo" | "Médio" | "Alto";
    desc: string;
}

const PRODUCTS: InvestmentProduct[] = [
    { id: "nubank", name: "Caixinha Nubank", type: "CDB", rateVal: 100, isTaxFree: false, hasFGC: true, maturity: "D+0", risk: "Baixo", desc: "Liquidez diária. Rende 100% do CDI e você saca quando quiser." },
    { id: "cdb-promo", name: "CDB Banco Médio", type: "CDB", rateVal: 110, isTaxFree: false, hasFGC: true, maturity: "2 anos", risk: "Baixo", desc: "Rende mais que o Nubank, mas seu dinheiro fica preso até o vencimento." },
    { id: "lci", name: "LCI/LCA Isenta", type: "LCI_LCA", rateVal: 90, isTaxFree: true, hasFGC: true, maturity: "1 ano", risk: "Baixo", desc: "Isento de IR. 90% aqui bate CDBs de 115% porque não tem desconto de imposto." },
    { id: "tesouro", name: "Tesouro Prefixado 2029", type: "TESOURO", rateVal: 13.08, fixed: true, isTaxFree: false, hasFGC: false, maturity: "2029", risk: "Médio", desc: "Trava uma taxa altíssima hoje. Ótimo se os juros caírem no futuro, mas tem que levar até o fim." },
    { id: "mxrf11", name: "FII (MXRF11)", type: "FII", rateVal: 12.5, variable: true, isTaxFree: true, hasFGC: false, maturity: "Mensal", risk: "Médio", desc: "Renda variável. Você vira dono de imóveis e recebe aluguel todo mês na conta, isento de IR." },
];

interface InvestmentDashboardProps {
    initialMarketData: MarketItem[];
}

export function InvestmentDashboard({ initialMarketData }: InvestmentDashboardProps) {
    // --- ESTADOS GERAIS ---
    const [profile, setProfile] = useState<"SAFE" | "MODERATE" | "BOLD">("SAFE");
    const [mode, setMode] = useState<"GROWTH" | "GOAL">("GROWTH");
    const [initialAmount, setInitialAmount] = useState(1000);
    const [monthlyContribution, setMonthlyContribution] = useState(500);
    const [years, setYears] = useState(5);
    const [targetAmount, setTargetAmount] = useState(100000);
    const [compareSavings, setCompareSavings] = useState(true);
    const [showInflation, setShowInflation] = useState(false);
    
    // Não precisamos de estado para selectedProduct pois o Dialog controla isso via trigger

    // --- CÁLCULOS DO PLANEJADOR ---
    const rate = useMemo(() => {
        const selic = initialMarketData.find(i => i.ticker === "Selic" || i.ticker === "CDI")?.value || 10.5;
        if (profile === "SAFE") return selic;
        if (profile === "MODERATE") return selic + 2;
        return selic + 5;
    }, [profile, initialMarketData]);

    const projectionData = useMemo(() => {
        const data = [];
        let current = initialAmount;
        let savings = initialAmount;
        const mRate = rate / 100 / 12;
        const mSavings = SAVINGS_RATE / 100 / 12;
        const mInflation = INFLATION_RATE / 100 / 12;
        
        for (let i = 0; i <= years; i++) {
            const inflationFactor = showInflation ? Math.pow(1 + mInflation, i * 12) : 1;
            
            data.push({ 
                year: `Ano ${i}`, 
                total: Math.round(current / inflationFactor), 
                invested: Math.round((initialAmount + (monthlyContribution * 12 * i)) / inflationFactor), 
                savings: Math.round(savings / inflationFactor) 
            });

            for (let m = 0; m < 12; m++) {
                current = (current + monthlyContribution) * (1 + mRate);
                savings = (savings + monthlyContribution) * (1 + mSavings);
            }
        }
        return data;
    }, [initialAmount, monthlyContribution, years, rate, showInflation]);

    const finalAmount = projectionData[projectionData.length - 1].total;
    const finalSavings = projectionData[projectionData.length - 1].savings;
    const difference = finalAmount - finalSavings;

    // Cálculo Reverso
    const requiredMonthly = useMemo(() => {
        const monthlyRate = rate / 100 / 12;
        const months = years * 12; // Usando 'years' como prazo também
        
        // PMT = FV * r / ((1 + r)^n - 1)
        const pmt = targetAmount * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
        return isNaN(pmt) ? 0 : Math.round(pmt);
    }, [targetAmount, years, rate]);

    // --- CÁLCULOS DO COMPARADOR DE PRODUTOS ---
    const calculateProduct = (product: InvestmentProduct) => {
        const cdi = initialMarketData.find(i => i.ticker === "CDI")?.value || 11.15;
        let annualRate = 0;

        if (product.fixed) annualRate = product.rateVal / 100;
        else if (product.variable) annualRate = product.rateVal / 100;
        else annualRate = (product.rateVal / 100) * (cdi / 100);

        // Juros Compostos
        const grossAmount = initialAmount * Math.pow(1 + annualRate, years);
        const grossProfit = grossAmount - initialAmount;
        
        // IR Regressivo
        const taxRate = product.isTaxFree ? 0 : 0.15; 
        const tax = grossProfit * taxRate;
        const netAmount = grossAmount - tax;
        const netProfit = netAmount - initialAmount;

        // Equivalência CDI
        const cdiReturn = (Math.pow(1 + (cdi / 100), years) - 1);
        const equivalentCDI = ((netAmount / initialAmount - 1) / cdiReturn) * 100;

        return { netAmount, netProfit, equivalentCDI };
    };

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="space-y-8 pb-20">
            
            {/* 1. TICKER DE MERCADO */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {initialMarketData.map((item) => (
                    <Card key={item.ticker} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm p-3">
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-xs text-zinc-500">{item.ticker}</span>
                            <span className={`text-[10px] font-bold ${item.variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {item.variation >= 0 ? '▲' : '▼'} {Math.abs(item.variation).toFixed(2)}%
                            </span>
                        </div>
                        <div className="text-sm font-black text-zinc-800 dark:text-zinc-100">
                            {item.type === 'INDEX' ? `${item.value}%` : `R$ ${item.value.toLocaleString('pt-BR')}`}
                        </div>
                    </Card>
                ))}
            </div>

            {/* ABAS PRINCIPAIS */}
            <Tabs defaultValue="PLANNER" className="space-y-6">
                
                <div className="flex justify-center">
                    <TabsList className="grid w-full max-w-md grid-cols-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full">
                        <TabsTrigger value="PLANNER" className="rounded-full">Planejador de Futuro</TabsTrigger>
                        <TabsTrigger value="PRODUCTS" className="rounded-full">Comparar Produtos</TabsTrigger>
                    </TabsList>
                </div>

                {/* --- ABA 1: PLANEJADOR --- */}
                <TabsContent value="PLANNER" className="space-y-6">
                    
                    {/* Seletor de Perfil */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <ProfileButton 
                            active={profile === "SAFE"} 
                            onClick={() => setProfile("SAFE")} 
                            icon={ShieldCheck} 
                            color="emerald" 
                            title="Conservador" 
                            desc="Prioriza segurança. Ideal para Reserva." 
                        />
                        <ProfileButton 
                            active={profile === "MODERATE"} 
                            onClick={() => setProfile("MODERATE")} 
                            icon={Banknote} 
                            color="blue" 
                            title="Moderado" 
                            desc="Equilíbrio para médio prazo (Carro/Casa)." 
                        />
                        <ProfileButton 
                            active={profile === "BOLD"} 
                            onClick={() => setProfile("BOLD")} 
                            icon={Rocket} 
                            color="orange" 
                            title="Arrojado" 
                            desc="Foco em lucro máximo no longo prazo." 
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Gráfico e Inputs */}
                        <div className="lg:col-span-8 space-y-6">
                            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                                <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Calculator className="h-5 w-5 text-emerald-500" /> Simulador
                                        </CardTitle>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant={mode === "GROWTH" ? "secondary" : "ghost"} onClick={() => setMode("GROWTH")}>Crescimento</Button>
                                            <Button size="sm" variant={mode === "GOAL" ? "secondary" : "ghost"} onClick={() => setMode("GOAL")}>Meta</Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {mode === "GROWTH" ? (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-zinc-500">Valor Inicial</Label>
                                                <Input type="number" value={initialAmount} onChange={(e) => setInitialAmount(Number(e.target.value))} className="font-bold text-lg" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-zinc-500">Aporte Mensal</Label>
                                                <Input type="number" value={monthlyContribution} onChange={(e) => setMonthlyContribution(Number(e.target.value))} className="font-bold text-lg" />
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex justify-between"><Label className="text-xs font-bold text-zinc-500">Tempo</Label><span className="text-sm font-black text-emerald-600">{years} anos</span></div>
                                                <Slider value={[years]} onValueChange={(v) => setYears(v[0])} max={30} min={1} className="py-4" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-zinc-500">Quero juntar (Meta)</Label>
                                                <Input type="number" value={targetAmount} onChange={(e) => setTargetAmount(Number(e.target.value))} className="font-bold text-lg border-emerald-500 ring-emerald-500" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-zinc-500">Em quanto tempo? ({years} anos)</Label>
                                                <Slider value={[years]} onValueChange={(v) => setYears(v[0])} max={40} min={1} className="py-4" />
                                            </div>
                                        </div>
                                    )}
                                    
                                    {mode === "GROWTH" && (
                                        <div className="flex flex-wrap gap-6 mb-6 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                                            <div className="flex items-center space-x-2">
                                                <Switch id="inflation" checked={showInflation} onCheckedChange={setShowInflation} />
                                                <Label htmlFor="inflation" className="text-xs cursor-pointer flex items-center gap-1">
                                                    Descontar Inflação 
                                                    <HoverCard>
                                                        <HoverCardTrigger><HelpCircle className="h-3 w-3 text-zinc-400" /></HoverCardTrigger>
                                                        <HoverCardContent className="text-xs w-60">Mostra o valor com o poder de compra de hoje, descontando ~4.5% a.a.</HoverCardContent>
                                                    </HoverCard>
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Switch id="savings" checked={compareSavings} onCheckedChange={setCompareSavings} />
                                                <Label htmlFor="savings" className="text-xs cursor-pointer">Comparar com Poupança</Label>
                                            </div>
                                        </div>
                                    )}

                                    {mode === "GROWTH" ? (
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={projectionData}>
                                                    <defs>
                                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="year" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => formatCurrency(value)} />
                                                    <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fill="url(#colorTotal)" />
                                                    {compareSavings && <Area type="monotone" dataKey="savings" stroke="#f87171" strokeWidth={2} strokeDasharray="3 3" fillOpacity={0} />}
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900 rounded-xl p-8 text-center flex flex-col items-center justify-center h-[300px]">
                                            <p className="text-zinc-500 text-sm mb-2">Para ter <span className="font-bold text-zinc-900 dark:text-white">{formatCurrency(targetAmount)}</span> em {years} anos...</p>
                                            <div className="text-5xl font-black text-emerald-600 dark:text-emerald-400 mb-2">
                                                {formatCurrency(requiredMonthly)}
                                            </div>
                                            <p className="text-sm font-bold text-emerald-700/70 uppercase tracking-widest">por mês</p>
                                            <div className="mt-6 text-xs text-zinc-400 max-w-xs">
                                                *Considerando rentabilidade média de {rate}% a.a. do perfil selecionado.
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Resultados */}
                        <div className="lg:col-span-4 space-y-6">
                            {mode === "GROWTH" && (
                                <Card className="bg-zinc-900 text-white border-zinc-800 shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl"></div>
                                    <CardContent className="p-6 relative z-10">
                                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Resultado em {years} anos</p>
                                        <div className="text-4xl font-black mb-6 text-emerald-400">{formatCurrency(finalAmount)}</div>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between border-b border-zinc-800 pb-2">
                                                <span className="text-zinc-400">Investido</span>
                                                <span className="font-bold">{formatCurrency(projectionData[projectionData.length-1].invested)}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-zinc-800 pb-2">
                                                <span className="text-zinc-400">Poupança daria</span>
                                                <span className="font-bold text-red-300">{formatCurrency(finalSavings)}</span>
                                            </div>
                                            <div className="flex justify-between pt-1">
                                                <span className="text-emerald-400">Ganho Real</span>
                                                <span className="font-bold text-yellow-400">+ {formatCurrency(difference)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <div className="grid grid-cols-2 gap-2">
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
                        </div>
                    </div>
                </TabsContent>

                {/* --- ABA 2: COMPARADOR DE PRODUTOS --- */}
                <TabsContent value="PRODUCTS" className="space-y-6">
                    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
                        <CardContent className="p-4 flex gap-4 items-center">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full text-blue-600"><Info className="h-5 w-5" /></div>
                            <div>
                                <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm">Simulação Baseada no Seu Planejamento</h4>
                                <p className="text-xs text-blue-700/80 dark:text-blue-300/80">
                                    Usando seu aporte inicial de <strong>{formatCurrency(initialAmount)}</strong> e prazo de <strong>{years} anos</strong>.
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
                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Você recebe limpo</p>
                                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                                        <span className="text-2xl font-black">{formatCurrency(result.netAmount)}</span>
                                                        <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </DialogTrigger>
                                    
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
                                                    <h4 className="font-bold text-zinc-900 dark:text-white">O que isso significa?</h4>
                                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                                                        {result.equivalentCDI > 100 
                                                            ? `Este investimento rende MAIS que o Nubank/Poupança. Mesmo pagando imposto, você ganha ${Math.round(result.equivalentCDI - 100)}% a mais que a média.`
                                                            : "Este investimento rende menos ou igual ao básico. Só vale a pena pela liquidez imediata."
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <Button className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20">
                                                Entendi, quero investir
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )
                        })}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Interface e Componente de Botão Tipado
interface ProfileButtonProps {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    color: "emerald" | "blue" | "orange";
    title: string;
    desc: string;
}

function ProfileButton({ active, onClick, icon: Icon, color, title, desc }: ProfileButtonProps) {
    const colorClasses = {
        emerald: active ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700" : "hover:border-emerald-200",
        blue: active ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10 text-blue-700" : "hover:border-blue-200",
        orange: active ? "border-orange-500 bg-orange-50 dark:bg-orange-900/10 text-orange-700" : "hover:border-orange-200"
    };

    return (
        <Button 
            variant="outline" 
            onClick={onClick}
            className={`h-auto py-4 flex flex-col items-start gap-2 border-2 transition-all ${colorClasses[color]} ${!active && "border-transparent"}`}
        >
            <div className="flex items-center gap-2 w-full">
                <div className={`p-2 rounded-full bg-${color}-100 text-${color}-600`}><Icon className="h-5 w-5" /></div>
                <span className="font-bold">{title}</span>
            </div>
            <p className="text-xs text-zinc-500 text-left font-normal whitespace-normal">{desc}</p>
        </Button>
    )
}