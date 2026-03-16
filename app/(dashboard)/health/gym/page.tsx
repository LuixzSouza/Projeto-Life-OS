import { prisma } from "@/lib/prisma";
import { GymDashboard } from "@/components/health/gym/gym-dashboard";
import { Dumbbell, ShieldCheck, RefreshCcw, ChevronLeft } from "lucide-react";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HealthActions } from "@/components/health/health-actions";

export const metadata: Metadata = {
  title: "Treino de Força | Life OS",
  description: "Gestão de treinos e sobrecarga progressiva.",
};

// --- Interfaces & Tipos ---

interface GymExercise {
  name: string;
  weight: string;
  sets: string;
  reps: string;
  isCompleted?: boolean;
}

interface SerializedWorkout {
  id: string;
  title: string;
  date: string;
  duration: number;
  type: string;
  feeling: string | null;
  notes: string | null;
  muscleGroup: string; 
  exercises: GymExercise[];
}

// --- Helper: Parsing Seguro (Zero Any) ---
function parseGymExercises(jsonString: string | null): GymExercise[] {
  if (!jsonString) return [];
  
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: unknown) => {
      if (typeof item !== 'object' || item === null) {
        return { name: "Exercício Inválido", weight: "0", sets: "0", reps: "0", isCompleted: false };
      }

      const record = item as Record<string, unknown>;
      
      return {
        name: String(record.name || "Exercício"),
        weight: String(record.weight || "0"),
        sets: String(record.sets || "0"),
        reps: String(record.reps || "0"),
        isCompleted: Boolean(record.isCompleted)
      };
    });
  } catch (e) {
    console.error("Erro ao processar JSON de exercícios", e);
    return [];
  }
}

export const dynamic = 'force-dynamic';

export default async function GymPage() {
  let serializedWorkouts: SerializedWorkout[] = [];
  let hasError = false;

  try {
    const gymWorkouts = await prisma.workout.findMany({
      where: { type: "GYM" },
      orderBy: { date: "desc" },
      take: 50 
    });

    serializedWorkouts = gymWorkouts.map(w => {
      const rawRecord = w as unknown as Record<string, unknown>;
      const muscleGroup = typeof rawRecord.muscleGroup === 'string' ? rawRecord.muscleGroup : "Geral";

      return {
        id: w.id,
        title: w.title,
        duration: w.duration,
        type: w.type,
        feeling: w.feeling,
        notes: w.notes,
        muscleGroup, 
        date: w.date.toISOString(),
        exercises: parseGymExercises(w.exercises)
      };
    });

  } catch (error) {
    console.error("Erro ao carregar treinos:", error);
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
                    Não foi possível sincronizar seu histórico de treinos no momento.
                </p>
                <Link href="/health" className="mt-4">
                    <Button variant="outline" className="gap-2 rounded-xl">
                        <RefreshCcw className="h-4 w-4" /> Voltar
                    </Button>
                </Link>
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
                            <Dumbbell className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Treino de Força</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Gestão de sobrecarga progressiva e histórico de sessões.
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
                <GymDashboard workouts={serializedWorkouts} />
            </main>
            
        </div>
    </div>
  );
}