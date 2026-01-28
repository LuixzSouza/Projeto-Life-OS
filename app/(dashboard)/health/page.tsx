import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, Activity, LucideIcon, ArrowRight, Utensils, AlertCircle, TrendingUp, Droplets, Zap, Moon, LayoutDashboard } from "lucide-react";
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
import { cn } from "@/lib/utils";

// --- COMPONENTE AUXILIAR DE MÉTRICA ---
interface SimpleMetricProps { 
    label: string; 
    value: string | number; 
    icon: LucideIcon; 
    unit: string;
    description?: string;
    className?: string;
}

function SimpleMetric({ label, value, icon: Icon, unit, description, className }: SimpleMetricProps) {
    return (
        <Card className={cn("relative overflow-hidden border-border/60 bg-card hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md group flex flex-col justify-between", className)}>
            {/* Background Gradient Effect */}
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon className="w-20 h-20 text-primary -mr-4 -mt-4 transform rotate-12" />
            </div>

            <div className="p-5 relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {label}
                    </p>
                    <div className="p-2 bg-primary/10 rounded-lg text-primary ring-1 ring-primary/20 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="h-4 w-4" />
                    </div>
                </div>
                
                <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-bold text-foreground tracking-tight">
                        {value}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                        {unit}
                    </span>
                </div>
                
                {description && (
                    <p className="text-[10px] text-muted-foreground/80 mt-1 line-clamp-1">{description}</p>
                )}
            </div>
        </Card>
    )
}

// Impede cache estático para garantir dados frescos
export const dynamic = 'force-dynamic';

export default async function HealthPage() {
  try {
      // 1. Definição de datas
      const today = new Date();
      today.setHours(0,0,0,0);

      // 2. Buscas Paralelas Otimizadas
      const [
        workouts, 
        lastBodySnapshot, 
        lastWeightLegacy, 
        waterMetrics, 
        lastSleep, 
        meals
      ] = await Promise.all([
        prisma.workout.findMany({ orderBy: { date: 'desc' }, take: 10 }),
        prisma.bodyMeasurement.findFirst({ orderBy: { date: 'desc' } }),
        prisma.healthMetric.findFirst({ where: { type: "WEIGHT" }, orderBy: { date: 'desc' } }),
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
      const weight = lastBodySnapshot?.weight || lastWeightLegacy?.value || 0;
      const height = lastBodySnapshot?.height || 0;
      
      const gender = (lastBodySnapshot?.gender as "MALE" | "FEMALE") || 'MALE';
      const age = 25; 
      const activityFactor = lastBodySnapshot?.activity || 1.2;
      
      const waist = lastBodySnapshot?.waist || 0;
      const neck = lastBodySnapshot?.neck || 0;
      const hip = lastBodySnapshot?.hip || 0;

      const waterTotal = waterMetrics.reduce((acc, item) => acc + item.value, 0);

      return (
        <div className="min-h-screen bg-background pb-20">
          
          {/* --- HEADER --- */}
          <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-10 pb-8 px-6 md:px-8">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <div className="p-2 bg-primary rounded-lg shadow-lg shadow-primary/25">
                            <Activity className="h-6 w-6 text-primary-foreground" />
                        </div>
                        Health Center
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                        Visão unificada de métricas, nutrição e performance.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <HealthActions />
                </div>
            </div>
          </header>

          <main className="px-4 md:px-8 py-8 space-y-8 max-w-[1600px] mx-auto">

            {/* --- DASHBOARD GRID SUPERIOR --- */}
            {/* Layout Bento Grid: 3 Colunas Largas no Desktop */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* COLUNA 1: Composição Corporal (Foco Principal) */}
                <div className="xl:col-span-4 flex flex-col h-full">
                     <BodySummaryCard 
                        weight={weight} 
                        height={height} 
                        gender={gender as "MALE" | "FEMALE" | undefined}
                        age={age}
                        waist={waist}
                        neck={neck}
                        hip={hip}
                        activityFactor={activityFactor}
                      />
                </div>

                {/* COLUNA 2: Combustível (Calorias + Água) */}
                <div className="xl:col-span-4 flex flex-col gap-6">
                    <div className="flex-1">
                        <CaloriesCard weight={weight} height={height} age={age} gender={gender} />
                    </div>
                    <div className="flex-1">
                        <HydrationCard total={waterTotal} />
                    </div>
                </div>

                {/* COLUNA 3: Recuperação & Métricas Rápidas */}
                <div className="xl:col-span-4 flex flex-col gap-6">
                    {/* Sono ocupa metade superior */}
                    <div className="flex-1">
                        <SleepCard value={lastSleep?.value || 0} />
                    </div>
                    
                    {/* Grid 2x1 para métricas pequenas ocuparem a metade inferior */}
                    <div className="grid grid-cols-2 gap-4 flex-1">
                        <SimpleMetric 
                            label="Peso Atual" 
                            value={weight} 
                            unit="kg" 
                            icon={Scale} 
                            description="Registro atual"
                            className="h-full"
                        />
                        <SimpleMetric 
                            label="Treinos" 
                            value={workouts.length} 
                            unit="total" 
                            icon={TrendingUp} 
                            description="Recentes"
                            className="h-full"
                        />
                    </div>
                </div>
            </div>

            {/* --- DASHBOARD GRID INFERIOR (Detalhes) --- */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* Nutrição (Ocupa 2/3 da largura) */}
                <div className="xl:col-span-full space-y-6">
                    <div className="flex justify-between items-center pb-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-md">
                                <Utensils className="h-5 w-5 text-primary" />
                            </div>
                            <h2 className="text-xl font-semibold text-foreground">Diário Alimentar</h2>
                        </div>
                        <Link href="/health/nutrition">
                            <Button variant="ghost" size="sm" className="text-xs hover:bg-primary/10 hover:text-primary">
                                Ver Macros <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                        </Link>
                    </div>
                    
                    <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
                        <FoodLogger meals={meals} />
                    </div>
                </div>

            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start" >
                {/* Atividade (Ocupa 1/3 da largura - Sidebar style) */}
                <div className="xl:col-span-full space-y-6">
                    <div className="flex justify-between items-center pb-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-500/10 rounded-md">
                                <Activity className="h-5 w-5 text-blue-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-foreground">Histórico de Treino</h2>
                        </div>
                        <Link href="/health/gym">
                            <Button variant="ghost" size="sm" className="text-xs hover:bg-blue-500/10 hover:text-blue-500">
                                Ver Treinos<ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                    
                    <div className="bg-card/50 rounded-xl border border-border/60 shadow-sm backdrop-blur-[2px] h-full min-h-[400px]">
                        <ActivityFeed initialWorkouts={workouts} />
                    </div>
                </div>
            </div>

          </main>
        </div>
      );

  } catch (error) {
      console.error("Critical Error in HealthPage:", error);
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="p-4 bg-destructive/10 rounded-full text-destructive">
                <AlertCircle className="h-10 w-10" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-foreground">Sistema Indisponível</h2>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    Não foi possível carregar seus dados de saúde no momento.
                </p>
            </div>
            <Link href="/health">
                <Button variant="outline">Recarregar Página</Button>
            </Link>
          </div>
      );
  }
}