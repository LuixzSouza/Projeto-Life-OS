import { Button } from "@/components/ui/button";
import { ArrowLeft, LineChart } from "lucide-react";
import Link from "next/link";
import { InvestmentDashboard } from "@/components/finance/investment-dashboard";
import { getMarketOverview } from "@/lib/market-service"; // Importa nosso novo serviço

export default async function InvestmentsPage() {
  // 1. Busca dados reais no servidor (rápido e seguro)
  const marketData = await getMarketOverview();

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Link href="/finance">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <LineChart className="h-6 w-6 text-emerald-600" /> Central de Investimentos
                </h1>
                <p className="text-zinc-500 text-sm">Dados de mercado em tempo real e simulações.</p>
            </div>
        </div>
      </div>

      {/* Passa os dados reais para o componente visual */}
      <InvestmentDashboard initialMarketData={marketData} />
    </div>
  );
}