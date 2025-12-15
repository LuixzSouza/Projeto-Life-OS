import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, Activity, LucideIcon, ArrowRight, Utensils, AlertCircle } from "lucide-react";
import Link from "next/link"; 

// Componentes de Visualização
import { BodySummaryCard } from "@/components/health/body-summary-card"; 
import { HydrationCard } from "@/components/health/hydration-card";
import { CaloriesCard } from "@/components/health/calories-card";
import { SleepCard } from "@/components/health/sleep-card";
import { FoodLogger } from "@/components/health/nutrition/food-logger"; 
import { ActivityFeed } from "@/components/health/activity-feed";

// Componente Cliente para Ações (Modais)
import { HealthActions } from "@/components/health/health-actions";

// --- COMPONENTE AUXILIAR DE MÉTRICA ---
interface SimpleMetricProps { 
    label: string; 
    value: string | number; 
    icon: LucideIcon; 
    unit: string;
    trend?: "up" | "down" | "neutral"; 
}

function SimpleMetric({ label, value, icon: Icon, unit }: SimpleMetricProps) {
    return (
        <Card className="border border-border bg-card shadow-sm p-4 flex items-center gap-4 h-full hover:bg-muted/50 transition-colors group">
            <div className="p-3 bg-muted rounded-full text-muted-foreground group-hover:scale-110 group-hover:text-primary transition-all duration-300">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">{label}</p>
                <p className="text-2xl font-bold text-foreground">
                    {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                </p>
            </div>
        </Card>
    )
}

export default async function HealthPage() {
  try {
      // 1. Definição de datas (Início do dia para filtros)
      const today = new Date();
      today.setHours(0,0,0,0);

      // 2. Buscas Paralelas Otimizadas
      const [workouts, lastWeight, lastHeight, waterMetrics, lastSleep, meals] = await Promise.all([
        prisma.workout.findMany({ orderBy: { date: 'desc' }, take: 10 }), // Limitado a 10 para performance
        prisma.healthMetric.findFirst({ where: { type: "WEIGHT" }, orderBy: { date: 'desc' } }),
        prisma.healthMetric.findFirst({ where: { type: "HEIGHT" }, orderBy: { date: 'desc' } }),
        prisma.healthMetric.findMany({ 
            where: { type: "WATER", date: { gte: today } } 
        }),
        prisma.healthMetric.findFirst({ where: { type: "SLEEP" }, orderBy: { date: 'desc' } }),
        prisma.meal.findMany({ 
            where: { date: { gte: today } }, 
            orderBy: { date: 'desc' } 
        })
      ]);

      // 3. Processamento de Dados
      const weight = lastWeight?.value || 0;
      const height = lastHeight?.value || 0;
      const waterTotal = waterMetrics.reduce((acc, item) => acc + item.value, 0);

      return (
        <div className="min-h-screen bg-muted/20 p-6 md:p-8 space-y-8 pb-32 animate-in fade-in duration-500">
          
          {/* --- HEADER & AÇÕES --- */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border pb-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Health Center</h1>
                <p className="text-muted-foreground mt-1 text-base">Painel de controle corporal e desempenho físico.</p>
            </div>
            
            {/* Componente Cliente que gerencia os Modais de Treino/Corrida */}
            <HealthActions />
          </header>

          {/* --- GRID 1: COMPOSIÇÃO & METABOLISMO --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
              <div className="lg:col-span-2 h-full">
                 <BodySummaryCard weight={weight} height={height} />
              </div>
              <CaloriesCard weight={weight} height={height} />
              <HydrationCard total={waterTotal} />
          </div>

          {/* --- GRID 2: DIÁRIO (SONO & NUTRIÇÃO) --- */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Coluna Esquerda: Métricas Rápidas */}
              <div className="md:col-span-4 flex flex-col gap-4">
                  <SleepCard value={lastSleep?.value || 0} />
                  
                  <div className="grid grid-cols-2 gap-4">
                      <SimpleMetric label="Peso Atual" value={weight} unit="kg" icon={Scale} />
                      <SimpleMetric label="Treinos" value={workouts.length} unit="total" icon={Activity} />
                  </div>
              </div>

              {/* Coluna Direita: Nutrição */}
              <div className="md:col-span-8 h-full flex flex-col gap-4">
                  <div className="flex justify-between items-end px-1">
                      <h3 className="font-semibold text-foreground flex items-center gap-2 text-lg">
                          <Utensils className="h-5 w-5 text-muted-foreground" /> Alimentação de Hoje
                      </h3>
                      <Link href="/health/nutrition" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition-colors">
                          Ver detalhes <ArrowRight className="h-3 w-3" />
                      </Link>
                  </div>
                  
                  {/* FoodLogger agora recebe os dados do servidor */}
                  <FoodLogger meals={meals} />
              </div>
          </div>

          {/* --- GRID 3: ATIVIDADES RECENTES --- */}
          <div className="space-y-4 pt-4 border-t border-dashed border-border">
              <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Activity className="h-5 w-5 text-muted-foreground" /> Últimas Atividades
                  </h3>
                  <div className="flex gap-2">
                      <Link href="/health/gym">
                          <Button variant="ghost" size="sm" className="text-xs hover:bg-muted">Ver Histórico</Button>
                      </Link>
                  </div>
              </div>
              <ActivityFeed initialWorkouts={workouts} />
          </div>

        </div>
      );

  } catch (error) {
      console.error("Erro crítico no HealthPage:", error);
      return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div>
                  <h2 className="text-lg font-semibold">Erro ao carregar dados de saúde</h2>
                  <p className="text-muted-foreground text-sm">Verifique sua conexão com o banco de dados.</p>
              </div>
          </div>
      );
  }
}