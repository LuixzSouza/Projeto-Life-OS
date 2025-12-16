import { Metadata } from "next";
import { getMarketOverview } from "@/lib/market-service";
import { MarketDashboard } from "@/components/finance/market/market-dashboard"; // Vamos criar esse componente
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Mercado Financeiro | LifeOS",
  description: "Cotações em tempo real da B3, Câmbio e Criptomoedas.",
};

export default async function MarketPage() {
  // Vamos buscar uma lista mais completa de ativos para essa página dedicada
  const extendedTickers = [
    "PETR4", "VALE3", "ITUB4", "WEGE3", "PRIO3", "BBAS3", // Blue chips
    "MXRF11", "HGLG11", "KNRI11", "VISC11", // FIIs
    "IVVB11", "BOVA11", "SMAL11" // ETFs
  ];

  const marketData = await getMarketOverview(extendedTickers);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Simples */}
      <header className="border-b border-border/60 bg-muted/20 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center gap-4">
            <Link href="/finance">
                <Button variant="ghost" size="sm" className="gap-1 pl-2 text-muted-foreground">
                    <ChevronLeft className="h-4 w-4" /> Voltar
                </Button>
            </Link>
            <h1 className="text-lg font-semibold">Terminal de Mercado</h1>
        </div>
      </header>

      <main className="px-6 py-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
        <MarketDashboard data={marketData} />
      </main>
    </div>
  );
}