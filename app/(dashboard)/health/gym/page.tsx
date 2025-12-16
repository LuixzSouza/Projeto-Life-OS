import { prisma } from "@/lib/prisma";
import { GymDashboard } from "@/components/health/gym/gym-dashboard";
import { Dumbbell, AlertCircle, TrendingUp, ChevronLeft } from "lucide-react";
import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Treino de Força | Health",
  description: "Gestão de treinos e cargas.",
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
      // Tratamento seguro de MuscleGroup
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
              <h2 className="text-xl font-bold text-foreground">Falha no Carregamento</h2>
              <p className="text-sm text-muted-foreground">
                Não foi possível sincronizar seu histórico de treinos.
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
                        <Dumbbell className="h-6 w-6" />
                    </div>
                    Iron Temple
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                    Registro de sobrecarga progressiva e histórico de sessões.
                    </p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-background/50 backdrop-blur-sm border border-border/50 rounded-full shadow-sm animate-in fade-in slide-in-from-right-4 duration-700">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">
                    Foco: <span className="text-foreground font-semibold">Hipertrofia</span>
                    </span>
                </div>
            </div>
        </div>
      </header>

      <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <GymDashboard workouts={serializedWorkouts} />
      </main>
    </div>
  );
}