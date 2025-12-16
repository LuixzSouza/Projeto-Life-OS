import { Button } from "@/components/ui/button";
import { ArrowLeft, LineChart, Sparkles } from "lucide-react";
import Link from "next/link";
import { InvestmentDashboard } from "@/components/finance/investment/investment-dashboard";
import { getMarketOverview } from "@/lib/market-service";

export default async function InvestmentsPage() {
  // 1. Busca dados reais no servidor (rápido e seguro)
  const marketData = await getMarketOverview();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden selection:bg-primary/20">
      
      {/* --- BACKGROUND FX (Efeito Enterprise) --- */}
      {/* Grid sutil para dar textura técnica */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      {/* Ponto de luz difuso no topo esquerdo */}
      <div className="absolute left-0 top-0 -z-10 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />

      <main className="container mx-auto p-6 md:p-10 max-w-[1600px] space-y-10">
        
        {/* --- HEADER DE NAVEGAÇÃO --- */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-start gap-5">
            <Link href="/finance">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 rounded-xl border-border/60 bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <LineChart className="h-6 w-6" />
                </div>
                Central de Investimentos
              </h1>
              <p className="text-muted-foreground text-base max-w-lg">
                Laboratório de estratégia financeira. Analise o mercado e simule o crescimento do seu patrimônio.
              </p>
            </div>
          </div>

          {/* Badge ou Info Extra (Opcional) */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Dados de Mercado Atualizados</span>
          </div>
        </header>

        {/* --- DASHBOARD PRINCIPAL --- */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            <InvestmentDashboard initialMarketData={marketData} />
        </div>

      </main>
    </div>
  );
}