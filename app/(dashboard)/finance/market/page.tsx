import { Metadata } from "next";
import { getMarketOverview } from "@/lib/market-service";
import { MarketDashboard } from "@/components/finance/market/market-dashboard"; // Vamos criar esse componente
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, LineChart } from "lucide-react";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";

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
    <PageShell>
      <PageHeader
        icon={<LineChart className="h-6 w-6" />}
        title="Terminal de Mercado"
        description="Cotações da B3, FIIs, ETFs, câmbio e cripto em tempo real."
      >
        <Link href="/finance" className="w-fit">
          <Button variant="ghost" size="sm" className="-ml-2 gap-1 pl-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Voltar para Finanças
          </Button>
        </Link>
      </PageHeader>

      <PageContainer>
        <MarketDashboard data={marketData} />
      </PageContainer>
    </PageShell>
  );
}