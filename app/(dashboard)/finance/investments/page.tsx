import { Button } from "@/components/ui/button";
import { ChevronLeft, LineChart, Sparkles } from "lucide-react";
import Link from "next/link";
import { InvestmentDashboard } from "@/components/finance/investment/investment-dashboard";
import { getMarketOverview } from "@/lib/market-service";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";

export default async function InvestmentsPage() {
  // 1. Busca dados reais no servidor (rápido e seguro)
  const marketData = await getMarketOverview();

  return (
    <PageShell className="relative overflow-hidden selection:bg-primary/20">

      {/* --- BACKGROUND FX (Efeito Enterprise) --- */}
      {/* Grid sutil para dar textura técnica */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      {/* Ponto de luz difuso no topo esquerdo */}
      <div className="absolute left-0 top-0 -z-10 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />

      <PageHeader
        className="bg-transparent backdrop-blur-sm"
        icon={<LineChart className="h-6 w-6" />}
        title="Central de Investimentos"
        description="Simule e planeje o crescimento do seu patrimônio."
        actions={
          <div className="hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-black uppercase tracking-wider text-primary shadow-sm md:flex">
            <Sparkles className="h-4 w-4" />
            <span>Dados de Mercado Ao Vivo</span>
          </div>
        }
      >
        <Link href="/finance" className="w-fit">
          <Button variant="ghost" size="sm" className="-ml-2 gap-1 pl-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Voltar para Finanças
          </Button>
        </Link>
      </PageHeader>

      <PageContainer className="space-y-10">
        <InvestmentDashboard initialMarketData={marketData} />
      </PageContainer>
    </PageShell>
  );
}