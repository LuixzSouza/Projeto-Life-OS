import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { 
    Activity, Utensils, Droplets, Moon, 
    Dumbbell, Target, ShieldCheck, RefreshCcw
} from "lucide-react";
import Link from "next/link"; 

// Componentes Core
import { BodySummaryCard } from "@/components/health/body-summary-card"; 
import { HydrationCard } from "@/components/health/hydration-card";
import { CaloriesCard } from "@/components/health/calories-card";
import { SleepCard } from "@/components/health/sleep-card";
import { FoodLogger } from "@/components/health/nutrition/food-logger"; 
import { ActivityFeed } from "@/components/health/activity-feed";
import { HealthActions } from "@/components/health/health-actions";
import { cn } from "@/lib/utils";

// --- PROTOCOLOS DE TIPAGEM ESTREITA ---
type StatusColor = "rose" | "blue" | "amber" | "emerald" | "indigo" | "zinc";
type Gender = "MALE" | "FEMALE";

interface MetricCardProps {
    label: string;
    value: number | string;
    unit: string;
    icon: React.ElementType;
    color: StatusColor;
}

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
    try {
        const today = new Date();
        today.setHours(0,0,0,0);

        const [workouts, lastBodySnapshot, lastWeightLegacy, waterMetrics, lastSleep, meals] = await Promise.all([
            prisma.workout.findMany({ orderBy: { date: 'desc' }, take: 10 }),
            prisma.bodyMeasurement.findFirst({ orderBy: { date: 'desc' } }),
            prisma.healthMetric.findFirst({ where: { type: "WEIGHT" }, orderBy: { date: 'desc' } }),
            prisma.healthMetric.findMany({ where: { type: "WATER", date: { gte: today } } }),
            prisma.healthMetric.findFirst({ where: { type: "SLEEP" }, orderBy: { date: 'desc' } }),
            prisma.meal.findMany({ where: { date: { gte: today } }, orderBy: { date: 'desc' } })
        ]);

        const weight = lastBodySnapshot?.weight || lastWeightLegacy?.value || 0;
        const height = lastBodySnapshot?.height || 0;
        const waterTotal = waterMetrics.reduce((acc, item) => acc + item.value, 0);
        const gender = (lastBodySnapshot?.gender as Gender) || "MALE";
        const activityFactor = lastBodySnapshot?.activity || 1.2;

        return (
            <div className="min-h-screen bg-background w-full pb-12">
                <div className=" mx-auto p-6 md:p-8 space-y-8">
                    
                    {/* --- HEADER CLEAN --- */}
                    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <Activity className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">Saúde & Bem-estar</h1>
                                <p className="text-sm text-muted-foreground mt-1">Acompanhe suas métricas corporais, treinos e nutrição.</p>
                            </div>
                        </div>
                        <HealthActions />
                    </header>

                    {/* --- GRID 1: MÉTRICAS RÁPIDAS (Overview Diário) --- */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <QuickMetric label="Peso Atual" value={weight} unit="kg" icon={Target} color="zinc" />
                        <QuickMetric label="Água Consumida" value={waterTotal} unit="ml" icon={Droplets} color="blue" />
                        <QuickMetric label="Qualidade do Sono" value={lastSleep?.value || 0} unit="hrs" icon={Moon} color="indigo" />
                        <QuickMetric label="Refeições Hoje" value={meals.length} unit="logs" icon={Utensils} color="emerald" />
                    </section>

                    {/* --- GRID 2: CONTEÚDO PRINCIPAL (Layout 2/3 e 1/3) --- */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        
                        {/* COLUNA ESQUERDA: Análise Corporal e Histórico de Treinos */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <BodySummaryCard 
                                    weight={weight} 
                                    height={height} 
                                    gender={gender}
                                    age={25} // Ajuste conforme a necessidade do seu banco
                                    waist={lastBodySnapshot?.waist || 0}
                                    neck={lastBodySnapshot?.neck || 0}
                                    hip={lastBodySnapshot?.hip || 0}
                                    activityFactor={activityFactor}
                                />
                                <CaloriesCard 
                                    weight={weight} 
                                    height={height} 
                                    age={25} 
                                    gender={gender} 
                                    activityFactor={activityFactor}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Dumbbell className="h-5 w-5 text-muted-foreground" />
                                    <h2 className="text-lg font-semibold tracking-tight">Últimos Treinos</h2>
                                </div>
                                <div className="border border-border/40 rounded-[1.5rem] overflow-hidden bg-card/50 shadow-sm">
                                    <ActivityFeed initialWorkouts={workouts} />
                                </div>
                            </div>
                        </div>

                        {/* COLUNA DIREITA: Widgets Diários (Água, Sono, Comida) */}
                        <div className="space-y-6">
                            <HydrationCard total={waterTotal} />
                            <SleepCard value={lastSleep?.value || 0} />
                            
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-2">
                                    <Utensils className="h-5 w-5 text-muted-foreground" />
                                    <h2 className="text-lg font-semibold tracking-tight">Diário Nutricional</h2>
                                </div>
                                <div className="border border-border/40 rounded-[1.5rem] overflow-hidden bg-card/50 shadow-sm">
                                    <FoodLogger meals={meals} />
                                </div>
                            </div>
                        </div>

                    </section>
                </div>
            </div>
        );

    } catch (error) {
        console.error("Erro ao carregar dados de saúde:", error);
        return <HealthErrorState />;
    }
}

// --- UI COMPONENTS REFINADOS E SÓBRIOS ---

function QuickMetric({ label, value, unit, icon: Icon, color }: MetricCardProps) {
    const theme: Record<StatusColor, string> = {
        zinc: "text-zinc-500 bg-zinc-500/10",
        rose: "text-rose-500 bg-rose-500/10",
        blue: "text-blue-500 bg-blue-500/10",
        amber: "text-amber-500 bg-amber-500/10",
        emerald: "text-emerald-500 bg-emerald-500/10",
        indigo: "text-indigo-500 bg-indigo-500/10",
    };

    return (
        <div className="bg-card border border-border/40 p-4 rounded-2xl flex flex-col gap-3 shadow-sm hover:border-border/80 transition-colors">
            <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg", theme[color])}>
                    <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tracking-tight">{value}</span>
                <span className="text-xs font-medium text-muted-foreground">{unit}</span>
            </div>
        </div>
    );
}

function HealthErrorState() {
    return (
        <div className="min-h-[80vh] w-full flex flex-col items-center justify-center p-8">
            <div className="p-8 rounded-3xl bg-muted/30 border border-border/40 flex flex-col items-center gap-4 text-center max-w-md">
                <div className="h-16 w-16 bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-full mb-2">
                    <ShieldCheck className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Falha ao carregar dados</h2>
                <p className="text-muted-foreground text-sm">
                    Não foi possível sincronizar suas informações de saúde no momento. Verifique sua conexão com o banco de dados.
                </p>
                <Link href="/health" className="mt-4">
                    <Button variant="outline" className="gap-2 rounded-xl">
                        <RefreshCcw className="h-4 w-4" /> Tentar Novamente
                    </Button>
                </Link>
            </div>
        </div>
    );
}