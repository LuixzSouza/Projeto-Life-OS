import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dumbbell } from "lucide-react";
import Link from "next/link";
import { GymDashboard } from "@/components/health/gym-dashboard";

export default async function GymPage() {
  // Buscar histórico de treinos de força
  const gymWorkouts = await prisma.workout.findMany({
    where: { type: "GYM" },
    orderBy: { date: "desc" },
    take: 50 
  });

  // Serializar dados (Removidos createdAt e updatedAt que causavam erro)
  const serializedWorkouts = gymWorkouts.map(w => ({
      ...w,
      date: w.date.toISOString(),
      // O parse do JSON continua necessário pois vem como string do banco
      exercises: w.exercises ? JSON.parse(w.exercises) : []
  }));

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link href="/health">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Dumbbell className="h-6 w-6 text-orange-600" /> Iron Temple
                </h1>
                <p className="text-zinc-500 text-sm">Controle de carga e hipertrofia.</p>
            </div>
        </div>
      </div>

      {/* Dashboard Interativo */}
      <GymDashboard workouts={serializedWorkouts} />
    </div>
  );
}