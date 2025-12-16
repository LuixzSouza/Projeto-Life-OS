"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Calculator, HelpCircle, TrendingUp, Target, DollarSign, CalendarClock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import { INFLATION_RATE, SAVINGS_RATE } from "./investment-data";

interface PlannerProps {
    rate: number;
}

export function InvestmentPlanner({ rate }: PlannerProps) {
    const [mode, setMode] = useState<"GROWTH" | "GOAL">("GROWTH");
    const [initialAmount, setInitialAmount] = useState(1000);
    const [monthlyContribution, setMonthlyContribution] = useState(500);
    const [years, setYears] = useState(5);
    const [targetAmount, setTargetAmount] = useState(100000);
    const [compareSavings, setCompareSavings] = useState(true);
    const [showInflation, setShowInflation] = useState(false);

    // --- LÓGICA DE NEGÓCIO (Mantida Intacta) ---
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

    const finalData = projectionData[projectionData.length - 1];
    const difference = finalData.total - finalData.savings;

    const requiredMonthly = useMemo(() => {
        const monthlyRate = rate / 100 / 12;
        const months = years * 12;
        const pmt = targetAmount * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
        return isNaN(pmt) ? 0 : Math.round(pmt);
    }, [targetAmount, years, rate]);

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
            
            {/* --- COLUNA ESQUERDA: CONFIGURAÇÃO E GRÁFICO (8/12) --- */}
            <div className="lg:col-span-8 space-y-6">
                <Card className="border-border/60 shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader className="border-b border-border/40 pb-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Calculator className="h-5 w-5" />
                                    </div>
                                    Simulador de Futuro
                                </CardTitle>
                                <CardDescription>Projete seus rendimentos ou calcule quanto precisa poupar.</CardDescription>
                            </div>
                            
                            {/* Toggle Mode Switcher */}
                            <div className="flex p-1 bg-muted rounded-lg border border-border/50">
                                <button
                                    onClick={() => setMode("GROWTH")}
                                    className={cn(
                                        "px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex items-center gap-2",
                                        mode === "GROWTH" 
                                            ? "bg-background text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <TrendingUp className="h-3.5 w-3.5" /> Crescimento
                                </button>
                                <button
                                    onClick={() => setMode("GOAL")}
                                    className={cn(
                                        "px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex items-center gap-2",
                                        mode === "GOAL" 
                                            ? "bg-background text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Target className="h-3.5 w-3.5" /> Meta
                                </button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 space-y-8">
                        {/* Inputs Section */}
                        {mode === "GROWTH" ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <InputGroup 
                                    label="Valor Inicial" 
                                    icon={<DollarSign className="h-3.5 w-3.5" />}
                                    value={initialAmount} 
                                    onChange={setInitialAmount} 
                                />
                                <InputGroup 
                                    label="Aporte Mensal" 
                                    icon={<CalendarClock className="h-3.5 w-3.5" />}
                                    value={monthlyContribution} 
                                    onChange={setMonthlyContribution} 
                                />
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tempo</Label>
                                        <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-nowrap">
                                            {years} anos
                                        </span>
                                    </div>
                                    <Slider 
                                        value={[years]} 
                                        onValueChange={(v) => setYears(v[0])} 
                                        max={30} 
                                        min={1} 
                                        className="py-2" 
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputGroup 
                                    label="Quero juntar (Meta)" 
                                    icon={<Target className="h-3.5 w-3.5" />}
                                    value={targetAmount} 
                                    onChange={setTargetAmount} 
                                    highlight 
                                />
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Em quanto tempo?</Label>
                                        <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-nowrap">
                                            {years} anos
                                        </span>
                                    </div>
                                    <Slider 
                                        value={[years]} 
                                        onValueChange={(v) => setYears(v[0])} 
                                        max={40} 
                                        min={1} 
                                        className="py-2" 
                                    />
                                </div>
                            </div>
                        )}

                        {/* Chart Section */}
                        {mode === "GROWTH" && (
                            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex flex-wrap items-center gap-6 pb-2 border-b border-border/40">
                                    <div className="flex items-center space-x-2">
                                        <Switch id="inflation" checked={showInflation} onCheckedChange={setShowInflation} />
                                        <Label htmlFor="inflation" className="text-xs cursor-pointer flex items-center gap-1.5 text-muted-foreground">
                                            Descontar Inflação
                                            <HoverCard>
                                                <HoverCardTrigger><HelpCircle className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-primary transition-colors" /></HoverCardTrigger>
                                                <HoverCardContent className="text-xs w-60">
                                                    Mostra o valor com o poder de compra de hoje, descontando ~{INFLATION_RATE}% a.a.
                                                </HoverCardContent>
                                            </HoverCard>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch id="savings" checked={compareSavings} onCheckedChange={setCompareSavings} />
                                        <Label htmlFor="savings" className="text-xs cursor-pointer text-muted-foreground">Comparar com Poupança</Label>
                                    </div>
                                </div>

                                <div className="h-[320px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                            <XAxis 
                                                dataKey="year" 
                                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tickMargin={10}
                                            />
                                            <YAxis 
                                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} 
                                            />
                                            <Tooltip 
                                                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                contentStyle={{ 
                                                    backgroundColor: 'hsl(var(--popover))', 
                                                    borderColor: 'hsl(var(--border))', 
                                                    borderRadius: '8px', 
                                                    fontSize: '12px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                }}
                                                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                                                formatter={(value: number) => [formatCurrency(value), "Total"]}
                                                labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}
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
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* --- COLUNA DIREITA: RESULTADOS (4/12) --- */}
            <div className="lg:col-span-4 space-y-6">
                <Card className={cn(
                    "relative overflow-hidden border-0 shadow-xl transition-all duration-500",
                    "bg-gradient-to-br from-primary/90 to-primary text-primary-foreground" 
                )}>
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

                    <CardContent className="p-8 relative z-10 flex flex-col h-full justify-between min-h-[300px]">
                        <div>
                            <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest mb-2">
                                {mode === "GROWTH" ? `Resultado em ${years} anos` : "Esforço Mensal Necessário"}
                            </p>
                            
                            <div className="text-4xl sm:text-5xl font-black tracking-tight mb-1">
                                {mode === "GROWTH" 
                                    ? formatCurrency(finalData.total) 
                                    : formatCurrency(requiredMonthly)
                                }
                            </div>
                            
                            {mode === "GOAL" && (
                                <p className="text-sm font-medium text-primary-foreground/80">
                                    para atingir {formatCurrency(targetAmount)}
                                </p>
                            )}
                        </div>

                        {mode === "GROWTH" ? (
                            <div className="space-y-4 mt-8 bg-black/10 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                                <ResultRow label="Total Investido" value={formatCurrency(finalData.invested)} />
                                <ResultRow label="Total na Poupança" value={formatCurrency(finalData.savings)} opacity="opacity-70" />
                                <div className="h-px bg-white/20 my-2" />
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-primary-foreground/90">Ganho Real</span>
                                    <span className="text-lg font-bold text-white drop-shadow-md">
                                        + {formatCurrency(difference)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-8 text-xs text-primary-foreground/60 leading-relaxed bg-black/10 p-4 rounded-lg border border-white/10">
                                * Cálculo baseado em juros compostos considerando a rentabilidade média de <strong>{rate}% a.a.</strong> do perfil selecionado. Valores podem variar de acordo com o mercado.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTES OTIMIZADOS ---

function InputGroup({ 
    label, 
    value, 
    onChange, 
    highlight = false, 
    icon 
}: { 
    label: string, 
    value: number, 
    onChange: (v: number) => void, 
    highlight?: boolean,
    icon?: React.ReactNode
}) {
    return (
        <div className="space-y-2 group">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-primary transition-colors">
                {icon} {label}
            </Label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">R$</span>
                <Input 
                    type="number" 
                    value={value} 
                    onChange={(e) => onChange(Number(e.target.value))} 
                    className={cn(
                        "pl-9 font-bold text-lg h-11 bg-background border-border/60 transition-all",
                        "focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary",
                        highlight && "border-primary/50 bg-primary/5 text-primary"
                    )}
                />
            </div>
        </div>
    );
}

function ResultRow({ label, value, opacity = "opacity-90" }: { label: string, value: string, opacity?: string }) {
    return (
        <div className={`flex justify-between items-center text-sm text-primary-foreground ${opacity}`}>
            <span className="font-medium">{label}</span>
            <span className="font-bold tracking-wide">{value}</span>
        </div>
    );
}