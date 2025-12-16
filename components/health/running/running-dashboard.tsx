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

// --- Tipagem Estrita ---
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

export function RunningDashboard({ runs }: { runs: RunWorkout[] }) {
    const [open, setOpen] = useState(false);

    // --- CÁLCULOS ESTATÍSTICOS ---
    
    const totalKm = runs.reduce((acc, r) => acc + (r.distance || 0), 0);
    const totalRuns = runs.length;
    
    // Pace Médio Geral
    const avgPace = useMemo(() => {
        if (totalRuns === 0 || totalKm === 0) return "0'00\"";
        const totalDuration = runs.reduce((acc, r) => acc + r.duration, 0);
        const paceDecimal = totalDuration / totalKm;
        const pMin = Math.floor(paceDecimal);
        const pSec = Math.round((paceDecimal - pMin) * 60);
        return `${pMin}'${pSec.toString().padStart(2, '0')}"`;
    }, [runs, totalKm, totalRuns]);

    // Recorde Pessoal (Distância)
    const bestRun = useMemo(() => {
        if (runs.length === 0) return null;
        return runs.reduce((prev, current) => (prev.distance || 0) > (current.distance || 0) ? prev : current);
    }, [runs]);

    // Dados do Gráfico
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-24 animate-in fade-in duration-700">
            
            {/* --- COLUNA ESQUERDA: HERO & KPIS (4/12) --- */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* CTA Principal */}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 hover:to-primary active:scale-[0.98] transition-all">
                            <Plus className="mr-2 h-6 w-6" /> Registrar Corrida
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg p-0 gap-0 bg-background border-border shadow-2xl rounded-xl overflow-hidden">
                        <div className="p-6 border-b border-border/40 bg-muted/10">
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Footprints className="h-5 w-5" />
                                </div>
                                Nova Corrida
                            </DialogTitle>
                        </div>
                        <div className="p-6">
                            <RunForm onSuccess={() => setOpen(false)} />
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Card de Volume Total (Hero) */}
                <Card className="relative overflow-hidden border-border/60 bg-card shadow-lg group">
                    {/* Background Decorativo */}
                    <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transition-opacity group-hover:opacity-80" />
                    
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                                <MapPin className="h-3.5 w-3.5" />
                            </div>
                            Volume Acumulado
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 pt-4">
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-6xl font-black tracking-tighter text-foreground">
                                {totalKm.toFixed(1)}
                            </span>
                            <span className="text-xl font-bold text-muted-foreground">km</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-muted/30 p-3 rounded-xl border border-border/50 flex flex-col justify-center">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold uppercase mb-1">
                                    <Footprints className="h-3.5 w-3.5" /> Treinos
                                </div>
                                <span className="text-xl font-bold text-foreground">{totalRuns}</span>
                            </div>
                            <div className="bg-muted/30 p-3 rounded-xl border border-border/50 flex flex-col justify-center">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold uppercase mb-1">
                                    <Gauge className="h-3.5 w-3.5" /> Pace Médio
                                </div>
                                <span className="text-xl font-bold text-foreground font-mono">{avgPace}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Card de Recorde Pessoal (PR) */}
                <Card className="border-border/60 bg-card shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-1 h-full bg-amber-500"></div>
                    <CardHeader className="pb-2 pl-6">
                        <CardTitle className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2 tracking-widest">
                            <Trophy className="h-4 w-4 text-amber-500" /> Maior Distância
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pl-6 pt-2">
                        {bestRun ? (
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-foreground tracking-tight">
                                            {bestRun.distance}
                                        </span>
                                        <span className="text-sm font-bold text-muted-foreground">km</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                                        {format(new Date(bestRun.date), "d 'de' MMMM, yyyy", { locale: ptBR })}
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-amber-600 border-amber-200 bg-amber-500/10 px-2 py-0.5 mb-1">
                                    PR Record
                                </Badge>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic py-2">Sem dados suficientes.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* --- COLUNA DIREITA: GRÁFICOS E FEED (8/12) --- */}
            <div className="lg:col-span-8 space-y-6">
                
                {/* Gráfico de Evolução */}
                <Card className="border-border/60 bg-card shadow-sm">
                    <CardHeader className="pb-2 border-b border-border/40 bg-muted/20">
                        <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2 py-1">
                            <TrendingUp className="h-4 w-4 text-primary" /> Performance Recente (10 Treinos)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[280px] w-full pt-6">
                        {chartData.length > 1 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorKm" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
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
                                        tickFormatter={(val) => `${val}km`} 
                                    />
                                    <Tooltip 
                                        cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-popover text-popover-foreground text-xs p-3 rounded-xl shadow-xl border border-border">
                                                        <p className="font-bold mb-1 text-foreground">{data.fullDate}</p>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                                                            <p className="text-primary font-bold text-lg">{data.km} km</p>
                                                        </div>
                                                        {data.pace && (
                                                            <p className="text-muted-foreground font-mono pl-3 border-l-2 border-border">
                                                                Pace: {data.pace}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="km" 
                                        stroke="hsl(var(--primary))" 
                                        strokeWidth={3} 
                                        fillOpacity={1} 
                                        fill="url(#colorKm)" 
                                        activeDot={{ r: 6, fill: "hsl(var(--background))", stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-2">
                                <Activity className="h-8 w-8 text-muted-foreground/30" />
                                <p className="text-xs text-muted-foreground">Registre mais corridas para visualizar seu progresso.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Lista de Corridas (Feed) */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Footprints className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">Histórico de Corridas</h3>
                    </div>
                    
                    {runs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border rounded-3xl bg-muted/10">
                            <div className="p-4 bg-muted/30 rounded-full mb-3">
                                <Footprints className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">Nenhuma corrida registrada</h3>
                            <p className="text-sm text-muted-foreground mt-1">Bora correr? 🏃‍♂️💨</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
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

// --- SUBCOMPONENTES ---

function RunCard({ run }: { run: RunWorkout }) {
    return (
        <Card className="group border-border/60 bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300">
            <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6">
                    
                    {/* Info Principal */}
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 transition-colors group-hover:bg-primary/20">
                            <Footprints className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-foreground text-base truncate pr-2">{run.title}</h4>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1 font-medium">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-primary/70" /> 
                                    {format(new Date(run.date), "dd MMM, HH:mm", { locale: ptBR })}
                                </span>
                                {run.feeling && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-border" />
                                        <span className="flex items-center gap-1.5">
                                            <Activity className="h-3.5 w-3.5 text-primary/70" /> 
                                            {run.feeling === 'GOOD' ? 'Bom' : run.feeling === 'TIRED' ? 'Cansado' : 'Intenso'}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Métricas (Grid Compacto) */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 border-t sm:border-t-0 sm:border-l border-border/60 pt-4 sm:pt-0 sm:pl-8">
                        <div className="text-center sm:text-right">
                            <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-0.5">Distância</p>
                            <div className="flex items-baseline justify-center sm:justify-end gap-1">
                                <span className="text-xl font-black text-primary">{run.distance}</span>
                                <span className="text-xs font-bold text-muted-foreground">km</span>
                            </div>
                        </div>
                        <div className="text-center sm:text-right">
                            <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-0.5">Pace</p>
                            <p className="text-xl font-bold text-foreground font-mono tracking-tight">
                                {run.pace || "-"}
                            </p>
                        </div>
                        <div className="text-center sm:text-right">
                            <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-0.5">Tempo</p>
                            <div className="flex items-baseline justify-center sm:justify-end gap-1">
                                <span className="text-lg font-bold text-foreground">{run.duration}</span>
                                <span className="text-xs font-medium text-muted-foreground">min</span>
                            </div>
                        </div>
                    </div>

                </div>
            </CardContent>
        </Card>
    )
}