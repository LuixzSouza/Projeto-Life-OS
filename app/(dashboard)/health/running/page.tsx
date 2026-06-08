import { prisma } from "@/lib/prisma";
import { RunningDashboard } from "@/components/health/running/running-dashboard";
import { Footprints } from "lucide-react";
import { Metadata } from "next";
import { HealthActions } from "@/components/health/health-actions";
import { getCurrentUserId } from "@/lib/auth";
import { listShoesWithMileage, type ShoeWithMileage } from "@/app/(dashboard)/health/actions";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { BackLink } from "@/components/ui/back-link";
import { ErrorState } from "@/components/ui/error-state";

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
  terrain: string | null;
  shoeName: string | null;
}

export default async function RunningPage() {
  let serializedRuns: SerializedRun[] = [];
  let bodyWeight: number | null = null;
  let shoes: ShoeWithMileage[] = [];
  let hasError = false;

  try {
    // Busca otimizada
    const userId = await getCurrentUserId();
    const [runningWorkouts, latestBody] = await Promise.all([
      prisma.workout.findMany({
        where: { type: { in: ["RUNNING", "RUN"] }, userId },
        orderBy: { date: "desc" },
        take: 50,
      }),
      userId
        ? prisma.bodyMeasurement.findFirst({ where: { userId }, orderBy: { date: "desc" }, select: { weight: true } })
        : Promise.resolve(null),
    ]);

    bodyWeight = latestBody?.weight ?? null;
    shoes = await listShoesWithMileage();

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
        terrain: w.terrain,
        shoeName: w.shoeName,
    }));

  } catch (error) {
    console.error("Critical Error in RunningPage:", error);
    hasError = true;
  }

  // --- ESTADO DE ERRO SÓBRIO ---
  if (hasError) {
    return (
      <ErrorState
        title="Falha de Leitura"
        description="Não foi possível sincronizar seu histórico de corridas no momento."
        backHref="/health"
        retryHref="/health/running"
      />
    );
  }

  // --- RENDERIZAÇÃO PRINCIPAL ---
  return (
    <PageShell>
      <PageHeader
        icon={<Footprints className="h-6 w-6" />}
        title="Corrida & Cardio"
        description="Acompanhe seu pace, volume de treinamento e evolução."
        actions={<HealthActions />}
      >
        <BackLink href="/health" label="Voltar para Overview" />
      </PageHeader>

      <PageContainer>
        <RunningDashboard runs={serializedRuns} bodyWeight={bodyWeight} shoes={shoes} />
      </PageContainer>
    </PageShell>
  );
}