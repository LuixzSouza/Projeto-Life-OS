import { prisma } from "@/lib/prisma";
import { BodyDashboard } from "@/components/health/body/body-dashboard";
import { User } from "lucide-react";
import { Metadata } from "next";
import { BodyStats } from "@/lib/body-math";
import { HealthActions } from "@/components/health/health-actions";
import { getCurrentUserId } from "@/lib/auth";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { BackLink } from "@/components/ui/back-link";
import { ErrorState } from "@/components/ui/error-state";

export const metadata: Metadata = {
  title: "Composição Corporal | Life OS",
  description: "Acompanhamento de medidas, simetria e bioimpedância.",
};

export const dynamic = 'force-dynamic';

export default async function BodyPage() {
  let currentStats: BodyStats | null = null;
  let hasError = false;

  try {
    const userId = await getCurrentUserId();
    const latestMeasurement = await prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    if (latestMeasurement) {
      currentStats = {
        weight: latestMeasurement.weight,
        height: latestMeasurement.height,
        gender: (latestMeasurement.gender as 'MALE' | 'FEMALE') || 'MALE',
        activityFactor: latestMeasurement.activity || 1.2,
        
        // Conversão segura de data
        birthDate: latestMeasurement.birthDate 
            ? latestMeasurement.birthDate.toISOString().split('T')[0] 
            : undefined,
        
        // Medidas Essenciais
        neck: latestMeasurement.neck || 0,
        waist: latestMeasurement.waist || 0,
        hip: latestMeasurement.hip || 0,

        // Medidas Detalhadas
        shoulders: latestMeasurement.shoulders || 0,
        chest: latestMeasurement.chest || 0,
        armLeft: latestMeasurement.armLeft || 0,
        armRight: latestMeasurement.armRight || 0,
        forearmLeft: latestMeasurement.forearmLeft || 0,
        forearmRight: latestMeasurement.forearmRight || 0,
        thighLeft: latestMeasurement.thighLeft || 0,
        thighRight: latestMeasurement.thighRight || 0,
        calfLeft: latestMeasurement.calfLeft || 0,
        calfRight: latestMeasurement.calfRight || 0,
      };
    } else {
      // Estado inicial limpo
      currentStats = {
        weight: 0, height: 0, waist: 0, neck: 0, hip: 0,
        gender: 'MALE', activityFactor: 1.2
      };
    }

  } catch (error) {
    console.error("Erro ao carregar dados corporais:", error);
    hasError = true;
  }

  // --- ESTADO DE ERRO SÓBRIO ---
  if (hasError) {
    return (
      <ErrorState
        title="Falha de Leitura"
        description="Não foi possível recuperar suas métricas corporais no momento."
        backHref="/health"
        retryHref="/health/body"
      />
    );
  }

  return (
    <PageShell>
      <PageHeader
        icon={<User className="h-6 w-6" />}
        title="Composição Corporal"
        description="Acompanhamento de medidas, proporções e simetria."
        actions={<HealthActions />}
      >
        <BackLink href="/health" label="Voltar para Overview" />
      </PageHeader>

      <PageContainer>
        <BodyDashboard stats={currentStats!} />
      </PageContainer>
    </PageShell>
  );
}