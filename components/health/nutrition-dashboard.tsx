"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, subDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
    TrendingUp, Calendar as CalendarIcon, Target, Trophy, 
    Leaf, Pizza, Coffee, Flame, AlertCircle, 
    Filter, LayoutList, LayoutGrid, ArrowRight
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, Cell, XAxis } from "recharts";
import { cn } from "@/lib/utils";

// Interfaces para os dados serializados
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
    
    // Novos Estados de UI
    const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
    const [filterType, setFilterType] = useState<'ALL' | 'HEALTHY' | 'TRASH'>('ALL');

    // --- CÁLCULOS DO DIA ---
    const totalCalories = meals.reduce((acc, m) => acc + (m.calories || 0), 0);
    const dailyGoal = 2500; 
    
    // Filtragem Local (Client-Side)
    const filteredMeals = useMemo(() => {
        if (filterType === 'ALL') return meals;
        return meals.filter(m => m.type === filterType);
    }, [meals, filterType]);

    // Contagens para Estatísticas
    const healthyCount = meals.filter(m => m.type === 'HEALTHY').length;
    const trashCount = meals.filter(m => m.type === 'TRASH').length;
    
    // Score de Qualidade (0 a 100)
    const qualityScore = useMemo(() => {
        if (meals.length === 0) return 0;
        const totalPoints = (healthyCount * 10) + (meals.filter(m => m.type === 'NEUTRAL').length * 5);
        const maxPoints = meals.length * 10;
        return Math.round((totalPoints / maxPoints) * 100);
    }, [meals.length, healthyCount, meals]);

    // Média Semanal (Para Comparação)
    const weeklyAverage = useMemo(() => {
        const total = weekData.reduce((acc, d) => acc + (d.calories || 0), 0);
        return Math.round(total / 7);
    }, [weekData]);

    const deviation = totalCalories - weeklyAverage; // Diferença do dia para a média

    // --- GRÁFICO SEMANAL ---
    const chartData = useMemo(() => {
        const currentSelectedDate = new Date(initialDate); 
        return Array.from({ length: 7 }).map((_, i) => {
            const d = subDays(currentSelectedDate, 6 - i);
            const daysMeals = weekData.filter(m => isSameDay(new Date(m.date), d));
            const cals = daysMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
            
            return {
                day: format(d, "EEE", { locale: ptBR }),
                calories: cals,
                isCurrent: isSameDay(d, currentSelectedDate)
            };
        });
    }, [initialDate, weekData]);

    const handleDateSelect = (newDate: Date | undefined) => {
        if (newDate) {
            setDate(newDate);
            router.push(`/health/nutrition?date=${format(newDate, 'yyyy-MM-dd')}`);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
            
            {/* --- COLUNA ESQUERDA: NAVEGAÇÃO & ANÁLISE MACRO (3/12) --- */}
            <div className="lg:col-span-3 space-y-6">
                
                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                    <CardContent className="p-3 flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDateSelect}
                            locale={ptBR}
                            className="rounded-md"
                            modifiers={{
                                hasData: (d) => weekData.some(w => isSameDay(new Date(w.date), d))
                            }}
                            modifiersStyles={{
                                hasData: { fontWeight: 'bold', color: '#10b981' }
                            }}
                        />
                    </CardContent>
                </Card>

                {/* Insight de Comparação Semanal */}
                <Card className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
                    <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between text-xs text-zinc-500">
                            <span>Média Semanal</span>
                            <span className="font-mono">{weeklyAverage} kcal</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Hoje vs Média</span>
                            <span className={`text-lg font-black ${deviation > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {deviation > 0 ? '+' : ''}{deviation}
                            </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight">
                            {deviation > 0 
                                ? "Você comeu mais que sua média habitual." 
                                : "Você está comendo menos que sua média."}
                        </p>
                    </CardContent>
                </Card>

                {/* Gráfico Mini */}
                <div className="h-[120px] w-full opacity-80 hover:opacity-100 transition-opacity">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                             <Bar dataKey="calories" radius={[2, 2, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.isCurrent ? '#10b981' : '#e4e4e7'} 
                                        className={entry.isCurrent ? "fill-emerald-500" : "dark:fill-zinc-800"}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* --- COLUNA CENTRAL: FEED INTELIGENTE (6/12) --- */}
            <div className="lg:col-span-6 flex flex-col gap-4 h-[calc(100vh-140px)]">
                
                {/* Header do Feed com Filtros */}
                <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex gap-1">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setFilterType('ALL')}
                            className={cn("h-8 text-xs", filterType === 'ALL' && "bg-zinc-100 dark:bg-zinc-800 font-bold")}
                        >
                            Tudo ({meals.length})
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setFilterType('HEALTHY')}
                            className={cn("h-8 text-xs text-emerald-600", filterType === 'HEALTHY' && "bg-emerald-50 dark:bg-emerald-900/20 font-bold")}
                        >
                            Saudável
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setFilterType('TRASH')}
                            className={cn("h-8 text-xs text-red-600", filterType === 'TRASH' && "bg-red-50 dark:bg-red-900/20 font-bold")}
                        >
                            Lixo
                        </Button>
                    </div>
                    
                    <div className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-800 pl-2 ml-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}>
                            <LayoutList className={cn("h-4 w-4", viewMode === 'list' ? "text-zinc-900 dark:text-white" : "text-zinc-400")} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMode('card')}>
                            <LayoutGrid className={cn("h-4 w-4", viewMode === 'card' ? "text-zinc-900 dark:text-white" : "text-zinc-400")} />
                        </Button>
                    </div>
                </div>

                {/* Área de Scroll do Feed */}
                <ScrollArea className="flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                    <div className="p-4 space-y-3">
                        {filteredMeals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                                <Filter className="h-10 w-10 mb-3 opacity-20" />
                                <p className="text-sm">Nenhuma refeição neste filtro.</p>
                            </div>
                        ) : (
                            filteredMeals.map((meal) => (
                                <div 
                                    key={meal.id} 
                                    className={cn(
                                        "group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all hover:border-emerald-500/30",
                                        viewMode === 'card' ? "p-4 rounded-2xl" : "p-3 rounded-lg flex items-center justify-between"
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "flex items-center justify-center text-lg shrink-0 rounded-xl",
                                            viewMode === 'card' ? "w-12 h-12 bg-zinc-50 dark:bg-zinc-800" : "w-10 h-10 bg-zinc-50 dark:bg-zinc-800"
                                        )}>
                                            {getEmoji(meal.type, meal.title)}
                                        </div>
                                        
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 text-sm">{meal.title}</h4>
                                                <span className="text-[10px] text-zinc-400 font-mono">
                                                    {format(new Date(meal.date), "HH:mm")}
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                                                {meal.items || "Sem descrição"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "text-right shrink-0",
                                        viewMode === 'card' && "mt-3 pt-3 border-t border-zinc-50 dark:border-zinc-800 flex justify-between items-center"
                                    )}>
                                        {viewMode === 'card' && (
                                            <Badge variant="secondary" className={cn(
                                                "text-[10px] h-5",
                                                meal.type === 'HEALTHY' ? 'bg-emerald-100 text-emerald-700' : 
                                                meal.type === 'TRASH' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'
                                            )}>
                                                {meal.type === 'HEALTHY' ? 'Saudável' : meal.type === 'TRASH' ? 'Lixo' : 'Neutro'}
                                            </Badge>
                                        )}
                                        
                                        <div className="flex items-center gap-1 justify-end text-zinc-700 dark:text-zinc-300">
                                            <Flame className="h-3 w-3 text-zinc-400" />
                                            <span className="font-mono font-bold text-sm">
                                                {meal.calories}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* --- COLUNA DIREITA: INSIGHTS & GAMIFICATION (3/12) --- */}
            <div className="lg:col-span-3 space-y-6">
                
                {/* Score Card (Com visual melhorado) */}
                <Card className={cn(
                    "border-0 shadow-lg relative overflow-hidden text-white",
                    qualityScore >= 80 ? 'bg-emerald-600' : qualityScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                )}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <CardContent className="p-6 text-center relative z-10">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-90 mb-2">Score Diário</p>
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Trophy className="h-6 w-6 text-yellow-300" />
                            <span className="text-5xl font-black">{qualityScore}</span>
                        </div>
                        <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-white/90" style={{ width: `${qualityScore}%` }} />
                        </div>
                    </CardContent>
                </Card>

                {/* Insight do Dia (AI-Lite) */}
                {meals.length > 0 && (
                    <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs uppercase font-bold text-indigo-500 flex items-center gap-2">
                                <Target className="h-4 w-4" /> Análise Rápida
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                {trashCount > healthyCount 
                                    ? "⚠️ Atenção: Mais refeições 'lixo' do que saudáveis hoje. Tente compensar amanhã com mais vegetais."
                                    : totalCalories > dailyGoal 
                                        ? "📉 Você ultrapassou sua meta calórica. Considere uma caminhada leve."
                                        : "✅ Ótimo equilíbrio! Você está dentro da meta e comendo bem."
                                }
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Totais */}
                <Card>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-500">Meta</span>
                            <span className="font-bold text-zinc-700 dark:text-zinc-200">{dailyGoal}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-500">Consumido</span>
                            <span className={cn("font-bold", totalCalories > dailyGoal ? "text-red-500" : "text-emerald-500")}>
                                {totalCalories}
                            </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-sm font-medium">Saldo</span>
                            <Badge variant={totalCalories > dailyGoal ? "destructive" : "default"} className="font-mono">
                                {totalCalories > dailyGoal ? `+${totalCalories - dailyGoal}` : `${totalCalories - dailyGoal}`}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}

// Helpers Visuais
function getEmoji(type: string, title: string) {
    const t = title.toLowerCase();
    if (t.includes('café')) return <Coffee className="h-5 w-5" />;
    if (t.includes('pizza')) return <Pizza className="h-5 w-5" />;
    if (type === 'HEALTHY') return <Leaf className="h-5 w-5" />;
    if (type === 'TRASH') return <AlertCircle className="h-5 w-5" />;
    return <Flame className="h-5 w-5" />;
}