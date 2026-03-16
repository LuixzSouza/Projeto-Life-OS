import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Activity, Utensils, Droplets, Zap, Moon, Target, 
    Dumbbell, Calculator, LucideIcon, BrainCircuit,
    Layers, ClipboardList, ShieldCheck, TrendingUp
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
import { Badge } from "@/components/ui/badge";

// --- PROTOCOLOS DE TIPAGEM ESTREITA ---
type StatusColor = "rose" | "blue" | "amber" | "emerald" | "indigo";
type Gender = "MALE" | "FEMALE";

interface MetricCardProps {
    label: string;
    value: number | string;
    unit: string;
    icon: LucideIcon;
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
            <div className="min-h-screen bg-[#F4F4F5] dark:bg-[#09090B] w-full pb-10 text-foreground selection:bg-primary/20">
                
                {/* --- TOPBAR HUD --- */}
                <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                                <Activity className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-lg font-black uppercase tracking-tighter leading-none flex items-center gap-2">
                                    Biometric Console
                                    <Badge variant="outline" className="text-[8px] h-4 font-black bg-primary/5 border-primary/20 text-primary">v2.4.0</Badge>
                                </h1>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60 italic">Sincronização biométrica ativa</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/40">
                                <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest px-4">Análise</Button>
                                <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest px-4">Histórico</Button>
                            </div>
                            <HealthActions />
                        </div>
                    </div>
                </header>

                <main className="w-full p-6 space-y-6 animate-in fade-in duration-1000">
                    
                    {/* --- GRID 1: MÉTRICAS RÁPIDAS (Layout Fluido) --- */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        <QuickMetric label="Massa Corporal" value={weight} unit="kg" icon={Target} color="rose" />
                        <QuickMetric label="Hidratação" value={waterTotal} unit="ml" icon={Droplets} color="blue" />
                        <QuickMetric label="Volume Treino" value={workouts.length} unit="logs" icon={Dumbbell} color="amber" />
                        <QuickMetric label="Refeições" value={meals.length} unit="hoje" icon={Utensils} color="emerald" />
                        <QuickMetric label="Eficiência Sono" value={lastSleep?.value || 0} unit="hrs" icon={Moon} color="indigo" />
                    </section>

                    {/* --- GRID 2: CORE ANALYSIS (O Coração do Dashboard) --- */}
                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        
                        {/* 2.1: Composição e Medidas (Grid dentro do Bento) */}
                        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-2 rounded-[2rem] border border-border/40">
                            <div className="h-full">
                                <BodySummaryCard 
                                    weight={weight} 
                                    height={height} 
                                    gender={gender}
                                    age={25}
                                    waist={lastBodySnapshot?.waist || 0}
                                    neck={lastBodySnapshot?.neck || 0}
                                    hip={lastBodySnapshot?.hip || 0}
                                    activityFactor={activityFactor}
                                />
                            </div>
                            <div className="h-full">
                                <CaloriesCard 
                                    weight={weight} 
                                    height={height} 
                                    age={25} 
                                    gender={gender} 
                                    activityFactor={activityFactor}
                                />
                            </div>
                        </div>

                        {/* 2.2: Status de Tanque e Recuperação */}
                        <div className="lg:col-span-4 flex flex-col gap-6">
                            <div className="flex-1"><HydrationCard total={waterTotal} /></div>
                            <div className="flex-1"><SleepCard value={lastSleep?.value || 0} /></div>
                        </div>
                    </section>

                    {/* --- GRID 3: TERMINAL DE LOGS (Lado a Lado Estrito) --- */}
                    <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        
                        {/* LOG NUTRICIONAL */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 px-2">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    <ClipboardList className="h-4 w-4" />
                                </div>
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/70">Fluxo Nutricional</h2>
                            </div>
                            <div className="flex-1 border border-border/40 rounded-[2rem] overflow-hidden bg-card/50">
                                <FoodLogger meals={meals} />
                            </div>
                        </div>

                        {/* LOG DE ATIVIDADE */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 px-2">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    <BrainCircuit className="h-4 w-4" />
                                </div>
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/70">Commit de Atividades</h2>
                            </div>
                            <div className="flex-1 border border-border/40 rounded-[2rem] overflow-hidden bg-card/50">
                                <ActivityFeed initialWorkouts={workouts} />
                            </div>
                        </div>

                    </section>
                </main>
            </div>
        );

    } catch (error) {
        console.error("Critical Failure:", error);
        return <HealthErrorState />;
    }
}

// --- UI COMPONENTS REFINADOS (SEM ANY) ---

function QuickMetric({ label, value, unit, icon: Icon, color }: MetricCardProps) {
    const theme: Record<StatusColor, string> = {
        rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
        blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        indigo: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    };

    return (
        <div className="bg-card border border-border/40 p-5 rounded-[1.5rem] flex items-center justify-between shadow-sm hover:border-primary/30 transition-all group overflow-hidden relative">
            <div className="flex flex-col gap-1 relative z-10">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</span>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-mono font-black tracking-tighter tabular-nums">{value}</span>
                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-tighter">{unit}</span>
                </div>
            </div>
            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110 group-hover:rotate-6", theme[color])}>
                <Icon className="h-6 w-6" />
            </div>
            {/* Glow Effect */}
            <div className={cn("absolute -bottom-4 -right-4 w-12 h-12 blur-2xl opacity-20", theme[color].split(' ')[1])} />
        </div>
    );
}

function HealthErrorState() {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-8 bg-background">
            <div className="p-6 rounded-[2.5rem] bg-rose-500/5 border border-rose-500/10 flex flex-col items-center gap-6 shadow-2xl">
                <ShieldCheck className="h-16 w-16 text-rose-500 animate-pulse" />
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Erro de Comunicação Biológica</h2>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest max-w-[300px]">Link com os sensores de dados foi interrompido.</p>
                </div>
                <Link href="/health">
                    <Button className="rounded-xl font-black uppercase tracking-widest text-[10px] h-12 px-10 shadow-xl shadow-primary/20">Reiniciar Bios</Button>
                </Link>
            </div>
        </div>
    );
}