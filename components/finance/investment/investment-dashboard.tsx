"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestmentPlanner } from "./investment-planner";
import { ProductComparator } from "./product-comparator";
import { ProfileSelector, InvestorProfile } from "./profile-selector";
import { MarketItem } from "@/lib/market-service"; 
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, Target, TrendingUp, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvestmentDashboardProps {
    initialMarketData: MarketItem[];
}

export function InvestmentDashboard({ initialMarketData }: InvestmentDashboardProps) {
    const [profile, setProfile] = useState<InvestorProfile>("MODERATE");

    // Extraímos apenas os dados necessários para CÁLCULOS
    const selicRate = initialMarketData.find(i => i.ticker === "Selic" || i.ticker === "CDI")?.value || 10.5;
    const cdiRate = initialMarketData.find(i => i.ticker === "CDI")?.value || 11.15;
    const ipcaRate = initialMarketData.find(i => i.ticker === "IPCA")?.value || 4.5;

    // Lógica da taxa baseada no perfil para o SIMULADOR
    const selectedRate = useMemo(() => {
        if (profile === "SAFE") return selicRate; 
        if (profile === "MODERATE") return selicRate + 2; 
        return selicRate + 5; 
    }, [profile, selicRate]);

    // Cálculo do Ganho Real (Juros - Inflação)
    const realGain = selectedRate - ipcaRate;

    return (
        <div className="space-y-10 pb-24 animate-in fade-in duration-700">

            {/* KPI CARDS (Strategic Summary) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <SummaryCard 
                    icon={Target}
                    title="Meta do Perfil"
                    value={`${selectedRate.toFixed(2)}%`}
                    subtitle="a.a. estimado"
                    theme="primary"
                />
                <SummaryCard 
                    icon={Calculator}
                    title="Ganho Real (Acima da Inflação)"
                    value={`+${realGain.toFixed(2)}%`}
                    subtitle="Poder de compra real"
                    theme="blue"
                />
                <SummaryCard 
                    icon={TrendingUp}
                    title="Referência (CDI Atual)"
                    value={`${cdiRate}%`}
                    subtitle="Benchmark básico"
                    theme="emerald"
                />
            </div>

            {/* MAIN CONTENT TABS */}
            <Tabs defaultValue="PLANNER" className="space-y-8">
                <div className="flex justify-center">
                    <TabsList className="grid w-full max-w-[500px] grid-cols-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50 shadow-inner h-auto gap-4">
                        <TabsTrigger 
                            value="PLANNER" 
                            className="rounded-xl font-bold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all py-3"
                        >
                            <Target className="h-4 w-4 mr-2" /> Planejador
                        </TabsTrigger>
                        <TabsTrigger 
                            value="PRODUCTS" 
                            className="rounded-xl font-bold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all py-3"
                        >
                            <Scale className="h-4 w-4 mr-2" /> Comparador
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* ABA 1: PLANEJADOR */}
                <TabsContent value="PLANNER" className="space-y-8 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col gap-8">
                        <section className="bg-card p-6 md:p-8 rounded-[2rem] border border-border/40 shadow-sm">
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">1</div>
                                Defina seu Perfil de Risco
                            </h3>
                            <ProfileSelector currentProfile={profile} onSelect={setProfile} />
                        </section>
                        
                        <section className="bg-card p-6 md:p-8 rounded-[2rem] border border-border/40 shadow-sm">
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">2</div>
                                Simulação de Juros Compostos
                            </h3>
                            <InvestmentPlanner rate={selectedRate} />
                        </section>
                    </div>
                </TabsContent>

                {/* ABA 2: PRODUTOS */}
                <TabsContent value="PRODUCTS" className="space-y-6 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-card border border-border/40 rounded-[2rem] p-6 md:p-8 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between shadow-sm">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-extrabold text-foreground">Calculadora de Renda Fixa</h3>
                            <p className="text-muted-foreground max-w-2xl text-sm font-medium leading-relaxed">
                                Descubra o que rende mais no seu bolso: produtos isentos de IR (como LCI/LCA) ou produtos tributados (como CDB/LC) que oferecem taxas brutas mais altas.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-bold bg-emerald-500/10 text-emerald-600 px-5 py-3 rounded-xl border border-emerald-500/20 shrink-0">
                            <TrendingUp className="h-5 w-5" />
                            CDI Atual: <span className="font-black font-mono text-lg ml-1">{cdiRate}%</span>
                        </div>
                    </div>
                    
                    <div className="bg-card rounded-[2rem] border border-border/40 p-2 sm:p-6 shadow-sm">
                        <ProductComparator cdi={cdiRate} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// --- SUB-COMPONENTES DE UI ---

interface SummaryCardProps {
    icon: React.ElementType;
    title: string;
    value: string;
    subtitle: string;
    theme: "primary" | "blue" | "emerald";
}

function SummaryCard({ icon: Icon, title, value, subtitle, theme }: SummaryCardProps) {
    // Mapeamento seguro de cores do Tailwind
    const themes = {
        primary: {
            bg: "bg-primary/10",
            border: "border-primary/20",
            text: "text-primary",
            cardBorder: "hover:border-primary/30"
        },
        blue: {
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            text: "text-blue-500 dark:text-blue-400",
            cardBorder: "hover:border-blue-500/30"
        },
        emerald: {
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20",
            text: "text-emerald-600 dark:text-emerald-400",
            cardBorder: "hover:border-emerald-500/30"
        }
    };

    const t = themes[theme];

    return (
        <Card className={cn("rounded-[2rem] border border-border/40 bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 group", t.cardBorder)}>
            <CardContent className="p-6 flex flex-col justify-between h-full min-h-[160px]">
                <div className="flex justify-between items-start mb-4">
                    <div className={cn("p-3.5 rounded-2xl shadow-sm border transition-transform duration-300 group-hover:scale-110", t.bg, t.border, t.text)}>
                        <Icon className="h-6 w-6" />
                    </div>
                </div>
                <div className="space-y-1 mt-auto">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
                    <div className="text-3xl font-black font-mono tracking-tighter text-foreground">
                        {value}
                    </div>
                    <p className="text-xs font-bold text-muted-foreground/60 mt-1">{subtitle}</p>
                </div>
            </CardContent>
        </Card>
    );
}