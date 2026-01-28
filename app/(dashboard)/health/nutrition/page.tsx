import { prisma } from "@/lib/prisma";
import { NutritionDashboard } from "@/components/health/nutrition/nutrition-dashboard";
import { CalendarDays, AlertCircle, Utensils, ChevronLeft, CalendarRange } from "lucide-react";
import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// ⚠️ CORREÇÃO CRÍTICA: Força renderização dinâmica para evitar erro de build
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Nutrição & Planejamento | Health",
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
  let serializedMealPlan: SerializedMealPlan[] = []; // <--- NOVO
  
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

  // --- Render Error State ---
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5 shadow-lg">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-destructive/10 rounded-full">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Erro ao Carregar Dados</h2>
              <p className="text-sm text-muted-foreground">
                Não foi possível sincronizar seu diário alimentar.
              </p>
            </div>
            <div className="flex gap-2 w-full pt-2">
                <Link href="/health" className="flex-1">
                    <Button variant="ghost" className="w-full">Voltar</Button>
                </Link>
                <Link href="/health/nutrition" className="flex-1">
                    <Button variant="outline" className="w-full border-destructive/20 hover:bg-destructive/10 text-destructive">
                        Recarregar
                    </Button>
                </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Render Success State ---
  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* HEADER VISUAL */}
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-8 pb-8 px-6 md:px-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
            
            {/* Navegação / Breadcrumb */}
            <div>
                <Link href="/health" className="w-fit block">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="pl-2 pr-4 h-8 gap-1 text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all group rounded-full"
                    >
                        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-medium uppercase tracking-wide">Voltar para Health Center</span>
                    </Button>
                </Link>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                    <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20 text-primary-foreground">
                        <Utensils className="h-6 w-6" />
                    </div>
                    Nutrição Integrada
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                        Gerencie seu histórico e planeje sua semana com inteligência.
                    </p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-background/50 backdrop-blur-sm border border-border/50 rounded-full shadow-sm animate-in fade-in slide-in-from-right-4 duration-700">
                    <CalendarRange className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">
                        Foco: <span className="text-foreground font-semibold">Consistência</span>
                    </span>
                </div>
            </div>
        </div>
      </header>

      <main className="px-4 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Dashboard Component */}
        <NutritionDashboard 
          initialDate={selectedDate.toISOString()} 
          meals={serializedDayMeals} 
          weekData={serializedWeekMeals}
          mealPlan={serializedMealPlan} // <--- Passando o plano
        />

      </main>
    </div>
  );
}