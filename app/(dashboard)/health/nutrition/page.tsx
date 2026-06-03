import { prisma } from "@/lib/prisma";
import { NutritionDashboard } from "@/components/health/nutrition/nutrition-dashboard";
import { Utensils } from "lucide-react";
import { Metadata } from "next";
import { HealthActions } from "@/components/health/health-actions";
import { getCurrentUserId } from "@/lib/auth";
import { getHealthGoals } from "@/app/(dashboard)/health/actions";
import { suggestDailyGoal } from "@/lib/nutrition-calc";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { BackLink } from "@/components/ui/back-link";
import { ErrorState } from "@/components/ui/error-state";

// ⚠️ CORREÇÃO CRÍTICA: Força renderização dinâmica para evitar erro de build
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Nutrição & Planejamento | Life OS",
  description: "Diário alimentar, controle de macros e planejador semanal.",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// --- Interfaces Estritas (Zero Any) ---

// Interface para o Histórico (Já realizada)
interface SerializedMeal {
  id: string;
  date: string;
  title: string;
  calories: number; 
  type: string;
  items: string;    
}

interface SerializedWeekData {
  date: string;
  calories: number; 
  type: string;
}

// Interface para o Planejamento (Futuro)
interface SerializedMealPlan {
  id: string;
  dayOfWeek: number;
  mealType: string;
  title: string;
  items: string;
  calories: number | null;
}

export default async function NutritionPage(props: PageProps) {
  let serializedDayMeals: SerializedMeal[] = [];
  let serializedWeekMeals: SerializedWeekData[] = [];
  let serializedMealPlan: SerializedMealPlan[] = [];

  let suggestedGoal: number | null = null;
  let estimatedTdee: number | null = null;
  let calorieOverride: number | null = null;
  let userName: string | undefined;

  let selectedDate = new Date();
  let hasError = false;

  try {
    const params = await props.searchParams;
    const dateParam = typeof params.date === 'string' ? params.date : undefined;
    
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) selectedDate = parsed;
    }

    // Definição de Intervalos de Tempo
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    // Busca Paralela Otimizada (Agora inclui o MealPlan)
    const userId = await getCurrentUserId();
    const [dayMeals, weekMeals, mealPlan, latestBody, currentUser] = await Promise.all([
      // 1. Refeições do dia selecionado (Histórico)
      prisma.meal.findMany({
        where: { date: { gte: startOfDay, lte: endOfDay }, userId },
        orderBy: { date: "asc" },
      }),
      // 2. Dados da semana para o gráfico
      prisma.meal.findMany({
        where: { date: { gte: startOfWeek, lte: endOfDay }, userId },
        select: { date: true, calories: true, type: true },
      }),
      // 3. Planejamento Semanal (Futuro)
      prisma.mealPlan.findMany({
        where: { userId: userId ?? "" },
        orderBy: { dayOfWeek: "asc" }
      }),
      // 4. Última medição corporal (para meta calórica automática via TDEE)
      userId
        ? prisma.bodyMeasurement.findFirst({ where: { userId }, orderBy: { date: "desc" } })
        : Promise.resolve(null),
      // 5. Nome do usuário (para personalizar o PDF)
      userId
        ? prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
        : Promise.resolve(null),
    ]);

    // Meta calórica sugerida automaticamente a partir do perfil corporal.
    if (latestBody) {
      const suggestion = suggestDailyGoal({
        weight: latestBody.weight,
        height: latestBody.height,
        gender: latestBody.gender,
        activity: latestBody.activity,
        birthDate: latestBody.birthDate,
      }, "MAINTAIN");
      if (suggestion) {
        suggestedGoal = suggestion.goal;
        estimatedTdee = suggestion.tdee;
      }
    }
    userName = currentUser?.name ?? undefined;

    // Override manual da meta calórica (centralizado no perfil/banco).
    calorieOverride = (await getHealthGoals()).calorieGoalOverride;

    // Serialização Segura (Histórico)
    serializedDayMeals = dayMeals.map(m => ({
      id: m.id,
      date: m.date.toISOString(),
      title: m.title,
      type: m.type,
      calories: m.calories ?? 0,
      items: m.items ?? "",
    }));

    serializedWeekMeals = weekMeals.map(m => ({
      date: m.date.toISOString(),
      type: m.type,
      calories: m.calories ?? 0,
    }));

    // Serialização Segura (Planejamento)
    serializedMealPlan = mealPlan.map(p => ({
        id: p.id,
        dayOfWeek: p.dayOfWeek,
        mealType: p.mealType,
        title: p.title,
        items: p.items,
        calories: p.calories
    }));

  } catch (error) {
    console.error("Critical Error in NutritionPage:", error);
    hasError = true;
  }

  // --- ESTADO DE ERRO SÓBRIO ---
  if (hasError) {
    return (
      <ErrorState
        title="Falha de Leitura"
        description="Não foi possível sincronizar seu diário alimentar no momento."
        backHref="/health"
        retryHref="/health/nutrition"
      />
    );
  }

  // --- RENDERIZAÇÃO PRINCIPAL ---
  return (
    <PageShell>
      <PageHeader
        icon={<Utensils className="h-6 w-6" />}
        title="Nutrição & Planejamento"
        description="Diário alimentar, controle de macros e planejamento semanal."
        actions={<HealthActions />}
      >
        <BackLink href="/health" label="Voltar para Overview" />
      </PageHeader>

      <PageContainer>
        <NutritionDashboard
            initialDate={selectedDate.toISOString()}
            meals={serializedDayMeals}
            weekData={serializedWeekMeals}
            mealPlan={serializedMealPlan}
            suggestedGoal={suggestedGoal}
            tdee={estimatedTdee}
            calorieOverride={calorieOverride}
            userName={userName}
        />
      </PageContainer>
    </PageShell>
  );
}