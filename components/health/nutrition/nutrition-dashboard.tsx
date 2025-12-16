"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, subDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
    TrendingUp, TrendingDown, Target, Zap, 
    Calendar as CalendarIcon, ArrowRight
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, Cell, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { FoodLogger } from "./food-logger"; // Reutilizando o componente poderoso
import { Meal } from "@prisma/client";

// --- Interfaces ---
interface SerializedMeal {
    id: string;
    title: string;
    items: string;
    calories: number | null;
    type: string;
    date: string; 
}

interface SerializedWeekData {
    date: string; 
    calories: number | null;
    type: string;
}

interface NutritionDashboardProps {
    initialDate: string; 
    meals: SerializedMeal[];
    weekData: SerializedWeekData[];
}

export function NutritionDashboard({ initialDate, meals, weekData }: NutritionDashboardProps) {
    const router = useRouter();
    const [date, setDate] = useState<Date | undefined>(new Date(initialDate));
    
    // Converte SerializedMeal para Meal (Prisma) para passar pro FoodLogger
    const prismaMeals = useMemo(() => meals.map(m => ({
        ...m,
        date: new Date(m.date), // ✅ CORREÇÃO 1: Converte string para Date
        calories: m.calories || 0,
        items: m.items || "",
        createdAt: new Date(), 
        updatedAt: new Date(), 
        userId: "user",        
        protein: null, 
        carbs: null, 
        fat: null 
    } as unknown as Meal)), [meals]); // ✅ CORREÇÃO 2: 'as unknown' satisfaz o compilador

    // --- CÁLCULOS DO DIA ---
    const totalCalories = meals.reduce((acc, m) => acc + (m.calories || 0), 0);
    const dailyGoal = 2500; 
    const balance = dailyGoal - totalCalories;
    const isOver = balance < 0;

    // --- CÁLCULOS DA SEMANA ---
    const weeklyAverage = useMemo(() => {
        const total = weekData.reduce((acc, d) => acc + (d.calories || 0), 0);
        return Math.round(total / 7);
    }, [weekData]);

    const deviation = totalCalories - weeklyAverage;

    // --- DADOS DO GRÁFICO ---
    const chartData = useMemo(() => {
        const currentSelectedDate = new Date(initialDate); 
        return Array.from({ length: 7 }).map((_, i) => {
            const d = subDays(currentSelectedDate, 6 - i);
            const daysMeals = weekData.filter(m => isSameDay(new Date(m.date), d));
            const cals = daysMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
            
            return {
                day: format(d, "EEE", { locale: ptBR }),
                fullDate: format(d, "dd 'de' MMM", { locale: ptBR }),
                calories: cals,
                isCurrent: isSameDay(d, currentSelectedDate),
                isOverGoal: cals > dailyGoal
            };
        });
    }, [initialDate, weekData, dailyGoal]);

    const handleDateSelect = (newDate: Date | undefined) => {
        if (newDate) {
            setDate(newDate);
            router.push(`/health/nutrition?date=${format(newDate, 'yyyy-MM-dd')}`);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-24 animate-in fade-in duration-700">
            
            {/* --- COLUNA ESQUERDA: NAVEGAÇÃO & ANALYTICS (4/12) --- */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* Calendário */}
                <Card className="border-border/60 bg-card shadow-sm overflow-hidden">
                    <CardHeader className="pb-0 border-b border-border/40 bg-muted/20">
                        <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2 py-2">
                            <CalendarIcon className="h-4 w-4 text-primary" /> Navegação
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDateSelect}
                            locale={ptBR}
                            className="rounded-md border-0"
                            classNames={{
                                head_cell: "text-muted-foreground font-normal text-[0.8rem]",
                                cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary/5 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/10 rounded-md transition-colors",
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                day_today: "bg-muted text-foreground",
                            }}
                            modifiers={{
                                hasData: (d) => weekData.some(w => isSameDay(new Date(w.date), d))
                            }}
                            modifiersStyles={{
                                hasData: { fontWeight: 'bold', textDecoration: 'underline decoration-primary decoration-2 underline-offset-4' }
                            }}
                        />
                    </CardContent>
                </Card>

                {/* Gráfico Semanal */}
                <Card className="border-border/60 bg-card shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" /> Tendência Semanal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[200px] w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -25 }}>
                                <XAxis 
                                    dataKey="day" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                                    dy={10}
                                />
                                <YAxis 
                                    hide 
                                />
                                <Tooltip 
                                    cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-popover text-popover-foreground text-xs p-2.5 rounded-lg shadow-xl border border-border">
                                                    <p className="font-bold mb-1">{data.fullDate}</p>
                                                    <p className={cn("font-bold text-sm", data.isOverGoal ? "text-destructive" : "text-primary")}>
                                                        {data.calories} kcal
                                                    </p>
                                                    <p className="text-muted-foreground text-[10px]">Meta: {dailyGoal}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="calories" radius={[4, 4, 4, 4]} barSize={20}>
                                    {chartData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.isCurrent ? 'hsl(var(--primary))' : entry.isOverGoal ? 'hsl(var(--destructive)/0.4)' : 'hsl(var(--muted))'} 
                                            className="transition-all hover:opacity-80"
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Comparativo Média */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-muted/30 border-border/60 shadow-sm">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Média 7 Dias</span>
                            <span className="text-2xl font-black text-foreground">{weeklyAverage}</span>
                            <span className="text-xs text-muted-foreground">kcal/dia</span>
                        </CardContent>
                    </Card>
                    <Card className={cn("border-border/60 shadow-sm", deviation > 0 ? "bg-destructive/5 border-destructive/20" : "bg-emerald-500/5 border-emerald-500/20")}>
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Desvio Hoje</span>
                            <div className="flex items-center gap-1">
                                {deviation > 0 ? <TrendingUp className="h-4 w-4 text-destructive" /> : <TrendingDown className="h-4 w-4 text-emerald-500" />}
                                <span className={cn("text-2xl font-black", deviation > 0 ? "text-destructive" : "text-emerald-500")}>
                                    {Math.abs(deviation)}
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground">kcal da média</span>
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* --- COLUNA DIREITA: FEED E REGISTRO (8/12) --- */}
            <div className="lg:col-span-8 flex flex-col h-full space-y-6">
                
                {/* Resumo Rápido do Dia */}
                <Card className="border-border/60 bg-gradient-to-r from-card to-muted/20 shadow-sm">
                    <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className={cn("p-3 rounded-full", isOver ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500")}>
                                <Target className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Saldo Calórico</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className={cn("text-3xl font-black tracking-tight", isOver ? "text-destructive" : "text-emerald-500")}>
                                        {isOver ? `+${Math.abs(balance)}` : balance}
                                    </h2>
                                    <span className="text-sm font-medium text-foreground">kcal {isOver ? "excedentes" : "restantes"}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-8 text-right">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Consumido</p>
                                <p className="text-xl font-bold text-foreground">{totalCalories}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Meta</p>
                                <p className="text-xl font-bold text-muted-foreground">{dailyGoal}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Food Logger Completo */}
                <div className="flex-1 min-h-[500px]">
                    <FoodLogger meals={prismaMeals} />
                </div>

            </div>
        </div>
    );
}