import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, Activity, LucideIcon, ArrowRight, Utensils, AlertCircle, TrendingUp, Droplets, Zap, Moon } from "lucide-react";
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

// --- COMPONENTE AUXILIAR DE MÉTRICA (Refinado) ---
interface SimpleMetricProps { 
    label: string; 
    value: string | number; 
    icon: LucideIcon; 
    unit: string;
    description?: string;
}

function SimpleMetric({ label, value, icon: Icon, unit, description }: SimpleMetricProps) {
    return (
        <Card className="relative overflow-hidden border-border/60 bg-card hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md group">
            {/* Background Gradient Effect */}
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon className="w-24 h-24 text-primary -mr-4 -mt-4 transform rotate-12" />
            </div>

            <div className="p-5 flex items-start justify-between relative z-10">
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        {label}
                    </p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground tracking-tight">
                            {value}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground">
                            {unit}
                        </span>
                    </div>
                    {description && (
                        <p className="text-xs text-muted-foreground/80 mt-1">{description}</p>
                    )}
                </div>
                <div className="p-3 bg-primary/10 rounded-xl text-primary ring-1 ring-primary/20 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-5 w-5" />
                </div>
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
        lastBodySnapshot, // Busca o registro completo mais recente
        lastWeightLegacy, // Fallback para peso antigo
        waterMetrics, 
        lastSleep, 
        meals
      ] = await Promise.all([
        prisma.workout.findMany({ orderBy: { date: 'desc' }, take: 10 }),
        // Busca principal de medidas
        prisma.bodyMeasurement.findFirst({ orderBy: { date: 'desc' } }),
        // Busca legado (caso não tenha snapshot novo ainda)
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

      // 3. Processamento Inteligente de Dados
      // Prioriza o snapshot novo, mas usa o legado se necessário
      const weight = lastBodySnapshot?.weight || lastWeightLegacy?.value || 0;
      const height = lastBodySnapshot?.height || 0;
      
      // Dados extras para passar ao card de resumo (para não perder contexto ao editar)
      const gender = (lastBodySnapshot?.gender as "MALE" | "FEMALE") || 'MALE';
      const age = 25; // TODO: Pegar do user profile
      const activityFactor = lastBodySnapshot?.activity || 1.2;
      
      // Medidas para preservar no card de edição rápida
      const waist = lastBodySnapshot?.waist || 0;
      const neck = lastBodySnapshot?.neck || 0;
      const hip = lastBodySnapshot?.hip || 0;

      const waterTotal = waterMetrics.reduce((acc, item) => acc + item.value, 0);

      return (
        <div className="min-h-screen bg-background pb-20">
          
          {/* --- HEADER VISUAL COM GRADIENTE --- */}
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
                        Monitoramento biométrico e análise de performance.
                    </p>
                </div>
                
                {/* Ações Globais */}
                <div className="flex items-center gap-3">
                    <HealthActions />
                </div>
            </div>
          </header>

          <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto">

            {/* --- SEÇÃO 1: VITAIS DO DIA --- */}
            <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <div className="h-6 w-1 bg-primary rounded-full" />
                    <h2 className="text-xl font-semibold text-foreground tracking-tight">Métricas Corporais</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-2 h-full">
                         {/* Card Inteligente com dados preservados */}
                         <BodySummaryCard 
                            weight={weight} 
                            height={height} 
                            gender={gender as "MALE" | "FEMALE" | undefined}
                            age={age}
                            // Passamos dados ocultos para manter histórico
                            waist={waist}
                            neck={neck}
                            hip={hip}
                            activityFactor={activityFactor}
                         />
                    </div>
                    <div className="flex flex-col gap-6">
                        {/* Agora o cartão de calorias usa os dados corretos de TDEE/BMR se disponíveis no body-math */}
                        <CaloriesCard weight={weight} height={height} age={age} gender={gender} />
                        <HydrationCard total={waterTotal} />
                    </div>
                    <div className="flex flex-col gap-6">
                        <SimpleMetric 
                            label="Peso Atual" 
                            value={weight} 
                            unit="kg" 
                            icon={Scale} 
                            description="Último registro consolidado"
                        />
                        <SimpleMetric 
                            label="Atividades" 
                            value={workouts.length} 
                            unit="total" 
                            icon={TrendingUp} 
                            description="Histórico recente"
                        />
                    </div>
                </div>
            </section>

            {/* --- SEÇÃO 2: RECUPERAÇÃO & NUTRIÇÃO --- */}
            <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                
                {/* Coluna Esquerda: Sono e Recuperação */}
                <div className="md:col-span-4 space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                        <Moon className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">Recuperação</h2>
                    </div>
                    <SleepCard value={lastSleep?.value || 0} />
                    
                    <Card className="bg-primary/5 border-primary/10 border shadow-none">
                        <CardContent className="p-4 flex gap-4 items-center">
                            <Zap className="h-8 w-8 text-primary" />
                            <div>
                                <p className="text-sm font-bold text-foreground">Consistência</p>
                                <p className="text-xs text-muted-foreground">Mantenha a rotina para melhores resultados.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna Direita: Nutrição */}
                <div className="md:col-span-8 space-y-6">
                    <div className="flex justify-between items-end pb-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                            <Utensils className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-semibold text-foreground">Alimentação de Hoje</h2>
                        </div>
                        <Link href="/health/nutrition">
                            <Button variant="link" size="sm" className="h-auto p-0 text-primary font-semibold hover:text-primary/80">
                                Ver Detalhes <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                    
                    <div className="bg-card rounded-xl border border-border/60 shadow-sm p-1">
                        <FoodLogger meals={meals} />
                    </div>
                </div>
            </section>

            {/* --- SEÇÃO 3: FEED DE ATIVIDADES --- */}
            <section className="space-y-6">
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">Últimas Atividades</h2>
                    </div>
                    <Link href="/health/gym">
                        <Button variant="outline" size="sm" className="text-xs font-medium bg-background hover:bg-accent hover:text-accent-foreground border-input">
                            Histórico Completo
                        </Button>
                    </Link>
                </div>
                
                <div className="bg-card/50 rounded-xl border border-border/60 shadow-sm backdrop-blur-[2px]">
                    <ActivityFeed initialWorkouts={workouts} />
                </div>
            </section>

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
                    Não foi possível carregar seus dados de saúde no momento. Por favor, tente novamente mais tarde.
                </p>
            </div>
            {/* Botão de recarregar via link para forçar re-render do servidor */}
            <Link href="/health">
                <Button variant="outline">
                    Recarregar Página
                </Button>
            </Link>
          </div>
      );
  }
}