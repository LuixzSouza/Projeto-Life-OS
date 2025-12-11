"use client";

import { useState, useMemo } from "react";
import { format, subDays, isSameDay, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Moon, Clock, Battery, BrainCircuit, Plus, Trash2, 
    TrendingUp, TrendingDown, AlertCircle, CheckCircle2, BedDouble 
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import { logMetric, deleteMetric } from "@/app/(dashboard)/health/actions"; // Reutilizando suas actions existentes
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Interface dos dados
interface SleepEntry {
    id: string;
    date: string; // ISO
    value: number; // Horas
}

export function SleepDashboard({ data }: { data: SleepEntry[] }) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Meta de sono (Idealmente viria do banco de dados do usuário)
    const SLEEP_GOAL = 8; 

    // --- CÁLCULOS E ESTATÍSTICAS ---
    
    // 1. Média dos últimos 7 dias
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

    // 2. Dívida de Sono (Sleep Debt) na semana
    // Diferença entre o que deveria ter dormido (7 * Meta) e o real
    const sleepDebt = useMemo(() => {
        // Consideramos apenas dias que têm registro para ser justo
        if (last7Days.length === 0) return 0;
        const totalNeeded = last7Days.length * SLEEP_GOAL;
        const totalSlept = last7Days.reduce((acc, item) => acc + item.value, 0);
        return parseFloat((totalNeeded - totalSlept).toFixed(1));
    }, [last7Days, SLEEP_GOAL]);

    // 3. Preparar dados para o gráfico (Preenchendo dias vazios com 0)
    const chartData = useMemo(() => {
        const end = new Date();
        const start = subDays(end, 13); // Últimos 14 dias
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
        const hours = parseFloat(formData.get("value") as string);
        if (isNaN(hours) || hours < 0 || hours > 24) {
            toast.error("Insira um valor válido entre 0 e 24 horas.");
            return;
        }

        await logMetric(formData);
        toast.success("Sono registrado com sucesso! 💤");
        setIsOpen(false);
    };

    const handleDelete = async (id: string) => {
        if(confirm("Remover este registro de sono?")) {
            await deleteMetric(id);
            toast.success("Registro removido.");
        }
    }

    // --- UI HELPERS ---
    const getQualityColor = (hours: number) => {
        if (hours >= 7 && hours <= 9) return "text-emerald-500";
        if (hours >= 6) return "text-yellow-500";
        return "text-red-500";
    };

    const getQualityBg = (hours: number) => {
        if (hours >= 7 && hours <= 9) return "bg-emerald-500";
        if (hours >= 6) return "bg-yellow-500";
        return "bg-red-500";
    };

    return (
        <div className="space-y-6 pb-20">
            
            {/* 1. HERO SECTION (KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Média Semanal */}
                <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Média (7 dias)</p>
                                <h2 className="text-4xl font-black text-zinc-900 dark:text-white flex items-baseline gap-1">
                                    {averageSleep}
                                    <span className="text-base font-medium text-zinc-400">h</span>
                                </h2>
                            </div>
                            <div className={`p-3 rounded-full ${averageSleep >= 7 ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                                <Clock className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            {averageSleep >= SLEEP_GOAL ? (
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                    <TrendingUp className="h-3 w-3 mr-1" /> Na meta
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                                    <TrendingDown className="h-3 w-3 mr-1" /> Abaixo da meta
                                </Badge>
                            )}
                            <span className="text-xs text-zinc-400">Meta: {SLEEP_GOAL}h</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Dívida de Sono */}
                <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                    <div className={cn(
                        "absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-colors",
                        sleepDebt > 2 ? "bg-red-500/20" : "bg-emerald-500/20"
                    )}></div>
                    <CardContent className="p-6 relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Dívida de Sono</p>
                                <h2 className={cn("text-4xl font-black flex items-baseline gap-1", sleepDebt > 0 ? "text-red-500" : "text-emerald-500")}>
                                    {sleepDebt > 0 ? `-${sleepDebt}` : `+${Math.abs(sleepDebt)}`}
                                    <span className="text-base font-medium text-zinc-400">h</span>
                                </h2>
                            </div>
                            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400">
                                <Battery className="h-6 w-6" />
                            </div>
                        </div>
                        <p className="text-xs text-zinc-500 mt-4 leading-tight">
                            {sleepDebt > 2 
                                ? "Você precisa recuperar sono. Tente dormir mais cedo hoje." 
                                : "Seu banco de sono está positivo ou equilibrado. Ótimo!"}
                        </p>
                    </CardContent>
                </Card>

                {/* Botão de Ação / Próxima Meta */}
                <Card className="bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/20 text-white flex flex-col justify-center items-center text-center p-6 cursor-pointer hover:bg-indigo-700 transition-colors" onClick={() => setIsOpen(true)}>
                    <div className="bg-white/20 p-4 rounded-full mb-3 backdrop-blur-sm">
                        <Plus className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg">Registrar Noite</h3>
                    <p className="text-indigo-100 text-xs mt-1">Adicione os dados de hoje</p>
                </Card>
            </div>

            {/* 2. GRÁFICO PRINCIPAL */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Moon className="h-4 w-4 text-indigo-500" /> Tendência de Sono (14 Dias)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
                                <XAxis 
                                    dataKey="day" 
                                    tick={{ fontSize: 12, fill: '#71717a' }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tickMargin={10}
                                />
                                <YAxis 
                                    domain={[0, 12]} 
                                    tick={{ fontSize: 12, fill: '#71717a' }} 
                                    axisLine={false} 
                                    tickLine={false}
                                    tickFormatter={(v) => `${v}h`}
                                />
                                <Tooltip 
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-zinc-900 text-white text-xs p-3 rounded-xl shadow-xl border border-zinc-800">
                                                    <p className="font-bold mb-1 text-zinc-300">{data.fullDate}</p>
                                                    <p className="text-lg font-bold flex items-center gap-2">
                                                        <Moon className="h-3 w-3 text-indigo-400" />
                                                        {data.hours} horas
                                                    </p>
                                                    <p className={`mt-1 font-medium ${data.hours >= 7 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {data.hours >= 7 ? 'Descanso Ideal' : 'Abaixo da meta'}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                {/* Linha de Meta */}
                                <ReferenceLine y={8} stroke="red" strokeDasharray="3 3" />
                                
                                <Area 
                                    type="monotone" 
                                    dataKey="hours" 
                                    stroke="#6366f1" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorSleep)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* 3. INSIGHTS E HISTÓRICO RECENTE */}
                <div className="space-y-6">
                    
                    {/* Insight Card */}
                    <Card className="bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs uppercase font-bold text-indigo-500 flex items-center gap-2">
                                <BrainCircuit className="h-4 w-4" /> Análise do Coach
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                {averageSleep >= 7 
                                    ? "Sua consistência está excelente! Manter esse ritmo vai melhorar sua memória, foco e recuperação muscular."
                                    : averageSleep >= 5
                                        ? "Você está dormindo um pouco menos do que o ideal. Tente criar uma rotina de 'higiene do sono' 30 minutos antes de deitar."
                                        : "Atenção crítica: Sua média está muito baixa. Priorize o sono hoje para evitar burnout e queda de imunidade."
                                }
                            </p>
                        </CardContent>
                    </Card>

                    {/* Histórico Recente (Lista) */}
                    <Card className="flex-1 border-zinc-200 dark:border-zinc-800">
                        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                            <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                Últimos Registros
                            </CardTitle>
                        </CardHeader>
                        <ScrollArea className="h-[250px]">
                            <div className="p-0">
                                {data.slice().reverse().map((entry) => {
                                    const parsedDate = parseISO(entry.date);
                                    return (
                                        <div key={entry.id} className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-1.5 h-10 rounded-full", getQualityBg(entry.value))}></div>
                                                <div>
                                                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                                        {format(parsedDate, "EEEE", { locale: ptBR })}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">
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
                                                    className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </Card>
                </div>
            </div>

            {/* MODAL DE REGISTRO */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Moon className="h-5 w-5 text-indigo-500" /> Registrar Sono
                        </DialogTitle>
                    </DialogHeader>
                    
                    <form action={handleSave} className="space-y-6 py-4">
                        <input type="hidden" name="type" value="SLEEP" />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-zinc-500">Qualidade (Auto)</Label>
                                <div className="h-10 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center px-3 text-sm text-zinc-500">
                                    Baseado nas horas
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-zinc-500">Duração</Label>
                                <div className="relative">
                                    <Input 
                                        name="value" 
                                        type="number" 
                                        step="0.1" 
                                        placeholder="0.0" 
                                        className="h-10 text-lg font-bold pl-3 pr-10"
                                        autoFocus
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-400">h</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg flex gap-3 items-start">
                            <BedDouble className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-snug">
                                Dica: A maioria dos adultos precisa de 7 a 9 horas. Tente manter horários consistentes.
                            </p>
                        </div>

                        <DialogFooter>
                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11">
                                Salvar Registro
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}