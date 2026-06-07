import type { Metadata } from "next";
import { getRecentExercisePerformance } from "@/app/(dashboard)/health/actions";
import { LiveSession } from "@/components/health/gym/session/live-session";

export const metadata: Metadata = {
  title: "Treino ao vivo | Life OS",
  description: "Sessão de treino de força em tempo real.",
};

export const dynamic = "force-dynamic";

export default async function GymSessionPage() {
  // Desempenho anterior por exercício (sobrecarga progressiva). Tolera falha.
  let lastPerf = await getRecentExercisePerformance().catch(() => []);
  if (!Array.isArray(lastPerf)) lastPerf = [];

  return <LiveSession lastPerf={lastPerf} />;
}
