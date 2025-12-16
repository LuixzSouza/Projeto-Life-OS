import { prisma } from "@/lib/prisma";
import { RunningDashboard } from "@/components/health/running/running-dashboard";
import { Footprints, AlertCircle, MapPin, ChevronLeft } from "lucide-react";
import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Corrida | Health",
  description: "Monitoramento de pace, distância e evolução de cardio.",
};

// --- Tipagem Estrita (Zero Any) ---
interface SerializedRun {
  id: string;
  title: string;
  date: string;
  duration: number;
  distance: number | null;
  pace: string | null;
  feeling: string | null;
  notes: string | null;
}

export default async function RunningPage() {
  let serializedRuns: SerializedRun[] = [];
  let totalDistance = 0;
  let hasError = false;

  try {
    // Busca otimizada
    const runningWorkouts = await prisma.workout.findMany({
      where: { 
        type: { in: ["RUNNING", "RUN"] } 
      },
      orderBy: { date: "desc" },
      take: 50 
    });

    // Cálculo de métrica rápida para o Header (Server Side)
    totalDistance = runningWorkouts.reduce((acc, curr) => acc + (curr.distance || 0), 0);

    // Serialização
    serializedRuns = runningWorkouts.map(w => ({
        id: w.id,
        title: w.title,
        duration: w.duration,
        date: w.date.toISOString(),
        distance: w.distance,
        pace: w.pace,
        feeling: w.feeling,
        notes: w.notes,
    }));

  } catch (error) {
    console.error("Critical Error in RunningPage:", error);
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
              <h2 className="text-xl font-bold text-foreground">Falha na Sincronização</h2>
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar seu histórico de corridas.
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
                        <Footprints className="h-6 w-6" />
                    </div>
                    Running Club
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                    Acompanhe seu pace, volume semanal e recordes pessoais.
                    </p>
                </div>

                {/* Badge de Status / Resumo Rápido */}
                <div className="flex items-center gap-2 px-4 py-2 bg-background/50 backdrop-blur-sm border border-border/50 rounded-full shadow-sm animate-in fade-in slide-in-from-right-4 duration-700">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">
                    Volume Recente: <span className="text-foreground font-bold">{totalDistance.toFixed(1)} km</span>
                    </span>
                </div>
            </div>
        </div>
      </header>

      <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Dashboard Component */}
        <RunningDashboard runs={serializedRuns} />

      </main>
    </div>
  );
}