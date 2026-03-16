import { prisma } from "@/lib/prisma";
import { RunningDashboard } from "@/components/health/running/running-dashboard";
import { Footprints, AlertCircle, ChevronLeft, ShieldCheck, RefreshCcw } from "lucide-react";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HealthActions } from "@/components/health/health-actions";

export const metadata: Metadata = {
  title: "Corrida | Life OS",
  description: "Monitoramento de pace, distância e evolução de cardio.",
};

export const dynamic = 'force-dynamic';

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

  // --- ESTADO DE ERRO SÓBRIO ---
  if (hasError) {
    return (
        <div className="min-h-[80vh] w-full flex flex-col items-center justify-center p-8 bg-background">
            <div className="p-8 rounded-3xl bg-muted/30 border border-border/40 flex flex-col items-center gap-4 text-center max-w-md shadow-sm">
                <div className="h-16 w-16 bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-full mb-2">
                    <ShieldCheck className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Falha de Leitura</h2>
                <p className="text-muted-foreground text-sm">
                    Não foi possível sincronizar seu histórico de corridas no momento.
                </p>
                <div className="flex gap-3 mt-4">
                    <Link href="/health">
                        <Button variant="ghost" className="rounded-xl">
                            Voltar
                        </Button>
                    </Link>
                    <Link href="/health/running">
                        <Button variant="outline" className="gap-2 rounded-xl">
                            <RefreshCcw className="h-4 w-4" /> Recarregar
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
  }

  // --- RENDERIZAÇÃO PRINCIPAL ---
  return (
    <div className="min-h-screen bg-background w-full pb-12">
        <div className="w-full p-6 md:p-8 space-y-8">
            
            {/* --- HEADER FULL-WIDTH --- */}
            <header className="flex flex-col gap-4 pb-6 border-b border-border/40">
                
                {/* Botão de Voltar */}
                <div>
                    <Link href="/health">
                        <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground hover:text-foreground gap-1.5 h-8 px-3 rounded-lg">
                            <ChevronLeft className="h-4 w-4" />
                            Voltar para Overview
                        </Button>
                    </Link>
                </div>

                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
                    {/* Título e Ícone */}
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Footprints className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Corrida & Cardio</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Acompanhe seu pace, volume de treinamento e evolução.
                            </p>
                        </div>
                    </div>

                    {/* Componente Dinâmico de Ações */}
                    <div className="w-full xl:w-auto">
                        <HealthActions />
                    </div>
                </div>
            </header>

            {/* --- DASHBOARD PRINCIPAL --- */}
            <main className="animate-in fade-in duration-500">
                <RunningDashboard runs={serializedRuns} />
            </main>
            
        </div>
    </div>
  );
}