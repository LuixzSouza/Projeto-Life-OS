import { prisma } from "@/lib/prisma";
import { GymDashboard } from "@/components/health/gym/gym-dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { Dumbbell, AlertCircle } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Treino de Força | Health",
  description: "Gestão de treinos e cargas.",
};

// 1. Ajustamos a interface para bater com o que o GymDashboard espera (Tudo string)
interface GymExercise {
  name: string;
  weight: string; // Mudado de string | number para string
  sets: string;   // Mudado de string | number para string
  reps: string;   // Mudado de string | number para string
  isCompleted?: boolean;
}

// 2. Atualizamos a interface do Treino Serializado
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
      let parsedExercises: GymExercise[] = [];
      
      try {
        const json = w.exercises ? JSON.parse(w.exercises) : [];
        if (Array.isArray(json)) {
          // Mapeamos item a item para garantir que números virem strings
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parsedExercises = json.map((item: any) => ({
            name: item.name || "Exercício",
            weight: String(item.weight || 0), // Força conversão para string
            sets: String(item.sets || 0),     // Força conversão para string
            reps: String(item.reps || 0),     // Força conversão para string
            isCompleted: !!item.isCompleted
          }));
        }
      } catch (e) {
        console.error(`Erro ao fazer parse do treino ${w.id}`, e);
        parsedExercises = [];
      }

      // Tratamento seguro para muscleGroup
      const rawWorkout = w as unknown as Record<string, unknown>;
      const muscleGroup = typeof rawWorkout.muscleGroup === 'string' 
        ? rawWorkout.muscleGroup 
        : "Geral";

      return {
        id: w.id,
        title: w.title,
        duration: w.duration,
        type: w.type,
        feeling: w.feeling,
        notes: w.notes,
        muscleGroup: muscleGroup, 
        date: w.date.toISOString(),
        exercises: parsedExercises
      };
    });
  } catch (error) {
    console.error("Erro ao carregar treinos:", error);
    hasError = true;
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-zinc-500">
        <AlertCircle className="h-10 w-10 mb-2" />
        <p>Erro ao carregar histórico de treinos.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black p-6 md:p-8">
      <PageHeader 
        title="Iron Temple" 
        description="Controle de carga e hipertrofia." 
        icon={Dumbbell}
        iconColor="text-orange-600"
      />
      <GymDashboard workouts={serializedWorkouts} />
    </div>
  );
}