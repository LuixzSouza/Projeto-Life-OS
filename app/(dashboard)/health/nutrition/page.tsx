import { prisma } from "@/lib/prisma";
import { NutritionDashboard } from "@/components/health/nutrition-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

// ✅ CORREÇÃO 1: Tipagem para Next.js 15 (searchParams é Promise)
interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NutritionPage(props: PageProps) {
  // ✅ CORREÇÃO 1: Aguardar os parâmetros
  const params = await props.searchParams;
  
  // 1. Extração segura da data
  const dateParam = typeof params.date === 'string' ? params.date : undefined;
  
  // Se a data for inválida, usa hoje.
  let selectedDate = new Date();
  if (dateParam) {
    const parsed = new Date(dateParam);
    if (!isNaN(parsed.getTime())) {
      selectedDate = parsed;
    }
  }

  // 2. Definir intervalo do dia (00:00 a 23:59)
  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);

  // 3. Buscar refeições do dia
  const dayMeals = await prisma.meal.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { date: "asc" },
  });

  // 4. Buscar resumo da semana
  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(selectedDate.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const weekMeals = await prisma.meal.findMany({
    where: {
      date: {
        gte: startOfWeek,
        lte: endOfDay,
      },
    },
    select: {
      date: true,
      calories: true,
      type: true,
    },
  });

  // ✅ CORREÇÃO 2: Serialização Limpa
  // Removemos 'createdAt' e 'updatedAt' pois o modelo Meal usa apenas 'date'
  const serializedDayMeals = dayMeals.map(m => ({
      ...m,
      date: m.date.toISOString(),
      // Removido createdAt para corrigir o erro de tipo
  }));

  const serializedWeekMeals = weekMeals.map(m => ({
      ...m,
      date: m.date.toISOString()
  }));

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link href="/health">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <CalendarDays className="h-6 w-6 text-green-600" /> Histórico Nutricional
                </h1>
                <p className="text-zinc-500 text-sm">Analise sua alimentação diária.</p>
            </div>
        </div>
      </div>

      {/* Componente Cliente */}
      <NutritionDashboard 
        initialDate={selectedDate.toISOString()} 
        meals={serializedDayMeals} 
        weekData={serializedWeekMeals}
      />
    </div>
  );
}