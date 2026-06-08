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
import { EnergyCheckinCard } from "@/components/health/energy-checkin-card";
import { HabitsCard } from "@/components/health/habits-card";

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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-8 sm:py-8 animate-in fade-in duration-500">
      
      {!settings?.onboardingCompleted && <WelcomeTour />}

      {/* Header e Quick Actions - Carregamento imediato */}
      <DashboardHeader
        greeting={greeting}
        userName={user?.name?.split(" ")[0] || "Usuário"}
      />
      
      <QuickActionsBar />

      {/* Fase 0 — captura diária: energia + hábitos (base dos insights futuros) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EnergyCheckinCard />
        <HabitsCard />
      </div>

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