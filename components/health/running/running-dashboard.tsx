"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
    Footprints, Timer, Calendar, TrendingUp, 
    MapPin, Plus, Zap, Trophy, Gauge, Activity, Clock
} from "lucide-react";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, YAxis } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RunForm } from "./run-form";
import { cn } from "@/lib/utils";

// --- TIPOS ---
interface RunWorkout {
    id: string;
    title: string;
    date: string;
    duration: number; // min
    distance: number | null; // km
    pace: string | null;
    feeling: string | null;
    notes: string | null;
}

// --- COMPONENTE PRINCIPAL ---
export function RunningDashboard({ runs }: { runs: RunWorkout[] }) {
    const [open, setOpen] = useState(false);

    // --- ESTATÍSTICAS ---
    
    // 1. Total Geral e Médias
    const totalKm = runs.reduce((acc, r) => acc + (r.distance || 0), 0);
    const totalRuns = runs.length;
    
    // Cálculo de Pace Médio Geral (Ponderado pela distância)
    const avgPace = useMemo(() => {
        if (totalRuns === 0 || totalKm === 0) return "0'00\"";
        
        // Pace = Tempo Total / Distância Total
        const totalDuration = runs.reduce((acc, r) => acc + r.duration, 0);
        const paceDecimal = totalDuration / totalKm;
        
        const pMin = Math.floor(paceDecimal);
        const pSec = Math.round((paceDecimal - pMin) * 60);
        return `${pMin}'${pSec.toString().padStart(2, '0')}"`;
    }, [runs, totalKm, totalRuns]);

    // 2. Melhor Corrida (Maior Distância)
    const bestRun = useMemo(() => {
        if (runs.length === 0) return null;
        return runs.reduce((prev, current) => (prev.distance || 0) > (current.distance || 0) ? prev : current);
    }, [runs]);

    // 3. Gráfico de Evolução (Distância nos últimos treinos)
    const chartData = useMemo(() => {
        return runs.slice(0, 10).reverse().map(r => ({
            date: format(new Date(r.date), "dd/MM"),
            fullDate: format(new Date(r.date), "d 'de' MMMM", { locale: ptBR }),
            km: r.distance || 0,
            pace: r.pace,
            title: r.title
        }));
    }, [runs]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 animate-in fade-in duration-500">
            
            {/* --- COLUNA ESQUERDA: KPIs e AÇÕES (4/12) --- */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* Botão Nova Corrida */}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]">
                            <Plus className="mr-2 h-5 w-5" /> Registrar Corrida
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Footprints className="h-5 w-5 text-blue-600" /> Nova Corrida
                            </DialogTitle>
                        </DialogHeader>
                        {/* Passamos onSuccess para fechar o modal automaticamente */}
                        <RunForm onSuccess={() => setOpen(false)} />
                    </DialogContent>
                </Dialog>

                {/* Card de Volume Total (Hero) */}
                <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-500 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-110 duration-700"></div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-xs font-bold text-blue-100 uppercase tracking-widest flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> Volume Acumulado
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-black tracking-tight">{totalKm.toFixed(1)}</span>
                            <span className="text-lg font-medium text-blue-100 opacity-80">km</span>
                        </div>
                        <div className="mt-4 flex gap-4 text-sm font-medium text-blue-50 bg-blue-800/30 p-2 rounded-lg border border-blue-500/30">
                            <div className="flex items-center gap-1.5"><Footprints className="h-4 w-4" /> {totalRuns} treinos</div>
                            <div className="w-px h-4 bg-blue-400/50"></div>
                            <div className="flex items-center gap-1.5"><Gauge className="h-4 w-4" /> {avgPace} /km (méd)</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Card de Recorde Pessoal (PR) */}
                <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden h-fit">
                    <div className="absolute left-0 top-0 w-1.5 h-full bg-yellow-500"></div>
                    <CardHeader className="pb-2 pl-6">
                        <CardTitle className="text-xs uppercase font-bold text-zinc-500 flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-yellow-500" /> Maior Distância
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pl-6">
                        {bestRun ? (
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-2xl font-black text-zinc-800 dark:text-zinc-100">
                                        {bestRun.distance} <span className="text-sm text-zinc-400 font-bold">km</span>
                                    </p>
                                    <p className="text-xs text-zinc-400 mt-1">{format(new Date(bestRun.date), "d 'de' MMMM, yyyy", { locale: ptBR })}</p>
                                </div>
                                <div className="text-right">
                                    <Badge variant="outline" className="text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 gap-1">
                                        PR 🏆
                                    </Badge>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-400 italic">Sem dados suficientes.</p>
                        )}
                    </CardContent>
                </Card>

            </div>

            {/* --- COLUNA DIREITA: GRÁFICOS E FEED (8/12) --- */}
            <div className="lg:col-span-8 space-y-6">
                
                {/* Gráfico de Evolução */}
                <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <CardHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <CardTitle className="text-xs uppercase font-bold text-zinc-500 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-blue-500" /> Performance Recente (10 Treinos)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] pt-4">
                        {chartData.length > 1 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorKm" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
                                    <XAxis dataKey="date" tick={{fontSize: 10, fill: '#a1a1aa'}} axisLine={false} tickLine={false} tickMargin={10} />
                                    <YAxis tick={{fontSize: 10, fill: '#a1a1aa'}} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}km`} />
                                    <Tooltip 
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-zinc-900 text-white text-xs p-3 rounded-lg shadow-xl border border-zinc-800">
                                                        <p className="font-bold mb-1 text-zinc-300">{data.fullDate}</p>
                                                        <div className="flex items-center gap-3">
                                                            <p className="text-blue-400 font-bold text-lg">{data.km} km</p>
                                                            {data.pace && <p className="text-zinc-400 font-mono text-xs border-l border-zinc-700 pl-2">Pace: {data.pace}</p>}
                                                        </div>
                                                        <p className="text-zinc-500 mt-1 italic max-w-[150px] truncate">{data.title}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="km" 
                                        stroke="#2563eb" 
                                        strokeWidth={3} 
                                        fillOpacity={1} 
                                        fill="url(#colorKm)" 
                                        activeDot={{ r: 6, fill: "#fff", stroke: "#2563eb", strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-sm gap-2">
                                <Activity className="h-8 w-8 opacity-20" />
                                <p>Registre pelo menos 2 treinos para ver o gráfico.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Lista de Corridas (Feed Detalhado) */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2 px-1">
                        <Footprints className="h-4 w-4" /> Histórico de Corridas
                    </h3>
                    
                    {runs.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50">
                            <Footprints className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
                            <p className="text-zinc-500 text-sm font-medium">Nenhuma corrida registrada.</p>
                            <p className="text-zinc-400 text-xs">Bora correr? 🏃‍♂️💨</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {runs.map(run => (
                                <RunCard key={run.id} run={run} />
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

// --- SUBCOMPONENTE: CARD DE CORRIDA ---
function RunCard({ run }: { run: RunWorkout }) {
    return (
        <div className="group bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-800 transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                
                {/* Info Principal */}
                <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900 transition-transform group-hover:scale-105">
                        <Footprints className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-zinc-800 dark:text-zinc-100 text-base">{run.title}</h4>
                        <div className="flex flex-wrap gap-3 text-xs text-zinc-500 mt-1">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {format(new Date(run.date), "dd MMM, HH:mm", { locale: ptBR })}
                            </span>
                            {run.feeling && (
                                <span className="flex items-center gap-1">
                                    <Activity className="h-3 w-3" /> {run.feeling === 'GOOD' ? 'Bom' : run.feeling === 'TIRED' ? 'Cansado' : 'Intenso'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Métricas (Grid) */}
                <div className="flex items-center gap-6 sm:text-right border-t sm:border-t-0 sm:border-l border-dashed border-zinc-100 dark:border-zinc-800 pt-3 sm:pt-0 sm:pl-6 justify-between sm:justify-end">
                    <div>
                        <p className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">Distância</p>
                        <p className="text-xl font-black text-blue-600 dark:text-blue-400">
                            {run.distance} <span className="text-xs text-zinc-400 font-medium">km</span>
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">Pace</p>
                        <p className="text-xl font-bold text-zinc-700 dark:text-zinc-200 font-mono">
                            {run.pace || "-"}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">Tempo</p>
                        <p className="text-lg font-medium text-zinc-600 dark:text-zinc-300">
                            {run.duration} <span className="text-xs">min</span>
                        </p>
                    </div>
                </div>

            </div>
            
            {/* Notas (Se houver) */}
            {run.notes && (
                <div className="mt-3 text-xs text-zinc-500 italic bg-zinc-50 dark:bg-zinc-950/50 p-2 rounded border border-zinc-100 dark:border-zinc-800 line-clamp-1 group-hover:line-clamp-none transition-all">
                    Obs: {run.notes}
                </div>
            )}
        </div>
    )
}