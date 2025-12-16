import { prisma } from "@/lib/prisma";
import { NutritionDashboard } from "@/components/health/nutrition/nutrition-dashboard";
import { CalendarDays, AlertCircle, Utensils, ChevronLeft } from "lucide-react";
import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Nutrição | Health",
  description: "Diário alimentar, controle de macros e histórico calórico.",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// --- Interfaces Estritas (Zero Any) ---

interface SerializedMeal {
  id: string;
  date: string;
  title: string;
  calories: number; 
  type: string;
  items: string;    
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

interface SerializedWeekData {
  date: string;
  calories: number; 
  type: string;
}

export default async function NutritionPage(props: PageProps) {
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

    // Definição de Intervalos de Tempo
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    // Busca Paralela Otimizada
    const [dayMeals, weekMeals] = await Promise.all([
      prisma.meal.findMany({
        where: { date: { gte: startOfDay, lte: endOfDay } },
        orderBy: { date: "asc" },
      }),
      prisma.meal.findMany({
        where: { date: { gte: startOfWeek, lte: endOfDay } },
        select: { date: true, calories: true, type: true }, 
      })
    ]);

    // Serialização Segura (Fallback para nulos)
    serializedDayMeals = dayMeals.map(m => ({
      ...m,
      date: m.date.toISOString(),
      calories: m.calories ?? 0,
      items: m.items ?? "",
    }));

    serializedWeekMeals = weekMeals.map(m => ({
      date: m.date.toISOString(),
      type: m.type,
      calories: m.calories ?? 0,
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
                <Button variant="outline" className="flex-1 border-destructive/20 hover:bg-destructive/10 text-destructive">
                    Recarregar
                </Button>
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
                    Histórico Nutricional
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                    Gerencie sua ingestão calórica, macros e analise tendências da semana.
                    </p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-background/50 backdrop-blur-sm border border-border/50 rounded-full shadow-sm animate-in fade-in slide-in-from-right-4 duration-700">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">
                    Modo: <span className="text-foreground font-semibold">Diário Alimentar</span>
                    </span>
                </div>
            </div>
        </div>
      </header>

      <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Dashboard Component */}
        <NutritionDashboard 
          initialDate={selectedDate.toISOString()} 
          meals={serializedDayMeals} 
          weekData={serializedWeekMeals}
        />

      </main>
    </div>
  );
}