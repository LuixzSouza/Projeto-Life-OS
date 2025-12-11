"use client";

import { useState, useMemo } from "react";
import { Workout } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
    Dumbbell, Footprints, Clock, MapPin, Trash2, History, Pencil, 
    Flame, Activity, ChevronDown, LucideIcon, Search, CalendarDays, Timer, Zap
} from "lucide-react";
import { deleteWorkout } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { GymForm } from "./gym-form";
import { RunForm } from "./run-form";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExerciseItem {
    name: string;
    weight: string;
    sets?: string;
    reps?: string;
}

export function ActivityFeed({ initialWorkouts }: { initialWorkouts: Workout[] }) {
    const [filter, setFilter] = useState<'ALL' | 'GYM' | 'RUN'>('ALL');
    const [searchTerm, setSearchTerm] = useState("");
    const [visibleCount, setVisibleCount] = useState(10);

    // --- LÓGICA DE FILTRO E BUSCA ---
    const filteredWorkouts = useMemo(() => {
        return initialWorkouts.filter(w => {
            // 1. Filtro por Tipo
            const matchesType = filter === 'ALL' 
                ? true 
                : filter === 'GYM' ? w.type === 'GYM' 
                : (w.type === 'RUN' || w.type === 'RUNNING');

            // 2. Filtro por Texto (Busca)
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                w.title.toLowerCase().includes(searchLower) || 
                (w.notes && w.notes.toLowerCase().includes(searchLower));

            return matchesType && matchesSearch;
        });
    }, [initialWorkouts, filter, searchTerm]);

    // --- ESTATÍSTICAS DO FILTRO ATUAL ---
    const stats = useMemo(() => {
        const totalDuration = filteredWorkouts.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        // Tenta extrair calorias das notas ou usa uma lógica dummy se você tiver campo caloria no futuro
        // Aqui estou assumindo uma estimativa baseada no tempo para exemplo visual
        const totalCaloriesEst = Math.round(totalDuration * 8); 
        return { count: filteredWorkouts.length, duration: totalDuration, calories: totalCaloriesEst };
    }, [filteredWorkouts]);

    const visibleWorkouts = filteredWorkouts.slice(0, visibleCount);

    // --- AGRUPAMENTO POR DATA ---
    const groupedWorkouts = useMemo(() => {
        const groups: Record<string, Workout[]> = {};
        visibleWorkouts.forEach(workout => {
            const dateKey = new Date(workout.date).toDateString();
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(workout);
        });
        return groups;
    }, [visibleWorkouts]);

    const handleDelete = async (id: string) => {
        if(confirm("Tem certeza que deseja apagar esta atividade permanentemente?")) {
            await deleteWorkout(id);
            toast.success("Atividade removida com sucesso.");
        }
    }

    return (
        <div className="space-y-6">
            
            {/* 1. HEADER: ESTATÍSTICAS E CONTROLES */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm space-y-4">
                
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex flex-col items-center justify-center border-r border-zinc-100 dark:border-zinc-800">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Atividades</span>
                        <span className="text-2xl font-black text-zinc-800 dark:text-white">{stats.count}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center border-r border-zinc-100 dark:border-zinc-800">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Tempo Total</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-zinc-800 dark:text-white">{Math.floor(stats.duration / 60)}</span>
                            <span className="text-xs text-zinc-500">h</span>
                            <span className="text-2xl font-black text-zinc-800 dark:text-white">{stats.duration % 60}</span>
                            <span className="text-xs text-zinc-500">min</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Est. Calorias</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-orange-500">{stats.calories}</span>
                            <span className="text-xs text-zinc-500">kcal</span>
                        </div>
                    </div>
                </div>

                {/* Controls Row */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input 
                            placeholder="Buscar treino..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-9 text-sm bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
                        />
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg w-full sm:w-auto">
                        <FilterButton active={filter === 'ALL'} onClick={() => setFilter('ALL')} icon={Activity}>Todos</FilterButton>
                        <FilterButton active={filter === 'GYM'} onClick={() => setFilter('GYM')} icon={Dumbbell}>Treino</FilterButton>
                        <FilterButton active={filter === 'RUN'} onClick={() => setFilter('RUN')} icon={Footprints}>Corrida</FilterButton>
                    </div>
                </div>
            </div>

            {/* 2. TIMELINE FEED */}
            <div className="space-y-8 relative">
                {/* Linha Vertical da Timeline */}
                <div className="absolute left-[19px] top-4 bottom-4 w-px bg-zinc-200 dark:bg-zinc-800 z-0 hidden sm:block"></div>

                {Object.keys(groupedWorkouts).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                            <Search className="h-8 w-8 text-zinc-300" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Nenhum treino encontrado</h3>
                        <p className="text-sm text-zinc-500">Tente ajustar seus filtros ou registre uma nova atividade.</p>
                    </div>
                ) : (
                    Object.entries(groupedWorkouts).map(([dateKey, items]) => {
                        const dateObj = new Date(items[0].date);
                        let dateLabel = format(dateObj, "dd 'de' MMMM", { locale: ptBR });
                        if (isToday(dateObj)) dateLabel = "Hoje";
                        if (isYesterday(dateObj)) dateLabel = "Ontem";

                        return (
                            <div key={dateKey} className="relative z-10">
                                {/* Date Header Sticky */}
                                <div className="flex items-center gap-4 mb-4 sm:ml-0 ml-1">
                                    <div className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600 ring-4 ring-white dark:ring-black hidden sm:block"></div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 bg-zinc-50/80 dark:bg-black/80 px-2 py-1 rounded backdrop-blur-sm sticky top-0 z-20">
                                        {dateLabel}
                                    </span>
                                </div>

                                <div className="space-y-3 sm:pl-10">
                                    {items.map((w) => {
                                        const isRun = w.type === 'RUN' || w.type === 'RUNNING';
                                        let parsedExercises: ExerciseItem[] = [];
                                        try { if(w.exercises) parsedExercises = JSON.parse(w.exercises); } catch {}

                                        return (
                                            <Card key={w.id} className="group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start gap-4">
                                                        
                                                        {/* Icon Box */}
                                                        <div className={cn(
                                                            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border mt-1",
                                                            isRun 
                                                                ? "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-900" 
                                                                : "bg-orange-50 border-orange-100 text-orange-600 dark:bg-orange-900/20 dark:border-orange-900"
                                                        )}>
                                                            {isRun ? <Footprints className="h-5 w-5" /> : <Dumbbell className="h-5 w-5" />}
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{w.title}</h4>
                                                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                                    <Clock className="h-3 w-3" />
                                                                    <span>{format(new Date(w.date), "HH:mm")}</span>
                                                                    <span>•</span>
                                                                    <span>{w.duration} min</span>
                                                                </div>
                                                            </div>

                                                            {/* Tags & Métricas */}
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {w.feeling && (
                                                                    <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-normal bg-zinc-100 dark:bg-zinc-800 text-zinc-600">
                                                                        {w.feeling === 'GOOD' ? '😃 Bem' : w.feeling === 'TIRED' ? '😫 Cansado' : '🔥 Max'}
                                                                    </Badge>
                                                                )}
                                                                {w.distance && (
                                                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-normal border-blue-200 text-blue-600 gap-1">
                                                                        <MapPin className="h-3 w-3" /> {w.distance} km
                                                                    </Badge>
                                                                )}
                                                                {w.pace && (
                                                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-normal border-zinc-200 text-zinc-500 gap-1">
                                                                        <Zap className="h-3 w-3" /> {w.pace}/km
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {/* Exercícios (Resumo) */}
                                                            {parsedExercises.length > 0 && (
                                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                                    {parsedExercises.slice(0, 4).map((ex, i) => (
                                                                        <span key={i} className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-800">
                                                                            {ex.name} 
                                                                            {ex.weight && <span className="ml-1 opacity-50 font-mono"> {ex.weight}kg</span>}
                                                                        </span>
                                                                    ))}
                                                                    {parsedExercises.length > 4 && (
                                                                        <span className="text-[10px] text-zinc-400 px-1 py-0.5">+{parsedExercises.length - 4} mais</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Actions Dropdown/Buttons */}
                                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-blue-500">
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="sm:max-w-lg">
                                                                    <DialogHeader>
                                                                        <DialogTitle>Editar Atividade</DialogTitle>
                                                                    </DialogHeader>
                                                                    {isRun ? <RunForm /> : <GymForm />} 
                                                                    {/* Nota: Passar {initialData={w}} aqui se os forms suportarem */}
                                                                </DialogContent>
                                                            </Dialog>

                                                            <Button size="icon" variant="ghost" onClick={() => handleDelete(w.id)} className="h-7 w-7 text-zinc-400 hover:text-red-500">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>

                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Load More */}
            {visibleCount < filteredWorkouts.length && (
                <div className="flex justify-center pt-6 pb-12">
                    <Button 
                        variant="outline" 
                        onClick={() => setVisibleCount(prev => prev + 5)}
                        className="gap-2 bg-white dark:bg-zinc-900 shadow-sm text-zinc-500 hover:text-zinc-800"
                    >
                        <ChevronDown className="h-4 w-4" />
                        Carregar mais ({filteredWorkouts.length - visibleCount})
                    </Button>
                </div>
            )}
        </div>
    );
}

// Botão de Filtro Tipado
interface FilterButtonProps {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    children: React.ReactNode;
}

function FilterButton({ active, onClick, icon: Icon, children }: FilterButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all flex-1 sm:flex-none justify-center",
                active 
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-200/50"
            )}
        >
            <Icon className="h-3.5 w-3.5" />
            {children}
        </button>
    )
}