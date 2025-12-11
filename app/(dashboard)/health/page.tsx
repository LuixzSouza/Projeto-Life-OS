import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Dumbbell, Footprints, Scale, Activity, LucideIcon, CalendarDays, Moon, User, ArrowRight, Utensils } from "lucide-react";
import Link from "next/link"; 

// --- IMPORTS DE COMPONENTES OTIMIZADOS ---
import { BodySummaryCard } from "@/components/health/body-summary-card"; 
import { HydrationCard } from "@/components/health/hydration-card";
import { CaloriesCard } from "@/components/health/calories-card";
import { SleepCard } from "@/components/health/sleep-card";
import { FoodLogger } from "@/components/health/food-logger"; 
import { RunForm } from "@/components/health/run-form";
import { GymForm } from "@/components/health/gym-form";
import { ActivityFeed } from "@/components/health/activity-feed";

// Componente visual para métricas simples (Peso, Total Treinos)
interface SimpleMetricProps { label: string; value: string | number; icon: LucideIcon; unit: string; }
function SimpleMetric({ label, value, icon: Icon, unit }: SimpleMetricProps) {
    return (
        <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-4 flex items-center gap-4 h-full hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400 group-hover:scale-110 transition-transform">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{label}</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {value} <span className="text-xs font-normal text-zinc-400">{unit}</span>
                </p>
            </div>
        </Card>
    )
}

export default async function HealthPage() {
  // 1. Buscas Paralelas de Dados
  // Adicionei um filtro de data para 'meals' para garantir que a home mostre apenas o dia de hoje ou recentes
  const today = new Date();
  today.setHours(0,0,0,0);

  const [workouts, lastWeight, lastHeight, waterMetrics, lastSleep, meals] = await Promise.all([
    prisma.workout.findMany({ orderBy: { date: 'desc' }, take: 50 }), 
    prisma.healthMetric.findFirst({ where: { type: "WEIGHT" }, orderBy: { date: 'desc' } }),
    prisma.healthMetric.findFirst({ where: { type: "HEIGHT" }, orderBy: { date: 'desc' } }),
    prisma.healthMetric.findMany({ 
        where: { type: "WATER", date: { gte: today } } 
    }),
    prisma.healthMetric.findFirst({ where: { type: "SLEEP" }, orderBy: { date: 'desc' } }),
    // Pegamos refeições recentes para o feed rápido
    prisma.meal.findMany({ 
        where: { date: { gte: today } }, // Apenas hoje para o FoodLogger da home
        orderBy: { date: 'desc' } 
    })
  ]);

  const weight = lastWeight?.value || 0;
  const height = lastHeight?.value || 0;
  const waterTotal = waterMetrics.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black p-6 md:p-8 space-y-8 pb-24">
      
      {/* --- HEADER --- */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Health Center</h1>
            <p className="text-zinc-500 mt-1 text-sm">Painel de controle corporal e desempenho.</p>
        </div>
        
        {/* Barra de Ações Rápidas */}
        <div className="flex flex-wrap gap-2">
            
            {/* Links para Dashboards Específicos */}
            <Link href="/health/nutrition">
                <Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-zinc-900 shadow-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:text-emerald-600 hover:border-emerald-200 transition-all h-9">
                    <CalendarDays className="h-4 w-4" /> Nutrição
                </Button>
            </Link>

            <Link href="/health/sleep">
                <Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-zinc-900 shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/10 hover:text-indigo-600 hover:border-indigo-200 transition-all h-9">
                    <Moon className="h-4 w-4" /> Sono
                </Button>
            </Link>

            <Link href="/health/body">
                <Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-zinc-900 shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:text-blue-600 hover:border-blue-200 transition-all h-9">
                    <User className="h-4 w-4" /> Corpo
                </Button>
            </Link>

            {/* Separador */}
            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 hidden md:block self-center"></div>

            {/* Ações de Registro (Modais) */}
            <Dialog>
                <DialogTrigger asChild>
                    <Button size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2 shadow-sm dark:bg-white dark:text-black dark:hover:bg-zinc-200 h-9">
                        <Dumbbell className="h-4 w-4" /> Treino
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Ficha de Treino</DialogTitle></DialogHeader>
                    <GymForm />
                </DialogContent>
            </Dialog>

            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-zinc-900 shadow-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-900 h-9">
                        <Footprints className="h-4 w-4" /> Corrida
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Corrida</DialogTitle></DialogHeader>
                    <RunForm />
                </DialogContent>
            </Dialog>
        </div>
      </header>

      {/* --- GRID 1: METABOLISMO & CORPO --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          
          {/* Card de Composição Corporal (Linka para /health/body) */}
          <div className="lg:col-span-2 h-full">
             <BodySummaryCard weight={weight} height={height} />
          </div>

          {/* Cards de Métricas Diárias */}
          <CaloriesCard weight={weight} height={height} />
          <HydrationCard total={waterTotal} />
      </div>

      {/* --- GRID 2: DIÁRIO (SONO & COMIDA) --- */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Coluna Esquerda: Métricas Rápidas */}
          <div className="md:col-span-4 flex flex-col gap-4">
              {/* Card de Sono Inteligente (Linka para /health/sleep) */}
              <SleepCard value={lastSleep?.value || "-"} />
              
              <div className="grid grid-cols-2 gap-4">
                  <SimpleMetric label="Último Peso" value={weight} unit="kg" icon={Scale} />
                  <SimpleMetric label="Total Treinos" value={workouts.length} unit="sessões" icon={Activity} />
              </div>
          </div>

          {/* Coluna Direita: Diário Alimentar (Ocupa mais espaço) */}
          <div className="md:col-span-8 h-full min-h-[400px] flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                  <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <Utensils className="h-4 w-4" /> Alimentação de Hoje
                  </h3>
                  <Link href="/health/nutrition" className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium transition-colors">
                      Ver histórico completo <ArrowRight className="h-3 w-3" />
                  </Link>
              </div>
              
              {/* Este componente agora tem botão para o modal de registro */}
              <FoodLogger meals={meals} />
          </div>
      </div>

      {/* --- GRID 3: HISTÓRICO DE TREINOS --- */}
      <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-zinc-500" /> Atividades Recentes
              </h3>
              <div className="flex gap-2">
                  <Link href="/health/gym">
                      <Button variant="ghost" size="sm" className="text-xs text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                          Ver Treinos de Força
                      </Button>
                  </Link>
                  <Link href="/health/running">
                      <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                          Ver Corridas
                      </Button>
                  </Link>
              </div>
          </div>
          <ActivityFeed initialWorkouts={workouts} />
      </div>

    </div>
  );
}