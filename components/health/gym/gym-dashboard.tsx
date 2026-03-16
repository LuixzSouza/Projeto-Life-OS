"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    BicepsFlexed, Timer, Calendar, TrendingUp, 
    Dumbbell, Plus, Activity, Flame, Trophy, LayoutList, LineChart as LineChartIcon
} from "lucide-react";
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GymForm } from "./gym-form";
import { WorkoutPlanBuilder } from "./workout-plan-builder";
import { cn } from "@/lib/utils";

// --- Types ---
interface Exercise {
    name: string;
    sets: string;
    reps: string;
    weight: string;
}

interface GymWorkout {
    id: string;
    title: string;
    date: string;
    duration: number;
    feeling: string | null;
    muscleGroup: string | null;
    exercises: Exercise[];
}

export function GymDashboard({ workouts }: { workouts: GymWorkout[] }) {
    const [selectedMuscle, setSelectedMuscle] = useState<string | 'ALL'>('ALL');
    const [isAddOpen, setIsAddOpen] = useState(false);

    // --- Calculations & Memoization ---
    
    // 1. Volume Chart Data
    const volumeData = useMemo(() => {
        return workouts.slice(0, 10).reverse().map(w => {
            let totalLoad = 0;
            w.exercises.forEach(ex => {
                const weight = parseFloat(ex.weight) || 0;
                const sets = parseFloat(ex.sets) || 0;
                const reps = parseFloat(ex.reps) || 0;
                totalLoad += (weight * sets * reps);
            });
            return {
                date: format(new Date(w.date), "dd/MM"),
                fullDate: format(new Date(w.date), "dd 'de' MMMM", { locale: ptBR }),
                load: totalLoad,
                title: w.title
            };
        });
    }, [workouts]);

    // 2. Muscle Distribution
    const muscleDistribution = useMemo(() => {
        const counts: Record<string, number> = {};
        workouts.forEach(w => {
            const groups = (w.muscleGroup || "Geral").split(", ");
            groups.forEach(g => {
                counts[g] = (counts[g] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [workouts]);

    // 3. Filtering
    const filteredWorkouts = selectedMuscle === 'ALL' 
        ? workouts 
        : workouts.filter(w => (w.muscleGroup || "").includes(selectedMuscle));

    return (
        <div className="pb-12">
            <Tabs defaultValue="dashboard" className="space-y-6">
                
                {/* Tabs Navigation & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <TabsList className="bg-muted/50 p-1 rounded-xl self-start h-auto">
                        <TabsTrigger value="dashboard" className="gap-2 px-4 py-2 text-xs font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <LineChartIcon className="h-4 w-4" />
                            Progresso
                        </TabsTrigger>
                        <TabsTrigger value="planner" className="gap-2 px-4 py-2 text-xs font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <LayoutList className="h-4 w-4" />
                            Fichas de Treino
                        </TabsTrigger>
                    </TabsList>

                    {/* Quick Add Button */}
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="h-9 gap-2 font-medium rounded-lg shadow-sm">
                                <Plus className="h-4 w-4" /> Registrar Sessão
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-border/40 shadow-xl rounded-2xl">
                            <DialogHeader className="px-6 pt-6 pb-2">
                                <DialogTitle className="text-xl">Novo Treino</DialogTitle>
                                <DialogDescription>
                                    Registre as cargas e volumes da sua sessão de hoje.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="px-6 pb-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
                                <GymForm onSuccess={() => setIsAddOpen(false)} />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* --- TAB: DASHBOARD --- */}
                <TabsContent value="dashboard" className="m-0 focus-visible:outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* Left Column: Stats (4/12) */}
                        <div className="lg:col-span-4 space-y-6">
                            
                            {/* Volume Chart */}
                            <Card className="border-border/40 shadow-sm bg-card">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-primary" /> 
                                        Volume Carga Total (kg)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-[220px] w-full pt-0 pb-4 px-2">
                                    {volumeData.length > 1 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={volumeData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                                <defs>
                                                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                                <XAxis 
                                                    dataKey="date" 
                                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tickMargin={10}
                                                />
                                                <YAxis 
                                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                                                    axisLine={false} 
                                                    tickLine={false}
                                                    tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`} 
                                                />
                                                <Tooltip 
                                                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-background text-foreground text-xs p-3 rounded-xl shadow-xl border border-border/50">
                                                                    <p className="font-semibold mb-1">{data.fullDate}</p>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                                                                        <p className="font-bold">{data.load.toLocaleString()} kg</p>
                                                                    </div>
                                                                    <p className="text-muted-foreground truncate max-w-[150px]">{data.title}</p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="load" 
                                                    stroke="hsl(var(--primary))" 
                                                    strokeWidth={2} 
                                                    fillOpacity={1} 
                                                    fill="url(#colorLoad)" 
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-2 rounded-lg bg-muted/10 border border-dashed border-border/40">
                                            <Activity className="h-6 w-6 text-muted-foreground/40" />
                                            <div>
                                                <p className="text-sm font-medium">Dados insuficientes</p>
                                                <p className="text-xs text-muted-foreground">Registre ao menos 2 treinos.</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Muscle Frequency Card */}
                            <Card className="border-border/40 shadow-sm bg-card overflow-hidden">
                                <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                        <BicepsFlexed className="h-4 w-4 text-primary" /> 
                                        Grupos Musculares
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    {muscleDistribution.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-4">Nenhum foco registrado.</p>
                                    ) : (
                                        muscleDistribution.slice(0, 5).map((item, i) => (
                                            <div key={item.name} className="flex items-center justify-between group cursor-default">
                                                <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border transition-colors",
                                                        i === 0 
                                                            ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                                            : "bg-muted text-muted-foreground border-border group-hover:border-primary/30"
                                                    )}>
                                                        {i === 0 ? <Trophy className="h-3 w-3" /> : i + 1}
                                                    </span>
                                                    <span className="text-sm font-medium text-foreground">{item.name}</span>
                                                </div>
                                                <Badge variant="secondary" className="bg-muted/50 text-muted-foreground text-xs font-mono px-2">
                                                    {item.value}x
                                                </Badge>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Feed (8/12) */}
                        <div className="lg:col-span-8 space-y-5">
                            
                            {/* Filter Chips */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setSelectedMuscle('ALL')}
                                    className={cn(
                                        "rounded-full px-4 h-8 text-xs font-medium transition-all shadow-none",
                                        selectedMuscle === 'ALL' 
                                            ? "bg-foreground text-background hover:bg-foreground/90" 
                                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    Todos
                                </Button>
                                {muscleDistribution.map(m => (
                                    <Button 
                                        key={m.name}
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setSelectedMuscle(m.name)}
                                        className={cn(
                                            "rounded-full px-4 h-8 text-xs font-medium transition-all whitespace-nowrap shadow-none",
                                            selectedMuscle === m.name
                                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        {m.name} <span className="ml-1.5 opacity-60 font-mono text-[10px]">{m.value}</span>
                                    </Button>
                                ))}
                            </div>

                            {/* Feed List */}
                            <div className="space-y-4">
                                {filteredWorkouts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border/60 rounded-2xl bg-muted/5 text-center">
                                        <div className="p-3 bg-muted/20 rounded-full mb-3">
                                            <Dumbbell className="h-6 w-6 text-muted-foreground/50" />
                                        </div>
                                        <h3 className="text-base font-semibold text-foreground">Nenhum treino encontrado</h3>
                                        <p className="text-xs text-muted-foreground mt-1">Ajuste os filtros ou registre sua sessão de hoje.</p>
                                    </div>
                                ) : (
                                    filteredWorkouts.map((w) => (
                                        <Card key={w.id} className="overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-shadow duration-200">
                                            <CardContent className="p-5">
                                                <div className="flex flex-col lg:flex-row gap-5">
                                                    
                                                    {/* Header e Badges (Esquerda) */}
                                                    <div className="flex-1 space-y-3 min-w-0">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="space-y-1">
                                                                <h3 className="font-semibold text-base text-foreground truncate">
                                                                    {w.title}
                                                                </h3>
                                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <Calendar className="h-3.5 w-3.5" /> 
                                                                        {format(new Date(w.date), "dd MMM, HH:mm", { locale: ptBR })}
                                                                    </span>
                                                                    <span className="flex items-center gap-1.5">
                                                                        <Timer className="h-3.5 w-3.5" /> 
                                                                        {w.duration} min
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Labels / Sentimento */}
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {w.feeling && (
                                                                <span className={cn(
                                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border",
                                                                    w.feeling === 'TIRED' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 
                                                                    w.feeling === 'HARD' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 
                                                                    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                                )}>
                                                                    <Flame className="h-3 w-3" />
                                                                    {w.feeling === 'GOOD' ? 'Bom Desempenho' : w.feeling === 'TIRED' ? 'Cansativo' : w.feeling === 'HARD' ? 'Intenso' : w.feeling}
                                                                </span>
                                                            )}
                                                            {(w.muscleGroup || "").split(", ").map((mg, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-muted/50 border border-border/50 rounded-md text-[10px] font-medium text-muted-foreground">
                                                                    {mg}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Lista de Exercícios (Direita) */}
                                                    <div className="w-full lg:w-[380px] bg-muted/10 rounded-xl border border-border/40 p-3">
                                                        <div className="space-y-1.5">
                                                            {w.exercises.slice(0, 4).map((ex, i) => (
                                                                <div key={i} className="flex justify-between items-center text-xs p-1.5 rounded hover:bg-muted/50 transition-colors">
                                                                    <span className="font-medium text-foreground/80 truncate pr-2">
                                                                        {ex.name}
                                                                    </span>
                                                                    <div className="flex items-center gap-2 text-muted-foreground font-mono shrink-0">
                                                                        <span>{ex.sets}x{ex.reps}</span>
                                                                        {ex.weight && ex.weight !== "0" && (
                                                                            <span className="bg-background border border-border/50 px-1.5 rounded text-foreground font-semibold">
                                                                                {ex.weight}kg
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {w.exercises.length > 4 && (
                                                                <p className="text-[10px] text-center text-muted-foreground pt-1">
                                                                    +{w.exercises.length - 4} outros exercícios
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* --- TAB: PLANNER --- */}
                <TabsContent value="planner" className="m-0 focus-visible:outline-none">
                    <WorkoutPlanBuilder />
                </TabsContent>

            </Tabs>
        </div>
    );
}