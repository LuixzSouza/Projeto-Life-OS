"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestmentPlanner } from "./investment-planner";
import { ProductComparator } from "./product-comparator";
import { ProfileSelector, InvestorProfile } from "./profile-selector";
import { MarketItem } from "@/lib/market-service"; 
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, Target, TrendingUp, Sparkles, Scale } from "lucide-react";
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
            
            {/* HEADER & HERO SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/40 pb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 text-foreground">
                        <Sparkles className="h-8 w-8 text-primary fill-primary/20" />
                        Simulador de Riqueza
                    </h2>
                    <p className="text-muted-foreground mt-2 text-lg max-w-2xl leading-relaxed">
                        Utilize os indicadores atuais do mercado (Selic <strong>{selicRate}%</strong>, IPCA <strong>{ipcaRate}%</strong>) para projetar seu futuro financeiro com precisão.
                    </p>
                </div>
            </div>

            {/* KPI CARDS (Strategic Summary) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard 
                    icon={Target}
                    label="Meta do Perfil"
                    value={`${selectedRate.toFixed(2)}%`}
                    subtext="a.a. estimado"
                    colorClass="text-primary bg-primary/10 border-primary/20"
                />
                <SummaryCard 
                    icon={Calculator}
                    label="Ganho Real (Acima da Inflação)"
                    value={`+${realGain.toFixed(2)}%`}
                    subtext="Poder de compra real"
                    colorClass="text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20"
                />
                <SummaryCard 
                    icon={TrendingUp}
                    label="Referência de Mercado (CDI)"
                    value={`${cdiRate}%`}
                    subtext="Benchmark básico"
                    colorClass="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                />
            </div>

            {/* MAIN CONTENT TABS */}
            <Tabs defaultValue="PLANNER" className="space-y-8">
                <div className="flex justify-center">
                    <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50 p-1.5 rounded-2xl border border-border/50">
                        <TabsTrigger 
                            value="PLANNER" 
                            className="rounded-xl font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all py-2.5"
                        >
                            <Target className="h-4 w-4 mr-2" /> Planejador de Futuro
                        </TabsTrigger>
                        <TabsTrigger 
                            value="PRODUCTS" 
                            className="rounded-xl font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all py-2.5"
                        >
                            <Scale className="h-4 w-4 mr-2" /> Comparar Produtos
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* ABA 1: PLANEJADOR */}
                <TabsContent value="PLANNER" className="space-y-8 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col gap-8">
                        <section>
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 ml-1">
                                1. Defina seu Perfil de Investidor
                            </h3>
                            <ProfileSelector currentProfile={profile} onSelect={setProfile} />
                        </section>
                        
                        <section>
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 ml-1">
                                2. Simule seus Resultados
                            </h3>
                            <InvestmentPlanner rate={selectedRate} />
                        </section>
                    </div>
                </TabsContent>

                {/* ABA 2: PRODUTOS */}
                <TabsContent value="PRODUCTS" className="space-y-6 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-card border border-border/60 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center justify-between shadow-sm">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-foreground">Calculadora de Renda Fixa</h3>
                            <p className="text-muted-foreground max-w-xl text-base leading-relaxed">
                                Descubra o que rende mais no seu bolso: produtos isentos de IR (LCI/LCA) ou produtos tributados (CDB/LC) com taxas mais altas.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium bg-muted/50 px-4 py-2 rounded-lg border border-border/50">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            CDI Atual: <span className="font-bold text-foreground">{cdiRate}%</span>
                        </div>
                    </div>
                    
                    <ProductComparator cdi={cdiRate} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// --- SUB-COMPONENTES ---

function SummaryCard({ icon: Icon, label, value, subtext, colorClass }: { icon: React.ElementType, label: string, value: string, subtext: string, colorClass: string }) {
    return (
        <Card className={cn("border bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 group", colorClass.split(" ")[2])}>
            <CardContent className="p-6 flex items-start gap-5">
                <div className={cn("p-3.5 rounded-2xl transition-transform group-hover:scale-110 duration-300", colorClass.split(" ")[1], colorClass.split(" ")[0])}>
                    <Icon className="h-7 w-7" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">{label}</p>
                    <p className="text-3xl font-black tracking-tight text-foreground">{value}</p>
                    <p className="text-xs font-medium text-muted-foreground/80 mt-1">{subtext}</p>
                </div>
            </CardContent>
        </Card>
    );
}