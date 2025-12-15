import { prisma } from "@/lib/prisma";
import { NutritionDashboard } from "@/components/health/nutrition/nutrition-dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarDays, AlertCircle } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nutrição | Health",
  description: "Diário alimentar e macros.",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// ✅ Interface Específica para Refeições Completas (Dia)
interface SerializedMeal {
  id: string;
  date: string;
  title: string;
  calories: number; // ✅ Não pode ser null
  type: string;
  items: string;    // ✅ Adicionado (obrigatório no Dashboard)
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

// ✅ Interface Específica para Gráficos (Semana)
interface SerializedWeekData {
  date: string;
  calories: number; // ✅ Não pode ser null
  type: string;
}

export default async function NutritionPage(props: PageProps) {
  // ✅ Tipagem Correta na inicialização
  let serializedDayMeals: SerializedMeal[] = [];
  let serializedWeekMeals: SerializedWeekData[] = [];
  let selectedDate = new Date();
  let hasError = false;

  try {
    const params = await props.searchParams;
    const dateParam = typeof params.date === 'string' ? params.date : undefined;
    
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) selectedDate = parsed;
    }

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const [dayMeals, weekMeals] = await Promise.all([
      prisma.meal.findMany({
        where: { date: { gte: startOfDay, lte: endOfDay } },
        orderBy: { date: "asc" },
      }),
      prisma.meal.findMany({
        where: { date: { gte: startOfWeek, lte: endOfDay } },
        select: { date: true, calories: true, type: true }, // Select otimizado
      })
    ]);

    // ✅ Mapeamento seguro tratando nulos
    serializedDayMeals = dayMeals.map(m => ({
      ...m,
      date: m.date.toISOString(),
      calories: m.calories ?? 0, // Fallback se for null
      items: m.items ?? "",      // Fallback se for null
    }));

    // ✅ Mapeamento seguro para semana
    serializedWeekMeals = weekMeals.map(m => ({
      date: m.date.toISOString(),
      type: m.type,
      calories: m.calories ?? 0, // Fallback se for null
    }));

  } catch (error) {
    console.error("Erro ao carregar nutrição:", error);
    hasError = true;
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-zinc-500">
        <AlertCircle className="h-10 w-10 mb-2" />
        <p>Erro ao carregar dados nutricionais.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black p-6 md:p-8">
      <PageHeader 
        title="Histórico Nutricional" 
        description="Analise sua alimentação diária." 
        icon={CalendarDays}
        iconColor="text-green-600"
      />
      <NutritionDashboard 
        initialDate={selectedDate.toISOString()} 
        meals={serializedDayMeals} 
        weekData={serializedWeekMeals}
      />
    </div>
  );
}