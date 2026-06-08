import type { Metadata } from "next";
import { getRecentExercisePerformance, getExerciseVolumeHistory } from "@/app/(dashboard)/health/actions";
import { LiveSession } from "@/components/health/gym/session/live-session";
import type { ExerciseHistoryPoint, LastPerf } from "@/components/health/gym/session/session-types";

export const metadata: Metadata = {
  title: "Treino ao vivo | Life OS",
  description: "Sessão de treino de força em tempo real.",
};

export const dynamic = "force-dynamic";

export default async function GymSessionPage() {
  // Desempenho anterior + histórico de volume por exercício (sobrecarga progressiva
  // e mini-gráfico do descanso). Tolera falha individual.
  const [lastPerf, volumeHistory] = await Promise.all([
    getRecentExercisePerformance().catch((): LastPerf[] => []),
    getExerciseVolumeHistory().catch((): Record<string, ExerciseHistoryPoint[]> => ({})),
  ]);

  return <LiveSession lastPerf={Array.isArray(lastPerf) ? lastPerf : []} volumeHistory={volumeHistory} />;
}
