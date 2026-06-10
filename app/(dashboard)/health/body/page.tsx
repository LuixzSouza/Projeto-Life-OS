import { prisma } from "@/lib/prisma";
import { BodyDashboard } from "@/components/health/body/body-dashboard";
import { User } from "lucide-react";
import { Metadata } from "next";
import { BodyStats, calculateBodyFat } from "@/lib/body-math";
import type { BodyEvolutionPoint } from "@/components/health/body/body-evolution-chart";
import { HealthActions } from "@/components/health/health-actions";
import { AskAiButton } from "@/components/ai/ask-ai-button";
import { getCurrentUserId } from "@/lib/auth";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/ui/error-state";

export const metadata: Metadata = {
  title: "Composição Corporal | Life OS",
  description: "Acompanhamento de medidas, simetria e bioimpedância.",
};

export const dynamic = 'force-dynamic';

// Dia (YYYY-MM-DD) para mesclar séries de fontes diferentes no mesmo ponto do eixo X.
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function BodyPage() {
  let currentStats: BodyStats | null = null;
  let evolution: BodyEvolutionPoint[] = [];
  let hasError = false;

  try {
    const userId = await getCurrentUserId();
    // Snapshot atual + histórico (peso via HealthMetric, leve; % gordura via snapshots).
    const [latestMeasurement, weightHistory, measurements] = await Promise.all([
      prisma.bodyMeasurement.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
      prisma.healthMetric.findMany({
        where: { userId, type: "WEIGHT" },
        orderBy: { date: "asc" },
        select: { date: true, value: true },
      }),
      prisma.bodyMeasurement.findMany({
        where: { userId },
        orderBy: { date: "asc" },
        select: { date: true, weight: true, height: true, gender: true, neck: true, waist: true, hip: true },
      }),
    ]);

    // Mescla por dia: peso (HealthMetric) + % gordura (Navy a partir dos snapshots).
    const byDay = new Map<string, BodyEvolutionPoint>();
    for (const w of weightHistory) {
      byDay.set(dayKey(w.date), { date: w.date.toISOString(), weight: w.value, bodyFat: null });
    }
    for (const m of measurements) {
      const key = dayKey(m.date);
      const point = byDay.get(key) ?? { date: m.date.toISOString(), weight: null, bodyFat: null };
      if (point.weight == null) point.weight = m.weight; // dia sem HealthMetric → usa o do snapshot
      const bf = calculateBodyFat({
        weight: m.weight,
        height: m.height,
        gender: (m.gender as "MALE" | "FEMALE") || "MALE",
        activityFactor: 1.2,
        waist: m.waist ?? 0,
        neck: m.neck ?? 0,
        hip: m.hip ?? 0,
      });
      if (bf > 0) point.bodyFat = Math.round(bf * 10) / 10;
      byDay.set(key, point);
    }
    evolution = Array.from(byDay.values()).sort((a, b) => +new Date(a.date) - +new Date(b.date));

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
        backHref="/health"
        backLabel="Voltar para Overview"
        actions={
          <>
            <AskAiButton q="Como está a evolução do meu peso e medidas corporais? Analise a tendência recente." label="Analisar com IA" />
            <HealthActions />
          </>
        }
      />

      <PageContainer>
        <BodyDashboard stats={currentStats!} evolution={evolution} />
      </PageContainer>
    </PageShell>
  );
}