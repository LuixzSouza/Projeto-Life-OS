import { prisma } from "@/lib/prisma";
import {
    Activity, Utensils, Droplets, Moon,
    Dumbbell, Target, FlaskConical
} from "lucide-react";

// Componentes Core
import { BodySummaryCard } from "@/components/health/body-summary-card";
import { HydrationCard } from "@/components/health/hydration-card";
import { CaloriesCard } from "@/components/health/calories-card";
import { SleepCard } from "@/components/health/sleep-card";
import { FoodLogger } from "@/components/health/nutrition/food-logger"; 
import { ActivityFeed } from "@/components/health/activity-feed";
import { HealthActions } from "@/components/health/health-actions";
import { HealthStatCard } from "@/components/health/ui/health-stat-card";
import { SectionHeader } from "@/components/health/ui/section-header";
import { getCurrentUserId } from "@/lib/auth";
import { calculateAge } from "@/lib/body-math";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/ui/error-state";
import { CorrelationDashboard } from "@/components/health/correlation-dashboard";
import { DopamineBalanceCard } from "@/components/health/dopamine-balance-card";
import { getCorrelationMatrix } from "@/app/(dashboard)/agenda/focus-actions";

// --- PROTOCOLOS DE TIPAGEM ESTREITA ---
type Gender = "MALE" | "FEMALE";

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
    try {
        const today = new Date();
        today.setHours(0,0,0,0);

        const userId = await getCurrentUserId();

        const [workouts, lastBodySnapshot, lastWeightLegacy, waterMetrics, lastSleep, meals, correlationMatrix] = await Promise.all([
            prisma.workout.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 10 }),
            prisma.bodyMeasurement.findFirst({ where: { userId }, orderBy: { date: 'desc' } }),
            prisma.healthMetric.findFirst({ where: { type: "WEIGHT", userId }, orderBy: { date: 'desc' } }),
            prisma.healthMetric.findMany({ where: { type: "WATER", date: { gte: today }, userId } }),
            prisma.healthMetric.findFirst({ where: { type: "SLEEP", userId }, orderBy: { date: 'desc' } }),
            prisma.meal.findMany({ where: { date: { gte: today }, userId }, orderBy: { date: 'desc' } }),
            getCorrelationMatrix(),
        ]);

        const weight = lastBodySnapshot?.weight || lastWeightLegacy?.value || 0;
        const height = lastBodySnapshot?.height || 0;
        const waterTotal = waterMetrics.reduce((acc, item) => acc + item.value, 0);
        const gender = (lastBodySnapshot?.gender as Gender) || "MALE";
        const activityFactor = lastBodySnapshot?.activity || 1.2;
        const age = calculateAge(lastBodySnapshot?.birthDate?.toISOString());

        return (
            <PageShell>
                <PageHeader
                    icon={<Activity className="h-6 w-6" />}
                    title="Saúde & Bem-estar"
                    description="Acompanhe suas métricas corporais, treinos e nutrição."
                    actions={<HealthActions />}
                />

                <PageContainer className="space-y-8">

                    {/* --- GRID 1: MÉTRICAS RÁPIDAS (Overview Diário) --- */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <HealthStatCard label="Peso Atual" value={weight} unit="kg" icon={Target} color="zinc" />
                        <HealthStatCard label="Água Consumida" value={waterTotal} unit="ml" icon={Droplets} color="blue" />
                        <HealthStatCard label="Qualidade do Sono" value={lastSleep?.value || 0} unit="hrs" icon={Moon} color="indigo" />
                        <HealthStatCard label="Refeições Hoje" value={meals.length} unit="logs" icon={Utensils} color="emerald" />
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
                                    age={age}
                                    waist={lastBodySnapshot?.waist || 0}
                                    neck={lastBodySnapshot?.neck || 0}
                                    hip={lastBodySnapshot?.hip || 0}
                                    activityFactor={activityFactor}
                                />
                                <CaloriesCard
                                    weight={weight}
                                    height={height}
                                    age={age}
                                    gender={gender}
                                    activityFactor={activityFactor}
                                />
                            </div>

                            <div className="space-y-4">
                                <SectionHeader icon={Dumbbell} title="Últimos Treinos" />
                                <div className="border border-border/40 rounded-2xl overflow-hidden bg-card/50 shadow-sm">
                                    <ActivityFeed initialWorkouts={workouts} />
                                </div>
                            </div>
                        </div>

                        {/* COLUNA DIREITA: Widgets Diários (Água, Sono, Comida) */}
                        <div className="space-y-6">
                            <HydrationCard total={waterTotal} />
                            <SleepCard value={lastSleep?.value || 0} />
                            
                            <div className="space-y-4 pt-2">
                                <SectionHeader icon={Utensils} title="Diário Nutricional" />
                                <div className="border border-border/40 rounded-2xl overflow-hidden bg-card/50 shadow-sm">
                                    <FoodLogger meals={meals} />
                                </div>
                            </div>
                        </div>

                    </section>

                    {/* --- CORRELATION DASHBOARD (#8): sono × treino × energia × foco --- */}
                    <section className="space-y-4">
                        <SectionHeader icon={FlaskConical} title="Correlações — o que move você" />
                        <CorrelationDashboard matrix={correlationMatrix} />
                    </section>

                    {/* --- BALANÇO DOPAMINÉRGICO (#24, experimento): conquistada × barata --- */}
                    <DopamineBalanceCard />
                </PageContainer>
            </PageShell>
        );

    } catch (error) {
        console.error("Erro ao carregar dados de saúde:", error);
        return (
            <ErrorState
                title="Falha ao carregar dados"
                description="Não foi possível sincronizar suas informações de saúde no momento. Verifique sua conexão com o banco de dados."
                retryHref="/health"
                retryLabel="Tentar Novamente"
            />
        );
    }
}