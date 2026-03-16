"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Calculator, HelpCircle, TrendingUp, Target, DollarSign, CalendarClock, Sparkles } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import { INFLATION_RATE, SAVINGS_RATE } from "./investment-data";

interface PlannerProps {
    rate: number;
}

export function InvestmentPlanner({ rate }: PlannerProps) {
    const [mode, setMode] = useState<"GROWTH" | "GOAL">("GROWTH");
    
    // Estados do Modo Crescimento
    const [initialAmount, setInitialAmount] = useState<number>(1000);
    const [monthlyContribution, setMonthlyContribution] = useState<number>(500);
    
    // Estados do Modo Meta
    const [targetAmount, setTargetAmount] = useState<number>(100000);
    
    // Estados Compartilhados
    const [years, setYears] = useState<number>(5);
    const [compareSavings, setCompareSavings] = useState(true);
    const [showInflation, setShowInflation] = useState(false);

    // --- MOTOR MATEMÁTICO UNIFICADO ---
    
    const requiredMonthly = useMemo(() => {
        const monthlyRate = rate / 100 / 12;
        const months = years * 12;
        const pmt = (targetAmount * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);
        return isNaN(pmt) || pmt < 0 ? 0 : Math.round(pmt);
    }, [targetAmount, years, rate]);

    const projectionData = useMemo(() => {
        const data = [];
        
        const startCapital = mode === "GROWTH" ? (initialAmount || 0) : 0;
        const activeMonthly = mode === "GROWTH" ? (monthlyContribution || 0) : requiredMonthly;
        
        let current = startCapital;
        let savings = startCapital;
        
        const mRate = rate / 100 / 12;
        const mSavings = SAVINGS_RATE / 100 / 12;
        const mInflation = INFLATION_RATE / 100 / 12;

        for (let i = 0; i <= years; i++) {
            const inflationFactor = showInflation ? Math.pow(1 + mInflation, i * 12) : 1;
            
            data.push({
                year: `Ano ${i}`,
                total: Math.round(current / inflationFactor),
                invested: Math.round((startCapital + (activeMonthly * 12 * i)) / inflationFactor),
                savings: Math.round(savings / inflationFactor)
            });

            for (let m = 0; m < 12; m++) {
                current = (current + activeMonthly) * (1 + mRate);
                savings = (savings + activeMonthly) * (1 + mSavings);
            }
        }
        return data;
    }, [mode, initialAmount, monthlyContribution, requiredMonthly, years, rate, showInflation]);

    const finalData = projectionData[projectionData.length - 1];
    const realProfit = finalData.total - finalData.invested;
    const differenceToSavings = finalData.total - finalData.savings;

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 animate-in fade-in duration-500">
            
            {/* --- COLUNA ESQUERDA: CONFIGURAÇÃO E GRÁFICO (8/12) --- */}
            <div className="xl:col-span-8 space-y-6 flex flex-col">
                <Card className="border-border/40 shadow-sm bg-card rounded-[2rem] overflow-hidden flex-1 flex flex-col">
                    <CardHeader className="border-b border-border/40 pb-5 bg-muted/10 shrink-0">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
                            <div className="space-y-1.5">
                                <CardTitle className="flex items-center gap-3 text-xl font-extrabold text-foreground">
                                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-sm">
                                        <Calculator className="h-5 w-5" />
                                    </div>
                                    Simulador de Futuro
                                </CardTitle>
                                <CardDescription className="font-medium text-sm">
                                    Projete seus rendimentos com base na taxa de {rate.toFixed(2)}% a.a.
                                </CardDescription>
                            </div>
                            
                            <div className="flex p-1.5 bg-muted/50 rounded-xl border border-border/50 shadow-inner w-full sm:w-auto shrink-0">
                                <button
                                    onClick={() => setMode("GROWTH")}
                                    className={cn(
                                        "flex-1 sm:flex-none px-5 py-2 text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 outline-none",
                                        mode === "GROWTH" 
                                            ? "bg-background text-primary shadow-sm ring-1 ring-border" 
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                >
                                    <TrendingUp className="h-4 w-4" /> Projeção
                                </button>
                                <button
                                    onClick={() => setMode("GOAL")}
                                    className={cn(
                                        "flex-1 sm:flex-none px-5 py-2 text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 outline-none",
                                        mode === "GOAL" 
                                            ? "bg-background text-primary shadow-sm ring-1 ring-border" 
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                >
                                    <Target className="h-4 w-4" /> Bater Meta
                                </button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 md:p-8 flex flex-col flex-1 bg-background">
                        
                        <div className={cn(
                            "grid gap-6 transition-all duration-500",
                            mode === "GROWTH" ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"
                        )}>
                            {mode === "GROWTH" ? (
                                <>
                                    <InputGroup 
                                        label="Valor Inicial" 
                                        icon={<DollarSign className="h-4 w-4" />}
                                        value={initialAmount} 
                                        onChange={setInitialAmount} 
                                    />
                                    <InputGroup 
                                        label="Aporte Mensal" 
                                        icon={<CalendarClock className="h-4 w-4" />}
                                        value={monthlyContribution} 
                                        onChange={setMonthlyContribution} 
                                    />
                                    <TimeSlider years={years} setYears={setYears} />
                                </>
                            ) : (
                                <>
                                    <InputGroup 
                                        label="Eu quero juntar (Meta)" 
                                        icon={<Target className="h-4 w-4" />}
                                        value={targetAmount} 
                                        onChange={setTargetAmount} 
                                        highlight 
                                    />
                                    <TimeSlider years={years} setYears={setYears} max={40} />
                                </>
                            )}
                        </div>

                        {/* CHART SECTION OTIMIZADA */}
                        <div className="space-y-6 pt-8 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500 border-t border-border/40">
                            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                <div className="flex items-center space-x-3 bg-muted/30 px-4 py-2.5 rounded-xl border border-border/50 transition-colors hover:bg-muted/50 shadow-sm">
                                    <Switch id="inflation" checked={showInflation} onCheckedChange={setShowInflation} />
                                    <Label htmlFor="inflation" className="text-xs font-bold cursor-pointer flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                                        Descontar Inflação
                                        <HoverCard>
                                            <HoverCardTrigger><HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" /></HoverCardTrigger>
                                            <HoverCardContent className="text-xs font-medium w-64 leading-relaxed rounded-xl shadow-xl border-border/50">
                                                Mostra o valor real com o poder de compra de hoje, descontando a inflação média prevista de ~{INFLATION_RATE}% ao ano.
                                            </HoverCardContent>
                                        </HoverCard>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-3 bg-muted/30 px-4 py-2.5 rounded-xl border border-border/50 transition-colors hover:bg-muted/50 shadow-sm">
                                    <Switch id="savings" checked={compareSavings} onCheckedChange={setCompareSavings} />
                                    <Label htmlFor="savings" className="text-xs font-bold cursor-pointer text-muted-foreground uppercase tracking-wider">Comparar Poupança</Label>
                                </div>
                            </div>

                            {/* Container do gráfico fixo para não esmagar no flexbox */}
                            <div className="h-[300px] sm:h-[350px] w-full mt-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        
                                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="currentColor" strokeOpacity={0.06} />
                                        
                                        <XAxis 
                                            dataKey="year" 
                                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tickMargin={12}
                                            minTickGap={30} /* Evita que os anos fiquem encavalados se for 30/40 anos */
                                            interval="preserveStartEnd"
                                        />
                                        
                                        <YAxis 
                                            width={60} /* Largura fixa evita que corte R$ 1.000k */
                                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} 
                                        />
                                        
                                        <Tooltip 
                                            cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }}
                                            contentStyle={{ 
                                                backgroundColor: 'rgba(var(--background), 0.95)', 
                                                backdropFilter: 'blur(8px)',
                                                borderColor: 'hsl(var(--border))', 
                                                borderRadius: '16px', 
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)'
                                            }}
                                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                                            formatter={(value: number) => [formatCurrency(value), "Total Projetado"]}
                                            labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}
                                        />
                                        
                                        <Area 
                                            type="monotone" 
                                            dataKey="total" 
                                            stroke="hsl(var(--primary))" 
                                            strokeWidth={3} 
                                            fill="url(#colorTotal)" 
                                            activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                                        />
                                        
                                        {compareSavings && (
                                            <Area 
                                                type="monotone" 
                                                dataKey="savings" 
                                                stroke="hsl(var(--muted-foreground))" 
                                                strokeWidth={2} 
                                                strokeDasharray="4 4" 
                                                fillOpacity={0} 
                                                activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--muted-foreground))" }}
                                            />
                                        )}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- COLUNA DIREITA: RESULTADOS (4/12) --- */}
            <div className="xl:col-span-4 space-y-6">
                <Card className={cn(
                    "relative overflow-hidden border-0 shadow-xl transition-all duration-700 rounded-[2rem] h-full",
                    "bg-zinc-950 dark:bg-zinc-950 text-zinc-50"
                )}>
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

                    <CardContent className="p-8 md:p-10 relative z-10 flex flex-col h-full justify-center min-h-[400px]">
                        
                        <div className="mb-auto">
                            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                {mode === "GROWTH" ? <TrendingUp className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-amber-400" />}
                                {mode === "GROWTH" ? `Patrimônio em ${years} anos` : "Aporte Mensal Necessário"}
                            </p>
                            
                            <div className="text-4xl sm:text-5xl font-black font-mono tracking-tighter mb-2 text-white drop-shadow-md">
                                {mode === "GROWTH" 
                                    ? formatCurrency(finalData.total) 
                                    : formatCurrency(requiredMonthly)
                                }
                            </div>
                            
                            {mode === "GOAL" && (
                                <p className="text-sm font-bold text-zinc-400 mt-2">
                                    para atingir a meta de <span className="text-white">{formatCurrency(targetAmount)}</span>
                                </p>
                            )}
                        </div>

                        <div className="space-y-4 mt-8 bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm shadow-inner">
                            <ResultRow 
                                label="Total Investido" 
                                value={formatCurrency(finalData.invested)} 
                            />
                            
                            {compareSavings && (
                                <ResultRow 
                                    label="Se fosse na Poupança" 
                                    value={formatCurrency(finalData.savings)} 
                                    opacity="text-zinc-400" 
                                />
                            )}
                            
                            <div className="h-px bg-white/10 my-4" />
                            
                            <div className="flex justify-between items-center pt-1">
                                <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                                    Lucro Realizado
                                </span>
                                <span className="text-xl font-black font-mono tracking-tighter text-emerald-400 drop-shadow-md">
                                    + {formatCurrency(realProfit)}
                                </span>
                            </div>
                            
                            {compareSavings && differenceToSavings > 0 && (
                                <div className="text-[10px] font-bold text-zinc-500 text-right mt-2">
                                    Rende <span className="text-emerald-400/80">{formatCurrency(differenceToSavings)}</span> a mais que a poupança
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTES DE INPUT ---

function InputGroup({ label, value, onChange, highlight = false, icon }: { label: string, value: number, onChange: (v: number) => void, highlight?: boolean, icon?: React.ReactNode }) {
    return (
        <div className="space-y-2.5 group">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 group-focus-within:text-primary transition-colors ml-1">
                <span className="opacity-70">{icon}</span> {label}
            </Label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-base">R$</span>
                <Input 
                    type="number" 
                    value={value || ""} 
                    onChange={(e) => onChange(Number(e.target.value))} 
                    className={cn(
                        "pl-12 font-mono font-bold text-lg h-12 bg-muted/20 border-border/50 rounded-xl transition-all shadow-inner",
                        "focus-visible:ring-primary/30 focus-visible:border-primary",
                        highlight && "border-primary/50 bg-primary/5 text-primary focus-visible:ring-primary/50"
                    )}
                />
            </div>
        </div>
    );
}

function TimeSlider({ years, setYears, max = 40 }: { years: number, setYears: (v: number) => void, max?: number }) {
    return (
        <div className="space-y-5">
            <div className="flex justify-between items-end">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Tempo Investido</Label>
                <span className="text-sm font-black font-mono tracking-tighter text-primary bg-primary/10 px-3 py-1 rounded-lg text-nowrap border border-primary/20 shadow-sm">
                    {years} anos
                </span>
            </div>
            <Slider 
                value={[years]} 
                onValueChange={(v) => setYears(v[0])} 
                max={max} 
                min={1} 
                className="py-1 cursor-grab active:cursor-grabbing" 
            />
        </div>
    );
}

function ResultRow({ label, value, opacity = "text-zinc-100" }: { label: string, value: string, opacity?: string }) {
    return (
        <div className={`flex justify-between items-center text-sm transition-all ${opacity}`}>
            <span className="font-semibold">{label}</span>
            <span className="font-black font-mono tracking-tight text-base">{value}</span>
        </div>
    );
}