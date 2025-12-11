"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
    BicepsFlexed, Timer, Calendar, TrendingUp, 
    Dumbbell, Plus, Activity, Flame 
} from "lucide-react";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GymForm } from "./gym-form";
import { cn } from "@/lib/utils";

// Tipos definidos baseados no JSON salvo no banco
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

    // --- ESTATÍSTICAS E CÁLCULOS ---
    
    // 1. Gráfico de Volume de Carga (Progressão)
    // Estimativa: Soma de (Peso * Séries * Reps) de todos exercícios do treino
    const volumeData = useMemo(() => {
        // Pega os últimos 10 treinos para o gráfico não ficar polusído
        return workouts.slice(0, 10).reverse().map(w => {
            let totalLoad = 0;
            w.exercises.forEach(ex => {
                const weight = parseFloat(ex.weight) || 0;
                const sets = parseFloat(ex.sets) || 0;
                const reps = parseFloat(ex.reps) || 0;
                // Cálculo básico de tonelagem
                totalLoad += (weight * sets * reps);
            });
            return {
                date: format(new Date(w.date), "dd/MM"),
                fullDate: format(new Date(w.date), "dd 'de' MMM"),
                load: totalLoad,
                title: w.title
            };
        });
    }, [workouts]);

    // 2. Frequência por Grupo Muscular (Heatmap Lógico)
    const muscleDistribution = useMemo(() => {
        const counts: Record<string, number> = {};
        workouts.forEach(w => {
            const group = w.muscleGroup || "Geral";
            counts[group] = (counts[group] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value); // Mais frequentes primeiro
    }, [workouts]);

    // 3. Filtragem do Feed
    const filteredWorkouts = selectedMuscle === 'ALL' 
        ? workouts 
        : workouts.filter(w => w.muscleGroup === selectedMuscle);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
            
            {/* --- COLUNA ESQUERDA: ESTATÍSTICAS E PROGRESSÃO (4/12) --- */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* Botão Novo Treino (Destaque) */}
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02]">
                            <Plus className="mr-2 h-5 w-5" /> Registrar Treino
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Ficha de Treino</DialogTitle>
                        </DialogHeader>
                        <GymForm />
                    </DialogContent>
                </Dialog>

                {/* Card de Grupos Musculares (Toplist) */}
                <Card className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2">
                            <BicepsFlexed className="h-4 w-4" /> Foco do Atleta
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-2">
                        {muscleDistribution.length === 0 ? (
                            <p className="text-xs text-zinc-500 italic">Sem dados suficientes.</p>
                        ) : (
                            muscleDistribution.slice(0, 5).map((item, i) => (
                                <div key={item.name} className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium">
                                        <span className={`
                                            w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border
                                            ${i === 0 ? 'bg-orange-500 text-white border-orange-600' : 'bg-white dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'}
                                        `}>
                                            {i + 1}
                                        </span>
                                        {item.name}
                                    </span>
                                    <Badge variant="secondary" className="bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shadow-sm border border-zinc-100 dark:border-zinc-700">
                                        {item.value}x
                                    </Badge>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Gráfico de Volume (Linha) */}
                <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-zinc-500 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-orange-500" /> Progressão de Carga
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[200px] w-full">
                        {volumeData.length > 1 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={volumeData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{ fontSize: 10, fill: '#a1a1aa' }} 
                                        axisLine={false} 
                                        tickLine={false} 
                                    />
                                    <Tooltip 
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-zinc-900 text-white text-xs p-2 rounded shadow-lg border border-zinc-800">
                                                        <p className="font-bold mb-1">{data.fullDate}</p>
                                                        <p className="text-orange-400 font-bold">{data.load.toLocaleString()} kg totais</p>
                                                        <p className="text-zinc-400 opacity-80">{data.title}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="load" 
                                        stroke="#ea580c" 
                                        strokeWidth={2} 
                                        dot={{ r: 3, fill: "#ea580c", strokeWidth: 0 }} 
                                        activeDot={{ r: 5, fill: "#fff", stroke: "#ea580c", strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-zinc-400 text-center px-4">
                                Registre pelo menos 2 treinos para ver sua evolução.
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>

            {/* --- COLUNA DIREITA: FEED DE TREINOS (8/12) --- */}
            <div className="lg:col-span-8 space-y-6">
                
                {/* Header do Feed (Filtros) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedMuscle('ALL')}
                        className={cn(
                            "rounded-full px-4 text-xs h-8 border",
                            selectedMuscle === 'ALL' 
                                ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black" 
                                : "bg-white dark:bg-zinc-900 text-zinc-600 border-zinc-200 dark:border-zinc-800"
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
                                "rounded-full px-4 text-xs h-8 border transition-all whitespace-nowrap",
                                selectedMuscle === m.name
                                    ? "bg-orange-600 text-white border-orange-600"
                                    : "bg-white dark:bg-zinc-900 text-zinc-600 border-zinc-200 dark:border-zinc-800 hover:border-orange-300"
                            )}
                        >
                            {m.name} <span className="ml-1.5 opacity-60 text-[10px]">{m.value}</span>
                        </Button>
                    ))}
                </div>

                {/* Lista de Cards */}
                <div className="grid gap-4">
                    {filteredWorkouts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50">
                            <Dumbbell className="h-10 w-10 text-zinc-300 mb-3" />
                            <p className="text-zinc-500 font-medium">Nenhum treino encontrado.</p>
                            <p className="text-xs text-zinc-400 mt-1">Ajuste o filtro ou registre um novo.</p>
                        </div>
                    ) : (
                        filteredWorkouts.map((w) => (
                            <Card key={w.id} className="group overflow-hidden hover:border-orange-300 dark:hover:border-orange-800 transition-all border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500 group-hover:w-2 transition-all"></div>
                                <CardContent className="p-5 pl-7">
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                                        
                                        {/* Info do Treino (Esquerda) */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-bold text-lg text-zinc-800 dark:text-white truncate leading-none">
                                                    {w.title}
                                                </h3>
                                                {w.muscleGroup && (
                                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-900 h-5">
                                                        {w.muscleGroup}
                                                    </Badge>
                                                )}
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5 text-zinc-400" /> 
                                                    {format(new Date(w.date), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Timer className="h-3.5 w-3.5 text-zinc-400" /> 
                                                    {w.duration} min
                                                </span>
                                                {w.feeling && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Activity className="h-3.5 w-3.5 text-zinc-400" /> 
                                                        {w.feeling === 'GOOD' ? 'Bom' : w.feeling === 'TIRED' ? 'Cansativo' : 'Intenso'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Lista de Exercícios (Direita - Grid Visual) */}
                                        <div className="w-full md:w-auto md:min-w-[280px]">
                                            <div className="space-y-2">
                                                {w.exercises.slice(0, 4).map((ex, i) => (
                                                    <div key={i} className="flex justify-between items-center text-sm bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0"></div>
                                                            <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[140px]" title={ex.name}>
                                                                {ex.name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs pl-2">
                                                            <span className="text-zinc-400 font-mono">{ex.sets}x{ex.reps}</span>
                                                            {ex.weight && <span className="font-bold text-zinc-800 dark:text-white bg-white dark:bg-black px-1.5 rounded shadow-sm">{ex.weight}kg</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                                {w.exercises.length > 4 && (
                                                    <p className="text-[10px] text-center text-zinc-400 font-medium py-1">
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
    );
}