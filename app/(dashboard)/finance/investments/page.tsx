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
          <div className="flex items-center gap-5">
            <Link href="/finance">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-2xl border-border/50 bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all shadow-sm active:scale-95"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm border border-primary/20 hidden sm:block">
                    <LineChart className="h-6 w-6" />
                </div>
                Central de Investimentos
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm font-bold uppercase tracking-widest mt-1.5">
                Simule e planeje o crescimento do seu patrimônio
              </p>
            </div>
          </div>

          {/* Badge Extra */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-full text-xs font-black tracking-wider uppercase text-primary shadow-sm">
            <Sparkles className="h-4 w-4" />
            <span>Dados de Mercado Ao Vivo</span>
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