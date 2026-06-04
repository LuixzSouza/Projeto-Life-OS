import { Metadata } from "next";
import { getMarketOverview } from "@/lib/market-service";
import { getWatchlist } from "@/app/(dashboard)/finance/actions";
import { getBrapiToken } from "@/lib/brapi-token";
import { MARKET_POOL, pickRandom } from "@/lib/market-pool";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
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
  // Seleção aleatória do universo da B3 — "descoberta" para quem não conhece tickers.
  // O usuário pode favoritar/buscar outras no cliente; "Descobrir outras" re-sorteia.
  const extendedTickers = pickRandom(MARKET_POOL, 18);

  const userId = await requireUserId();
  const brapiToken = await getBrapiToken(userId);
  const [marketData, watchlist] = await Promise.all([
    getMarketOverview(extendedTickers, brapiToken),
    getWatchlist(),
  ]);

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
        <MarketDashboard data={marketData} initialFavorites={watchlist} />
      </PageContainer>
    </PageShell>
  );
}