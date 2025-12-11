import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Footprints } from "lucide-react";
import Link from "next/link";
import { RunningDashboard } from "@/components/health/running-dashboard";

export default async function RunningPage() {
  // Buscar histórico de corridas
  const runningWorkouts = await prisma.workout.findMany({
    where: { 
        // Filtra por RUNNING ou RUN (garantia de legado)
        type: { in: ["RUNNING", "RUN"] } 
    },
    orderBy: { date: "desc" },
    take: 50 
  });

  // Serializar dados (Datas para String)
  const serializedRuns = runningWorkouts.map(w => ({
      ...w,
      date: w.date.toISOString(),
      // Corridas geralmente não têm exercises JSON complexo, mas tratamos igual
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
                    <Footprints className="h-6 w-6 text-blue-600" /> Running Club
                </h1>
                <p className="text-zinc-500 text-sm">Monitoramento de pace e quilometragem.</p>
            </div>
        </div>
      </div>

      {/* Dashboard Interativo */}
      <RunningDashboard runs={serializedRuns} />
    </div>
  );
}