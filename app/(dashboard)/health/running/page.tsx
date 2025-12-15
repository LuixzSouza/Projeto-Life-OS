import { prisma } from "@/lib/prisma";
import { RunningDashboard } from "@/components/health/running/running-dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { Footprints, AlertCircle } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Corrida | Health",
  description: "Monitoramento de pace e corridas.",
};

// ✅ Interface para corrida serializada
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
  // ✅ Inicialização tipada
  let serializedRuns: SerializedRun[] = [];
  let hasError = false;

  try {
    const runningWorkouts = await prisma.workout.findMany({
      where: { 
        type: { in: ["RUNNING", "RUN"] } 
      },
      orderBy: { date: "desc" },
      take: 50 
    });

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
    console.error("Erro ao carregar corridas:", error);
    hasError = true;
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-zinc-500">
        <AlertCircle className="h-10 w-10 mb-2" />
        <p>Erro ao carregar histórico de corridas.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black p-6 md:p-8">
      <PageHeader 
        title="Running Club" 
        description="Monitoramento de pace e quilometragem." 
        icon={Footprints}
        iconColor="text-blue-600"
      />
      <RunningDashboard runs={serializedRuns} />
    </div>
  );
}