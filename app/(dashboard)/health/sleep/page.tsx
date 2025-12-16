import { prisma } from "@/lib/prisma";
import { SleepDashboard } from "@/components/health/sleep/sleep-dashboard";
import { Moon, AlertCircle, Clock, ChevronLeft } from "lucide-react";
import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sono | Health",
  description: "Monitoramento da qualidade do sono e recuperação.",
};

// --- Tipagem Estrita (Zero Any) ---
interface SerializedSleepData {
  id: string;
  date: string;
  value: number;
}

export default async function SleepPage() {
  let serializedData: SerializedSleepData[] = [];
  let averageSleep = 0;
  let hasError = false;

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const sleepData = await prisma.healthMetric.findMany({
      where: {
        type: "SLEEP",
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    });

    // Cálculo da média para o Header (KPI)
    if (sleepData.length > 0) {
      const totalHours = sleepData.reduce((acc, curr) => acc + curr.value, 0);
      averageSleep = totalHours / sleepData.length;
    }

    // Serialização
    serializedData = sleepData.map(item => ({
      id: item.id,
      date: item.date.toISOString(),
      value: item.value,
    }));

  } catch (error) {
    console.error("Critical Error in SleepPage:", error);
    hasError = true;
  }

  // --- Render Error State ---
  if (hasError) {
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
                Não foi possível carregar os dados de sono. Verifique sua conexão.
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
            
            {/* Navegação / Breadcrumb */}
            <div>
                <Link href="/health" className="w-fit block">
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
                        <Moon className="h-6 w-6" />
                    </div>
                    Monitor de Sono
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                    Análise de qualidade do descanso, recuperação neural e consistência.
                    </p>
                </div>

                {/* Badge de KPI (Média) */}
                <div className="flex items-center gap-3 px-5 py-2.5 bg-background/50 backdrop-blur-sm border border-border/50 rounded-full shadow-sm animate-in fade-in slide-in-from-right-4 duration-700">
                    <div className="p-1.5 bg-primary/10 rounded-full text-primary">
                        <Clock className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Média 30 Dias</span>
                        <span className="text-sm font-semibold text-foreground">
                            {averageSleep > 0 ? `${averageSleep.toFixed(1)} horas/noite` : "Sem dados suficientes"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
      </header>

      <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Dashboard Component */}
        <SleepDashboard data={serializedData} />

      </main>
    </div>
  );
}