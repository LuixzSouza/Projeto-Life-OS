"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
        <div className="pb-24 animate-in fade-in duration-700">
            
            <Tabs defaultValue="dashboard" className="space-y-8">
                
                {/* Tabs Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <TabsList className="bg-muted/50 p-1 rounded-xl border border-border/50 self-start">
                        <TabsTrigger value="dashboard" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                            <LineChartIcon className="h-4 w-4" />
                            Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="planner" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                            <LayoutList className="h-4 w-4" />
                            Montar Ficha
                        </TabsTrigger>
                    </TabsList>

                    {/* Quick Add Button */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 font-medium">
                                <Plus className="mr-2 h-4 w-4" /> Registrar Sessão
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border-border shadow-2xl rounded-xl">
                            <div className="p-6 border-b border-border/40 bg-muted/10">
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Dumbbell className="h-5 w-5" />
                                    </div>
                                    Registrar Sessão
                                </DialogTitle>
                            </div>
                            <div className="p-6">
                                <GymForm />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* --- TAB: DASHBOARD --- */}
                <TabsContent value="dashboard" className="space-y-8 m-0">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* Left Column: Stats (4/12) */}
                        <div className="lg:col-span-4 space-y-6">
                            
                            {/* Volume Chart (FIXED COLORS) */}
                            <Card className="border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2 tracking-widest">
                                        <TrendingUp className="h-4 w-4 text-primary" /> Volume de Carga (kg)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-[250px] w-full pt-4">
                                    {volumeData.length > 1 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={volumeData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                                <defs>
                                                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                                                <XAxis 
                                                    dataKey="date" 
                                                    // FIX: Usando cor Hex fixa para garantir legibilidade
                                                    tick={{ fontSize: 11, fill: '#a1a1aa' }} 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tickMargin={12}
                                                />
                                                <YAxis 
                                                    // FIX: Usando cor Hex fixa para garantir legibilidade
                                                    tick={{ fontSize: 11, fill: '#a1a1aa' }} 
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
                                                                // FIX: Fundo escuro fixo e texto claro para garantir contraste
                                                                <div className="bg-zinc-900 text-zinc-50 text-xs p-3 rounded-lg shadow-xl border border-zinc-800">
                                                                    <p className="font-bold mb-1 text-zinc-100">{data.fullDate}</p>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                                                        <p className="text-primary font-bold text-sm">{data.load.toLocaleString()} kg</p>
                                                                    </div>
                                                                    <p className="text-zinc-400 max-w-[150px] truncate">{data.title}</p>
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
                                                    strokeWidth={3} 
                                                    fillOpacity={1} 
                                                    fill="url(#colorLoad)" 
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-3 bg-muted/5 rounded-lg border border-dashed border-border/50">
                                            <div className="p-3 bg-muted/30 rounded-full">
                                                <Activity className="h-6 w-6 text-muted-foreground/50" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">Sem dados suficientes</p>
                                                <p className="text-xs text-muted-foreground mt-1">Registre pelo menos 2 treinos.</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Muscle Frequency Card */}
                            <Card className="border-border/60 bg-card shadow-sm overflow-hidden">
                                <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                                    <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2">
                                        <BicepsFlexed className="h-4 w-4 text-primary" /> Foco do Atleta
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    {muscleDistribution.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic py-6 text-center">Nenhum foco registrado ainda.</p>
                                    ) : (
                                        muscleDistribution.slice(0, 5).map((item, i) => (
                                            <div key={item.name} className="flex items-center justify-between group cursor-default">
                                                <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border transition-all duration-300",
                                                        i === 0 
                                                            ? "bg-primary text-primary-foreground border-primary scale-110 shadow-sm" 
                                                            : "bg-muted text-muted-foreground border-border group-hover:border-primary/40"
                                                    )}>
                                                        {i === 0 ? <Trophy className="h-3 w-3" /> : i + 1}
                                                    </span>
                                                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{item.name}</span>
                                                </div>
                                                <Badge variant="secondary" className="bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                                    {item.value}x
                                                </Badge>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Feed (8/12) */}
                        <div className="lg:col-span-8 space-y-6">
                            
                            {/* Filter Chips */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setSelectedMuscle('ALL')}
                                    className={cn(
                                        "rounded-full px-4 h-8 text-xs font-medium border transition-all shadow-sm",
                                        selectedMuscle === 'ALL' 
                                            ? "bg-foreground text-background border-foreground hover:bg-foreground/90" 
                                            : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
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
                                            "rounded-full px-4 h-8 text-xs font-medium border transition-all whitespace-nowrap shadow-sm",
                                            selectedMuscle === m.name
                                                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                                                : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                                        )}
                                    >
                                        {m.name} <span className="ml-1.5 opacity-60 text-[10px]">({m.value})</span>
                                    </Button>
                                ))}
                            </div>

                            {/* Feed List */}
                            <div className="space-y-4">
                                {filteredWorkouts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-3xl bg-muted/5">
                                        <div className="p-4 bg-muted/30 rounded-full mb-3 ring-1 ring-border/50">
                                            <Dumbbell className="h-8 w-8 text-muted-foreground/50" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-foreground">Nenhum treino encontrado</h3>
                                        <p className="text-sm text-muted-foreground mt-1">Ajuste os filtros ou comece sua jornada hoje.</p>
                                    </div>
                                ) : (
                                    filteredWorkouts.map((w) => (
                                        <Card key={w.id} className="group relative overflow-hidden border-border/60 bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/50 group-hover:w-1.5 transition-all duration-300"></div>
                                            
                                            <CardContent className="p-5 pl-7">
                                                <div className="flex flex-col lg:flex-row gap-6">
                                                    
                                                    {/* Info Principal */}
                                                    <div className="flex-1 space-y-3 min-w-0">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div>
                                                                <h3 className="font-bold text-lg text-foreground truncate pr-2 group-hover:text-primary transition-colors">
                                                                    {w.title}
                                                                </h3>
                                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 font-medium">
                                                                    <span className="flex items-center gap-1.5 bg-muted/30 px-2 py-0.5 rounded-md">
                                                                        <Calendar className="h-3.5 w-3.5 text-primary/70" /> 
                                                                        {format(new Date(w.date), "dd MMM, HH:mm", { locale: ptBR })}
                                                                    </span>
                                                                    <span className="flex items-center gap-1.5 bg-muted/30 px-2 py-0.5 rounded-md">
                                                                        <Timer className="h-3.5 w-3.5 text-primary/70" /> 
                                                                        {w.duration} min
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Tags Musculares (Múltiplas) */}
                                                            <div className="flex flex-wrap justify-end gap-1 max-w-[120px]">
                                                                {(w.muscleGroup || "").split(", ").slice(0, 2).map((mg, i) => (
                                                                    <Badge key={i} variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-primary border-primary/20 bg-primary/5 px-2 py-0.5">
                                                                        {mg}
                                                                    </Badge>
                                                                ))}
                                                                {(w.muscleGroup || "").split(", ").length > 2 && (
                                                                    <Badge variant="outline" className="text-[10px] border-border bg-muted text-muted-foreground px-1.5">
                                                                        +{(w.muscleGroup || "").split(", ").length - 2}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {w.feeling && (
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/30 border border-border/50 text-xs font-medium text-muted-foreground w-fit">
                                                                <Flame className={cn("h-3.5 w-3.5", w.feeling === 'TIRED' ? 'text-amber-500' : w.feeling === 'HARD' ? 'text-red-500' : 'text-emerald-500')} />
                                                                {w.feeling === 'GOOD' ? 'Bom Desempenho' : w.feeling === 'TIRED' ? 'Cansativo' : w.feeling === 'HARD' ? 'Intenso' : w.feeling}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Lista de Exercícios */}
                                                    <div className="w-full lg:w-auto lg:min-w-[320px] border-t lg:border-t-0 lg:border-l border-border/40 pt-4 lg:pt-0 lg:pl-6">
                                                        <div className="space-y-2">
                                                            {w.exercises.slice(0, 4).map((ex, i) => (
                                                                <div key={i} className="flex justify-between items-center text-sm p-2 rounded-lg bg-muted/10 border border-transparent hover:border-primary/10 hover:bg-muted/30 transition-all">
                                                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors shrink-0"></div>
                                                                        <span className="font-medium text-foreground/90 truncate" title={ex.name}>
                                                                            {ex.name}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground shrink-0">
                                                                        <span className="opacity-70">{ex.sets}x{ex.reps}</span>
                                                                        {ex.weight && ex.weight !== "0" && (
                                                                            <span className="font-bold text-foreground bg-background px-1.5 py-0.5 rounded border border-border/50 shadow-sm">
                                                                                {ex.weight}kg
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {w.exercises.length > 4 && (
                                                                <p className="text-[10px] text-center text-muted-foreground font-medium py-1 cursor-default hover:text-primary transition-colors">
                                                                    +{w.exercises.length - 4} outros exercícios...
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
                {/* Altura ajustada para caber em telas diversas sem quebrar */}
                <TabsContent value="planner" className="m-0 min-h-[600px] h-[calc(100vh-200px)]">
                    <WorkoutPlanBuilder />
                </TabsContent>

            </Tabs>
        </div>
    );
}