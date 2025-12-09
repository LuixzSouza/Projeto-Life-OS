import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Dumbbell, Footprints, Scale, Activity, LucideIcon } from "lucide-react";

// Componentes Modulares
import { BMICard } from "@/components/health/bmi-card";
import { HydrationCard } from "@/components/health/hydration-card";
import { CaloriesCard } from "@/components/health/calories-card";
import { SleepCard } from "@/components/health/sleep-card";
import { FoodLogger } from "@/components/health/food-logger"; // <--- Novo
import { RunForm } from "@/components/health/run-form";
import { GymForm } from "@/components/health/gym-form";
import { ActivityFeed } from "@/components/health/activity-feed";

// Componente visual para métricas simples (Peso e Total Treinos)
interface SimpleMetricProps { label: string; value: string | number; icon: LucideIcon; unit: string; }
function SimpleMetric({ label, value, icon: Icon, unit }: SimpleMetricProps) {
    return (
        <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-4 flex items-center gap-4 h-full">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">{label}</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {value} <span className="text-xs font-normal text-zinc-400">{unit}</span>
                </p>
            </div>
        </Card>
    )
}

export default async function HealthPage() {
  // 1. Buscas Paralelas (Alta Performance)
  const [workouts, lastWeight, lastHeight, waterMetrics, lastSleep, meals] = await Promise.all([
    prisma.workout.findMany({ orderBy: { date: 'desc' }, take: 50 }), 
    prisma.healthMetric.findFirst({ where: { type: "WEIGHT" }, orderBy: { date: 'desc' } }),
    prisma.healthMetric.findFirst({ where: { type: "HEIGHT" }, orderBy: { date: 'desc' } }),
    prisma.healthMetric.findMany({ 
        where: { type: "WATER", date: { gte: new Date(new Date().setHours(0,0,0,0)) } } 
    }),
    prisma.healthMetric.findFirst({ where: { type: "SLEEP" }, orderBy: { date: 'desc' } }),
    prisma.meal.findMany({ orderBy: { date: 'desc' }, take: 20 }) // <--- Nutrição
  ]);

  const weight = lastWeight?.value || 0;
  const height = lastHeight?.value || 0;
  const waterTotal = waterMetrics.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 p-6 md:p-10 space-y-8">
      
      {/* --- HEADER --- */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Health Center</h1>
            <p className="text-zinc-500 mt-1">Painel de controle corporal e desempenho.</p>
        </div>
        
        <div className="flex gap-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2 shadow-sm">
                        <Dumbbell className="h-4 w-4" /> Registrar Treino
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Ficha de Treino</DialogTitle></DialogHeader>
                    <GymForm />
                </DialogContent>
            </Dialog>

            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 bg-white dark:bg-zinc-900 shadow-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        <Footprints className="h-4 w-4" /> Registrar Corrida
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Corrida</DialogTitle></DialogHeader>
                    <RunForm />
                </DialogContent>
            </Dialog>
        </div>
      </header>

      {/* --- GRID 1: METABOLISMO & HIDRATAÇÃO --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          <div className="lg:col-span-2 h-full">
             <BMICard weight={weight} height={height} />
          </div>
          <CaloriesCard weight={weight} height={height} />
          <HydrationCard total={waterTotal} />
      </div>

      {/* --- GRID 2: DIÁRIO (SONO, PESO, COMIDA) --- */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Coluna Esquerda: Métricas Rápidas (Empilhadas) */}
          <div className="md:col-span-4 flex flex-col gap-4">
              {/* Card de Sono Interativo */}
              <SleepCard value={lastSleep?.value || "-"} />
              
              {/* Peso Simples */}
              <SimpleMetric label="Último Peso" value={weight} unit="kg" icon={Scale} />
              
              {/* Totalizador */}
              <SimpleMetric label="Total Treinos" value={workouts.length} unit="sessões" icon={Activity} />
          </div>

          {/* Coluna Direita: Diário Alimentar (Ocupa mais espaço) */}
          <div className="md:col-span-8 h-full min-h-[300px]">
              <FoodLogger meals={meals} />
          </div>
      </div>

      {/* --- GRID 3: HISTÓRICO --- */}
      <ActivityFeed initialWorkouts={workouts} />

    </div>
  );
}