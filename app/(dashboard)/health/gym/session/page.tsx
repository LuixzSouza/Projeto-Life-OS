import type { Metadata } from "next";
import { getRecentExercisePerformance, getExerciseVolumeHistory, listWorkoutPlans } from "@/app/(dashboard)/health/actions";
import { LiveSession } from "@/components/health/gym/session/live-session";
import type { ExerciseHistoryPoint, LastPerf } from "@/components/health/gym/session/session-types";
import type { WorkoutPlan } from "@/components/health/gym/session/plan-types";

export const metadata: Metadata = {
  title: "Treino ao vivo | Life OS",
  description: "Sessão de treino de força em tempo real.",
};

export const dynamic = "force-dynamic";

export default async function GymSessionPage() {
  // Desempenho anterior + histórico de volume por exercício (sobrecarga progressiva
  // e mini-gráfico do descanso) + fichas salvas (p/ "Treino planejado" do aparelho
  // mostrar as fichas do banco, não só rotinas do localStorage). Tolera falha individual.
  const [lastPerf, volumeHistory, plans] = await Promise.all([
    getRecentExercisePerformance().catch((): LastPerf[] => []),
    getExerciseVolumeHistory().catch((): Record<string, ExerciseHistoryPoint[]> => ({})),
    listWorkoutPlans().catch((): WorkoutPlan[] => []),
  ]);

  return <LiveSession lastPerf={Array.isArray(lastPerf) ? lastPerf : []} volumeHistory={volumeHistory} plans={plans} />;
}
