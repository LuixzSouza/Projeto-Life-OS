import { prisma } from "@/lib/prisma";
import { BodyDashboard } from "@/components/health/body/body-dashboard";
import { User, AlertCircle, Activity, ChevronLeft } from "lucide-react";
import { BodyStats } from "@/lib/body-math";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Composição Corporal | Health",
  description: "Acompanhamento de medidas e bioimpedância.",
};

export default async function BodyPage() {
  let currentStats: BodyStats | null = null;
  let hasError = false;

  try {
    const metrics = await prisma.healthMetric.findMany({
      orderBy: { date: 'desc' },
      take: 100 
    });

    const getLatest = (type: string) => metrics.find(m => m.type === type)?.value || 0;

    currentStats = {
      weight: getLatest('WEIGHT'),
      height: getLatest('HEIGHT'),
      waist: getLatest('WAIST'),
      neck: getLatest('NECK'),
      hip: getLatest('HIP'),
      age: 25, 
      gender: 'MALE', 
      activityFactor: 1.55 
    };
  } catch (error) {
    console.error("Erro ao carregar dados corporais:", error);
    hasError = true;
  }

  // --- Render Error State ---
  if (hasError || !currentStats) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5 shadow-lg">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-destructive/10 rounded-full">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Dados Indisponíveis</h2>
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar suas métricas de composição corporal. Verifique sua conexão.
              </p>
            </div>
            <div className="flex gap-2 w-full pt-2">
                <Link href="/health" className="flex-1">
                    <Button variant="ghost" className="w-full">Voltar</Button>
                </Link>
                <Button variant="outline" className="flex-1 border-destructive/20 hover:bg-destructive/10 text-destructive">
                Tentar Novamente
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Render Success State ---
  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* HEADER VISUAL */}
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-8 pb-8 px-6 md:px-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
            
            {/* Breadcrumb / Botão Voltar */}
            <div>
                <Link href="/health">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="pl-2 pr-4 h-8 gap-1 text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all group rounded-full"
                    >
                        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-medium uppercase tracking-wide">Voltar para Health Center</span>
                    </Button>
                </Link>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                    <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20 text-primary-foreground">
                        <User className="h-6 w-6" />
                    </div>
                    Composição Corporal
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                    Análise avançada de bioimpedância, proporções áureas e métricas metabólicas.
                    </p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-background/50 backdrop-blur-sm border border-border/50 rounded-full shadow-sm">
                    <Activity className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-sm font-medium text-muted-foreground">
                    Status: <span className="text-foreground font-semibold">Monitorando</span>
                    </span>
                </div>
            </div>
        </div>
      </header>

      <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <BodyDashboard stats={currentStats} />
      </main>
    </div>
  );
}