import { prisma } from "@/lib/prisma";
import { SleepDashboard } from "@/components/health/sleep/sleep-dashboard";
import { Moon } from "lucide-react";
import { Metadata } from "next";
import { HealthActions } from "@/components/health/health-actions";
import { getCurrentUserId } from "@/lib/auth";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { BackLink } from "@/components/ui/back-link";
import { ErrorState } from "@/components/ui/error-state";

export const metadata: Metadata = {
  title: "Sono | Life OS",
  description: "Monitoramento da qualidade do sono e recuperação.",
};

export const dynamic = 'force-dynamic';

// --- Tipagem Estrita (Zero Any) ---
interface SerializedSleepData {
  id: string;
  date: string;
  value: number;
}

export default async function SleepPage() {
  let serializedData: SerializedSleepData[] = [];
  let hasError = false;

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const userId = await getCurrentUserId();
    const sleepData = await prisma.healthMetric.findMany({
      where: {
        type: "SLEEP",
        date: { gte: startDate, lte: endDate },
        userId,
      },
      orderBy: { date: "asc" },
    });

    // Serialização
    serializedData = sleepData.map(item => ({
      id: item.id,
      date: item.date.toISOString(),
      value: item.value,
    }));

  } catch (error) {
    console.error("Critical Error in SleepPage:", error);
    hasError = true;
  }

  // --- ESTADO DE ERRO SÓBRIO ---
  if (hasError) {
    return (
      <ErrorState
        title="Falha de Leitura"
        description="Não foi possível sincronizar seus dados de sono no momento."
        backHref="/health"
        retryHref="/health/sleep"
      />
    );
  }

  // --- RENDERIZAÇÃO PRINCIPAL ---
  return (
    <PageShell>
      <PageHeader
        icon={<Moon className="h-6 w-6" />}
        title="Monitor de Sono"
        description="Análise de qualidade do descanso, recuperação e consistência."
        actions={<HealthActions />}
      >
        <BackLink href="/health" label="Voltar para Overview" />
      </PageHeader>

      <PageContainer>
        <SleepDashboard data={serializedData} />
      </PageContainer>
    </PageShell>
  );
}