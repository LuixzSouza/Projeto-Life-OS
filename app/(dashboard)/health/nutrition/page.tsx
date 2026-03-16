import { prisma } from "@/lib/prisma";
import { NutritionDashboard } from "@/components/health/nutrition/nutrition-dashboard";
import { Utensils, ChevronLeft, ShieldCheck, RefreshCcw } from "lucide-react";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HealthActions } from "@/components/health/health-actions";

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
    const [dayMeals, weekMeals, mealPlan] = await Promise.all([
      // 1. Refeições do dia selecionado (Histórico)
      prisma.meal.findMany({
        where: { date: { gte: startOfDay, lte: endOfDay } },
        orderBy: { date: "asc" },
      }),
      // 2. Dados da semana para o gráfico
      prisma.meal.findMany({
        where: { date: { gte: startOfWeek, lte: endOfDay } },
        select: { date: true, calories: true, type: true }, 
      }),
      // 3. Planejamento Semanal (Futuro)
      prisma.mealPlan.findMany({
        where: { userId: "user" }, // Ajustar para ID real se tiver auth
        orderBy: { dayOfWeek: "asc" }
      })
    ]);

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
        <div className="min-h-[80vh] w-full flex flex-col items-center justify-center p-8 bg-background">
            <div className="p-8 rounded-3xl bg-muted/30 border border-border/40 flex flex-col items-center gap-4 text-center max-w-md shadow-sm">
                <div className="h-16 w-16 bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-full mb-2">
                    <ShieldCheck className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Falha de Leitura</h2>
                <p className="text-muted-foreground text-sm">
                    Não foi possível sincronizar seu diário alimentar no momento.
                </p>
                <div className="flex gap-3 mt-4">
                    <Link href="/health">
                        <Button variant="ghost" className="rounded-xl">
                            Voltar
                        </Button>
                    </Link>
                    <Link href="/health/nutrition">
                        <Button variant="outline" className="gap-2 rounded-xl">
                            <RefreshCcw className="h-4 w-4" /> Recarregar
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
  }

  // --- RENDERIZAÇÃO PRINCIPAL ---
  return (
    <div className="min-h-screen bg-background w-full pb-12">
        <div className="w-full p-6 md:p-8 space-y-8">
            
            {/* --- HEADER FULL-WIDTH --- */}
            <header className="flex flex-col gap-4 pb-6 border-b border-border/40">
                
                {/* Botão de Voltar */}
                <div>
                    <Link href="/health">
                        <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground hover:text-foreground gap-1.5 h-8 px-3 rounded-lg">
                            <ChevronLeft className="h-4 w-4" />
                            Voltar para Overview
                        </Button>
                    </Link>
                </div>

                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
                    {/* Título e Ícone */}
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Utensils className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Nutrição & Planejamento</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Diário alimentar, controle de macros e planejamento semanal.
                            </p>
                        </div>
                    </div>

                    {/* Componente Dinâmico de Ações */}
                    <div className="w-full xl:w-auto">
                        <HealthActions />
                    </div>
                </div>
            </header>

            {/* --- DASHBOARD PRINCIPAL --- */}
            <main className="animate-in fade-in duration-500">
                <NutritionDashboard 
                    initialDate={selectedDate.toISOString()} 
                    meals={serializedDayMeals} 
                    weekData={serializedWeekMeals}
                    mealPlan={serializedMealPlan}
                />
            </main>
            
        </div>
    </div>
  );
}