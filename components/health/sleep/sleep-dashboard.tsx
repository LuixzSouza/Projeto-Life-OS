"use client";

import { useState, useMemo } from "react";
import { format, subDays, isSameDay, parseISO, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Moon, Clock, Battery, BrainCircuit, Plus, Trash2, 
    TrendingUp, TrendingDown, BedDouble, Loader2, Zap 
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import { logMetric, deleteMetric } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Interface dos dados
interface SleepEntry {
    id: string;
    date: string; // ISO String
    value: number; // Horas
}

export function SleepDashboard({ data }: { data: SleepEntry[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const SLEEP_GOAL = 8; 

    // --- CÁLCULOS ESTATÍSTICOS ---
    
    // Média dos últimos 7 dias
    const last7Days = useMemo(() => {
        const end = new Date();
        const start = subDays(end, 6);
        return data.filter(d => {
            const date = parseISO(d.date);
            return date >= start && date <= end;
        });
    }, [data]);

    const averageSleep = useMemo(() => {
        if (last7Days.length === 0) return 0;
        const total = last7Days.reduce((acc, item) => acc + item.value, 0);
        return parseFloat((total / last7Days.length).toFixed(1));
    }, [last7Days]);

    // Dívida de Sono
    const sleepDebt = useMemo(() => {
        if (last7Days.length === 0) return 0;
        const totalNeeded = last7Days.length * SLEEP_GOAL;
        const totalSlept = last7Days.reduce((acc, item) => acc + item.value, 0);
        return parseFloat((totalNeeded - totalSlept).toFixed(1));
    }, [last7Days, SLEEP_GOAL]);

    // Dados do Gráfico
    const chartData = useMemo(() => {
        const end = new Date();
        const start = subDays(end, 13);
        const interval = eachDayOfInterval({ start, end });

        return interval.map(date => {
            const entry = data.find(d => isSameDay(parseISO(d.date), date));
            return {
                day: format(date, "dd/MM"),
                fullDate: format(date, "d 'de' MMMM", { locale: ptBR }),
                hours: entry ? entry.value : 0,
                quality: entry ? (entry.value >= 7 ? 'good' : 'bad') : 'none'
            };
        });
    }, [data]);

    // --- HANDLERS ---
    const handleSave = async (formData: FormData) => {
        setIsLoading(true);
        try {
            const hours = parseFloat(formData.get("value") as string);
            if (isNaN(hours) || hours <= 0 || hours > 24) {
                toast.error("Insira um valor válido entre 0 e 24 horas.");
                return;
            }
            await logMetric(formData);
            toast.success("Sono registrado com sucesso! 💤");
            setIsOpen(false);
        } catch (error) {
            toast.error("Erro ao salvar registro.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if(confirm("Remover este registro de sono?")) {
            await deleteMetric(id);
            toast.success("Registro removido.");
        }
    }

    // --- HELPERS VISUAIS ---
    const getQualityColor = (hours: number) => {
        if (hours >= 7 && hours <= 9) return "text-primary";
        if (hours >= 6) return "text-amber-500";
        return "text-destructive";
    };

    const getQualityBg = (hours: number) => {
        if (hours >= 7 && hours <= 9) return "bg-primary";
        if (hours >= 6) return "bg-amber-500";
        return "bg-destructive";
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-24">
            
            {/* --- 1. HERO SECTION (KPIs) --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Média Semanal */}
                <Card className="relative overflow-hidden border-border/60 bg-card shadow-sm h-full flex flex-col justify-between group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" /> Média (7 dias)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-5xl font-black tracking-tighter text-foreground">
                                {averageSleep}
                            </span>
                            <span className="text-xl font-bold text-muted-foreground">h</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn(
                                "border-transparent bg-muted/50 text-muted-foreground",
                                averageSleep >= SLEEP_GOAL ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            )}>
                                {averageSleep >= SLEEP_GOAL ? (
                                    <><TrendingUp className="h-3 w-3 mr-1" /> Na meta</>
                                ) : (
                                    <><TrendingDown className="h-3 w-3 mr-1" /> Abaixo</>
                                )}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-medium">Meta: {SLEEP_GOAL}h</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Dívida de Sono */}
                <Card className="relative overflow-hidden border-border/60 bg-card shadow-sm h-full flex flex-col justify-between">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Battery className="h-4 w-4 text-primary" /> Banco de Sono
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-1 mb-4">
                            <span className={cn("text-5xl font-black tracking-tighter", sleepDebt > 0 ? "text-destructive" : "text-emerald-500")}>
                                {sleepDebt > 0 ? `-${sleepDebt}` : `+${Math.abs(sleepDebt)}`}
                            </span>
                            <span className="text-xl font-bold text-muted-foreground">h</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-tight max-w-[200px]">
                            {sleepDebt > 2 
                                ? "Déficit acumulado. Tente dormir mais cedo para recuperar." 
                                : "Balanço positivo. Ótima recuperação!"}
                        </p>
                    </CardContent>
                </Card>

                {/* CTA: Registrar */}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Card className="bg-primary hover:bg-primary/90 border-primary text-primary-foreground shadow-lg shadow-primary/20 flex flex-col justify-center items-center text-center p-6 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] h-full">
                            <div className="bg-background/20 p-4 rounded-full mb-3 backdrop-blur-sm shadow-inner">
                                <Plus className="h-8 w-8 text-primary-foreground" />
                            </div>
                            <h3 className="font-bold text-xl">Registrar Noite</h3>
                            <p className="text-primary-foreground/80 text-sm mt-1 font-medium">Adicionar dados de hoje</p>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[400px] bg-background border-border shadow-2xl rounded-xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Moon className="h-5 w-5" /> 
                                </div>
                                Registrar Sono
                            </DialogTitle>
                        </DialogHeader>
                        <form action={handleSave} className="space-y-6 py-4">
                            <input type="hidden" name="type" value="SLEEP" />
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Duração (Horas)</Label>
                                    <div className="relative">
                                        <Input 
                                            name="value" 
                                            type="number" 
                                            step="0.1" 
                                            placeholder="0.0" 
                                            className="h-14 text-3xl font-bold pl-4 pr-12 bg-muted/20 border-border/50 focus-visible:ring-primary/30"
                                            autoFocus
                                            required
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">h</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                                    <BedDouble className="h-5 w-5 text-primary" />
                                    <p className="text-xs text-muted-foreground leading-snug">
                                        Dica: A maioria dos adultos precisa de 7 a 9 horas para recuperação ideal.
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Salvar Registro"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* --- 2. GRÁFICO DE TENDÊNCIA --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-border/60 bg-card shadow-sm">
                    <CardHeader className="pb-2 border-b border-border/40 bg-muted/20">
                        <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2 py-1">
                            <TrendingUp className="h-4 w-4 text-primary" /> Tendência (14 Dias)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                <XAxis 
                                    dataKey="day" 
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tickMargin={10}
                                />
                                <YAxis 
                                    domain={[0, 12]} 
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                                    axisLine={false} 
                                    tickLine={false}
                                    tickFormatter={(v) => `${v}h`}
                                />
                                <Tooltip 
                                    cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-popover text-popover-foreground text-xs p-3 rounded-xl shadow-xl border border-border">
                                                    <p className="font-bold mb-1 text-foreground">{data.fullDate}</p>
                                                    <div className="flex items-center gap-2">
                                                        <Moon className="h-3 w-3 text-primary" />
                                                        <span className="text-lg font-bold text-primary">{data.hours}h</span>
                                                    </div>
                                                    <p className={cn("mt-1 font-medium", data.hours >= 7 ? "text-emerald-500" : "text-destructive")}>
                                                        {data.hours >= 7 ? 'Descanso Ideal' : 'Abaixo da meta'}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <ReferenceLine y={8} stroke="hsl(var(--primary))" strokeDasharray="3 3" strokeOpacity={0.5} label={{ position: 'right', value: 'Meta', fill: 'hsl(var(--primary))', fontSize: 10 }} />
                                <Area 
                                    type="monotone" 
                                    dataKey="hours" 
                                    stroke="hsl(var(--primary))" 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill="url(#colorSleep)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* --- 3. INSIGHTS E HISTÓRICO --- */}
                <div className="space-y-6 flex flex-col h-full">
                    
                    {/* Insight Card */}
                    <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs uppercase font-bold text-primary flex items-center gap-2">
                                <BrainCircuit className="h-4 w-4" /> Coach Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {averageSleep >= 7 
                                    ? "Excelente consistência! Manter esse ritmo otimiza a recuperação neural e performance física."
                                    : averageSleep >= 5
                                        ? "Dormindo menos que o ideal. Considere limitar telas 30min antes de deitar para melhorar a latência."
                                        : "Atenção: Média crítica. Priorize o sono hoje para evitar fadiga crônica e queda imunológica."
                                }
                            </p>
                        </CardContent>
                    </Card>

                    {/* Histórico Recente */}
                    <Card className="flex-1 border-border/60 bg-card shadow-sm flex flex-col overflow-hidden">
                        <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                            <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
                                Histórico Recente
                            </CardTitle>
                        </CardHeader>
                        <ScrollArea className="flex-1">
                            <div className="divide-y divide-border/40">
                                {data.slice().reverse().map((entry) => {
                                    const parsedDate = parseISO(entry.date);
                                    return (
                                        <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-1 h-8 rounded-full", getQualityBg(entry.value))}></div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground capitalize">
                                                        {format(parsedDate, "EEEE", { locale: ptBR })}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {format(parsedDate, "d 'de' MMM")}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={cn("font-mono font-bold text-lg", getQualityColor(entry.value))}>
                                                    {entry.value}h
                                                </span>
                                                <button 
                                                    onClick={() => handleDelete(entry.id)}
                                                    className="text-muted-foreground/50 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                                {data.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm opacity-60">
                                        <Zap className="h-6 w-6 mb-2" />
                                        Sem registros recentes.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </Card>
                </div>
            </div>
        </div>
    );
}