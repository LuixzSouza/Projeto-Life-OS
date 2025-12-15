"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Calculator, HelpCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
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

    // Cálculos de Projeção
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

            // Projetar próximo ano
            for (let m = 0; m < 12; m++) {
                current = (current + monthlyContribution) * (1 + mRate);
                savings = (savings + monthlyContribution) * (1 + mSavings);
            }
        }
        return data;
    }, [initialAmount, monthlyContribution, years, rate, showInflation]);

    const finalData = projectionData[projectionData.length - 1];
    const difference = finalData.total - finalData.savings;

    // Cálculo Reverso (Meta)
    const requiredMonthly = useMemo(() => {
        const monthlyRate = rate / 100 / 12;
        const months = years * 12;
        const pmt = targetAmount * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
        return isNaN(pmt) ? 0 : Math.round(pmt);
    }, [targetAmount, years, rate]);

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Inputs */}
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
                                <InputGroup label="Valor Inicial" value={initialAmount} onChange={setInitialAmount} />
                                <InputGroup label="Aporte Mensal" value={monthlyContribution} onChange={setMonthlyContribution} />
                                <div className="space-y-4">
                                    <div className="flex justify-between"><Label className="text-xs font-bold text-zinc-500">Tempo</Label><span className="text-sm font-black text-emerald-600">{years} anos</span></div>
                                    <Slider value={[years]} onValueChange={(v) => setYears(v[0])} max={30} min={1} className="py-4" />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <InputGroup label="Quero juntar (Meta)" value={targetAmount} onChange={setTargetAmount} highlight />
                                <div className="space-y-4">
                                    <div className="flex justify-between"><Label className="text-xs font-bold text-zinc-500">Em quanto tempo?</Label><span className="text-sm font-black text-emerald-600">{years} anos</span></div>
                                    <Slider value={[years]} onValueChange={(v) => setYears(v[0])} max={40} min={1} className="py-4" />
                                </div>
                            </div>
                        )}

                        {/* Controles do Gráfico */}
                        {mode === "GROWTH" && (
                            <>
                                <div className="flex flex-wrap gap-6 mb-6 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                                    <div className="flex items-center space-x-2">
                                        <Switch id="inflation" checked={showInflation} onCheckedChange={setShowInflation} />
                                        <Label htmlFor="inflation" className="text-xs cursor-pointer flex items-center gap-1">
                                            Descontar Inflação
                                            <HoverCard>
                                                <HoverCardTrigger><HelpCircle className="h-3 w-3 text-zinc-400" /></HoverCardTrigger>
                                                <HoverCardContent className="text-xs w-60">Mostra o valor com o poder de compra de hoje, descontando ~{INFLATION_RATE}% a.a.</HoverCardContent>
                                            </HoverCard>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch id="savings" checked={compareSavings} onCheckedChange={setCompareSavings} />
                                        <Label htmlFor="savings" className="text-xs cursor-pointer">Comparar com Poupança</Label>
                                    </div>
                                </div>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={projectionData}>
                                            <defs>
                                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="year" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => formatCurrency(value)} />
                                            <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fill="url(#colorTotal)" />
                                            {compareSavings && <Area type="monotone" dataKey="savings" stroke="#f87171" strokeWidth={2} strokeDasharray="3 3" fillOpacity={0} />}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        )}

                        {/* Resultado da Meta */}
                        {mode === "GOAL" && (
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

            {/* Resultados Laterais */}
            <div className="lg:col-span-4 space-y-6">
                {mode === "GROWTH" && (
                    <Card className="bg-zinc-900 text-white border-zinc-800 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl"></div>
                        <CardContent className="p-6 relative z-10">
                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Resultado em {years} anos</p>
                            <div className="text-4xl font-black mb-6 text-emerald-400">{formatCurrency(finalData.total)}</div>
                            <div className="space-y-3 text-sm">
                                <ResultRow label="Investido" value={formatCurrency(finalData.invested)} />
                                <ResultRow label="Poupança daria" value={formatCurrency(finalData.savings)} valueClass="text-red-300" />
                                <div className="flex justify-between pt-1">
                                    <span className="text-emerald-400">Ganho Real</span>
                                    <span className="font-bold text-yellow-400">+ {formatCurrency(difference)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

// Helpers do Planner
function InputGroup({ label, value, onChange, highlight = false }: { label: string, value: number, onChange: (v: number) => void, highlight?: boolean }) {
    return (
        <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-500">{label}</Label>
            <Input 
                type="number" 
                value={value} 
                onChange={(e) => onChange(Number(e.target.value))} 
                className={`font-bold text-lg ${highlight ? 'border-emerald-500 ring-emerald-500' : ''}`} 
            />
        </div>
    );
}

function ResultRow({ label, value, valueClass = "" }: { label: string, value: string, valueClass?: string }) {
    return (
        <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">{label}</span>
            <span className={`font-bold ${valueClass}`}>{value}</span>
        </div>
    );
}