// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUserId } from "@/lib/auth";
import { getUserSettings } from "@/lib/services/dashboard.service";
import { getGreeting } from "@/lib/utils/dashboard.utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { WelcomeTour } from "@/components/dashboard/welcome-tour";
import { QuickActionsBar } from "@/components/dashboard/quick-actions-bar";
import { AiBriefingCard } from "@/components/dashboard/ai-briefing-card";
import { EnergyCheckinCard } from "@/components/health/energy-checkin-card";
import { HabitsCard } from "@/components/health/habits-card";
import { QuickCaptureCard } from "@/components/dashboard/quick-capture-card";
import { DailyInsightCard } from "@/components/dashboard/daily-insight-card";
import { DailyRegulatorCard } from "@/components/dashboard/daily-regulator-card";
import { FrictionVectorCard } from "@/components/health/friction-vector-card";
import { WeeklyResetCard } from "@/components/dashboard/weekly-reset-card";
import { BlindSpotRadar } from "@/components/dashboard/blind-spot-radar";
import { InertiaCostCard } from "@/components/dashboard/inertia-cost-card";
import { DigitalRotCard } from "@/components/dashboard/digital-rot-card";
import { LiquefyCard } from "@/components/dashboard/liquefy-card";
import { PreservationGate } from "@/components/dashboard/preservation-gate";
import { prisma } from "@/lib/prisma";

// Componentes Server-side separados (seções)
import { FinanceSection } from "./_components/finance-section";
import { ProductivitySection } from "./_components/productivity-section";
import { PersonalSection } from "./_components/personal-section";
import { HealthOverviewSection } from "./_components/health-overview-section";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  
  // Validação rígida e antecipada
  if (!userId) redirect("/login");

  // Carrega apenas o essencial para a primeira pintura (Header/Configurações)
  const { user, settings } = await getUserSettings(userId);
  const greeting = getGreeting();

  // Modo de Preservação (#19): energia 1–2 hoje → esconde os painéis pesados.
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const todayEnergy = await prisma.energyCheckin.findFirst({
    where: { userId, date: { gte: dayStart } },
    select: { energy: true },
  });
  const lowEnergy = todayEnergy != null && todayEnergy.energy <= 2;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-8 sm:py-8 animate-in fade-in duration-500">
      
      {!settings?.onboardingCompleted && <WelcomeTour />}

      {/* Header e Quick Actions - Carregamento imediato */}
      <DashboardHeader
        greeting={greeting}
        userName={user?.name?.split(" ")[0] || "Usuário"}
      />
      
      <QuickActionsBar />

      {/* Briefing diário proativo: a IA fala primeiro (agenda, prioridades,
          saldo, hábitos). Fora do Modo de Preservação — orienta qualquer dia. */}
      <AiBriefingCard />

      {/* Fase 0 — captura diária: energia + hábitos + caixa de entrada (base dos insights) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EnergyCheckinCard />
        <HabitsCard />
      </div>
      <QuickCaptureCard />

      {/* Regulador Adaptativo (#13): o que fazer hoje conforme o estado/energia.
          Fica FORA do Modo de Preservação — é ele que orienta o dia exausto. */}
      <Suspense fallback={null}>
        <DailyRegulatorCard />
      </Suspense>

      {/* Modo de Preservação (#19): energia 1–2 → painéis pesados escondidos. */}
      <PreservationGate lowEnergy={lowEnergy}>
        {/* Insight do dia: o padrão mais forte (foco/energia) do Motor de Correlação (#8). */}
        <Suspense fallback={<Skeleton className="h-[76px] w-full rounded-2xl" />}>
          <DailyInsightCard />
        </Suspense>

        {/* Vetor de Fricção (#15): por que os hábitos falham (some se não há dados). */}
        <Suspense fallback={null}>
          <FrictionVectorCard />
        </Suspense>

        {/* Custo Fantasma da Inércia (#20): o preço de não agir (treino/dinheiro parado). */}
        <Suspense fallback={null}>
          <InertiaCostCard />
        </Suspense>

        {/* Radar de Pontos Cegos (#23): áreas da vida sem registro nos últimos 14 dias. */}
        <Suspense fallback={null}>
          <BlindSpotRadar />
        </Suspense>

        {/* Digital Rot (#21): tarefas/notas apodrecendo + Limpeza Fantasma. */}
        <DigitalRotCard />

        {/* Liquefação (#18): tarefas com blocos vencidos 2× viram micro-passos. */}
        <LiquefyCard />

        {/* Reset Semanal: resumo dos últimos 7 dias + direção da próxima. */}
        <Suspense fallback={null}>
          <WeeklyResetCard />
        </Suspense>

        {/* Overview do Dia: unifica Treino + Nutrição numa olhada (topo da Home) */}
        <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-xl" />}>
          <HealthOverviewSection userId={userId} />
        </Suspense>

        {/* Tabs para melhor UX e navegação modular */}
        <Tabs defaultValue="finance" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/50">
            <TabsTrigger value="finance" className="text-xs sm:text-sm">Financeiro</TabsTrigger>
            <TabsTrigger value="productivity" className="text-xs sm:text-sm">Produtividade</TabsTrigger>
            <TabsTrigger value="personal" className="text-xs sm:text-sm">Pessoal</TabsTrigger>
          </TabsList>

          <TabsContent value="finance" className="space-y-6">
            <Suspense fallback={<DashboardSkeleton />}>
              <FinanceSection userId={userId} currency={settings?.currency || "BRL"} />
            </Suspense>
          </TabsContent>

          <TabsContent value="productivity" className="space-y-6">
            <Suspense fallback={<DashboardSkeleton />}>
              <ProductivitySection userId={userId} />
            </Suspense>
          </TabsContent>

          <TabsContent value="personal" className="space-y-6">
            <Suspense fallback={<DashboardSkeleton />}>
              <PersonalSection userId={userId} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </PreservationGate>

    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="xl:col-span-8 space-y-6">
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <Skeleton className="h-[250px] w-full rounded-xl" />
      </div>
      <div className="xl:col-span-4 space-y-6">
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    </div>
  );
}