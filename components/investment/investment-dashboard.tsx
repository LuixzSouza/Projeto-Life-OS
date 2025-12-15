"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketTicker } from "./market-ticker";
import { InvestmentPlanner } from "./investment-planner";
import { ProductComparator } from "./product-comparator";
import { ProfileSelector, InvestorProfile } from "./profile-selector";
import { MarketItem } from "@/lib/market-service"; // Importe do seu serviço existente

interface InvestmentDashboardProps {
    initialMarketData: MarketItem[];
}

export function InvestmentDashboard({ initialMarketData }: InvestmentDashboardProps) {
    const [profile, setProfile] = useState<InvestorProfile>("SAFE");

    // Lógica centralizada da taxa baseada no perfil
    const selectedRate = useMemo(() => {
        const selic = initialMarketData.find(i => i.ticker === "Selic" || i.ticker === "CDI")?.value || 10.5;
        if (profile === "SAFE") return selic;
        if (profile === "MODERATE") return selic + 2;
        return selic + 5;
    }, [profile, initialMarketData]);

    const cdiRate = initialMarketData.find(i => i.ticker === "CDI")?.value || 11.15;

    return (
        <div className="space-y-8 pb-20">
            {/* Componente 1: Ticker de Mercado */}
            <MarketTicker data={initialMarketData} />

            <Tabs defaultValue="PLANNER" className="space-y-6">
                <div className="flex justify-center">
                    <TabsList className="grid w-full max-w-md grid-cols-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full">
                        <TabsTrigger value="PLANNER" className="rounded-full">Planejador</TabsTrigger>
                        <TabsTrigger value="PRODUCTS" className="rounded-full">Produtos</TabsTrigger>
                    </TabsList>
                </div>

                {/* ABA 1: PLANEJADOR */}
                <TabsContent value="PLANNER" className="space-y-6">
                    <ProfileSelector currentProfile={profile} onSelect={setProfile} />
                    <InvestmentPlanner rate={selectedRate} />
                </TabsContent>

                {/* ABA 2: PRODUTOS */}
                <TabsContent value="PRODUCTS" className="space-y-6">
                    <ProductComparator cdi={cdiRate} />
                </TabsContent>
            </Tabs>
        </div>
    );
}