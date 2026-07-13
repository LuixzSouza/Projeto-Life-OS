"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Calculator, HelpCircle, TrendingUp, Target, DollarSign, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { INFLATION_RATE, SAVINGS_RATE, type ProjectionPoint } from "./investment-data";
import { InputGroup, TimeSlider } from "./planner-inputs";
import { ProjectionChart } from "./projection-chart";
import { ProjectionResults } from "./projection-results";

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

    const projectionData = useMemo<ProjectionPoint[]>(() => {
        const data: ProjectionPoint[] = [];

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

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 animate-in fade-in duration-500">

            {/* --- COLUNA ESQUERDA: CONFIGURAÇÃO E GRÁFICO (8/12) --- */}
            <div className="xl:col-span-8 space-y-6 flex flex-col">
                <Card className="border-border/40 shadow-sm bg-card rounded-2xl overflow-hidden flex-1 flex flex-col">
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

                        {/* CHART SECTION */}
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

                            <ProjectionChart data={projectionData} compareSavings={compareSavings} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- COLUNA DIREITA: RESULTADOS (4/12) --- */}
            <div className="xl:col-span-4 space-y-6">
                <ProjectionResults
                    mode={mode}
                    years={years}
                    finalData={finalData}
                    requiredMonthly={requiredMonthly}
                    targetAmount={targetAmount}
                    compareSavings={compareSavings}
                    realProfit={realProfit}
                    differenceToSavings={differenceToSavings}
                />
            </div>
        </div>
    );
}
