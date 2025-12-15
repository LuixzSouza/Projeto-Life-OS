"use client";

import { useState, useMemo } from "react";
import { Workout } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
    Dumbbell, Footprints, Clock, MapPin, Trash2, Pencil, 
    Activity, ChevronDown, Search, Zap, LucideIcon
} from "lucide-react";
import { deleteWorkout } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { GymForm } from "./gym/gym-form";
import { RunForm } from "./running/run-form";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

// --- TIPOS ---
interface ExerciseItem {
    name: string;
    weight: string;
    sets?: string;
    reps?: string;
}

interface ActivityStatsProps {
    stats: {
        count: number;
        duration: number;
        calories: number;
    };
}

interface ActivityFiltersProps {
    filter: 'ALL' | 'GYM' | 'RUN';
    setFilter: (f: 'ALL' | 'GYM' | 'RUN') => void;
    searchTerm: string;
    setSearchTerm: (s: string) => void;
}

interface FilterButtonProps {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    children: React.ReactNode;
}

interface DayGroupProps {
    dateKey: string;
    items: Workout[];
    onDelete: (id: string) => void;
}

// --- COMPONENTE PRINCIPAL ---
export function ActivityFeed({ initialWorkouts }: { initialWorkouts: Workout[] }) {
    const [filter, setFilter] = useState<'ALL' | 'GYM' | 'RUN'>('ALL');
    const [searchTerm, setSearchTerm] = useState("");
    const [visibleCount, setVisibleCount] = useState(10);

    // 1. Filtragem Otimizada
    const filteredWorkouts = useMemo(() => {
        return initialWorkouts.filter(w => {
            const matchesType = filter === 'ALL' 
                ? true 
                : filter === 'GYM' ? w.type === 'GYM' 
                : (w.type === 'RUN' || w.type === 'RUNNING');

            const searchLower = searchTerm.toLowerCase();
            // Proteção contra nulos (caso title ou notes venham vazios)
            const titleMatch = w.title?.toLowerCase().includes(searchLower) ?? false;
            const notesMatch = w.notes?.toLowerCase().includes(searchLower) ?? false;

            return matchesType && (titleMatch || notesMatch);
        });
    }, [initialWorkouts, filter, searchTerm]);

    // 2. Estatísticas em Tempo Real
    const stats = useMemo(() => {
        const totalDuration = filteredWorkouts.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        const totalCaloriesEst = Math.round(totalDuration * 8); 
        return { count: filteredWorkouts.length, duration: totalDuration, calories: totalCaloriesEst };
    }, [filteredWorkouts]);

    const visibleWorkouts = filteredWorkouts.slice(0, visibleCount);

    // 3. Agrupamento por Data
    const groupedWorkouts = useMemo(() => {
        const groups: Record<string, Workout[]> = {};
        visibleWorkouts.forEach(workout => {
            const dateKey = new Date(workout.date).toDateString();
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(workout);
        });
        return groups;
    }, [visibleWorkouts]);

    // Handlers
    const handleDelete = async (id: string) => {
        if(confirm("Tem certeza que deseja apagar esta atividade permanentemente?")) {
            await deleteWorkout(id);
            toast.success("Atividade removida com sucesso.");
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* CABEÇALHO DE CONTROLE */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-5">
                <ActivityStats stats={stats} />
                <ActivityFilters 
                    filter={filter} 
                    setFilter={setFilter} 
                    searchTerm={searchTerm} 
                    setSearchTerm={setSearchTerm} 
                />
            </div>

            {/* TIMELINE */}
            <div className="relative min-h-[200px]">
                {/* Linha Vertical Conectora */}
                <div className="absolute left-[19px] top-2 bottom-4 w-px bg-zinc-200 dark:bg-zinc-800 z-0 hidden sm:block"></div>

                {Object.keys(groupedWorkouts).length === 0 ? (
                    <EmptyState />
                ) : (
                    Object.entries(groupedWorkouts).map(([dateKey, items]) => (
                        <DayGroup 
                            key={dateKey} 
                            dateKey={dateKey} 
                            items={items} 
                            onDelete={handleDelete} 
                        />
                    ))
                )}
            </div>

            {/* CARREGAR MAIS */}
            {visibleCount < filteredWorkouts.length && (
                <div className="flex justify-center pt-2 pb-10">
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

// --- SUBCOMPONENTES ---

function ActivityStats({ stats }: ActivityStatsProps) {
    return (
        <div className="grid grid-cols-3 gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <StatItem label="Atividades" value={stats.count} />
            <StatItem 
                label="Tempo Total" 
                value={
                    <span className="flex items-baseline gap-1">
                        {Math.floor(stats.duration / 60)}<span className="text-xs text-zinc-400 font-normal">h</span>
                        {stats.duration % 60}<span className="text-xs text-zinc-400 font-normal">min</span>
                    </span>
                } 
            />
            <StatItem 
                label="Est. Calorias" 
                value={<span className="text-orange-500">{stats.calories} <span className="text-xs text-zinc-400 font-normal">kcal</span></span>} 
            />
        </div>
    )
}

function StatItem({ label, value }: { label: string, value: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center first:border-r last:border-l-0 border-zinc-100 dark:border-zinc-800 sm:border-r-0 sm:last:border-l sm:border-l">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-1">{label}</span>
            <div className="text-2xl font-black text-zinc-800 dark:text-white leading-none">{value}</div>
        </div>
    )
}

function ActivityFilters({ filter, setFilter, searchTerm, setSearchTerm }: ActivityFiltersProps) {
    return (
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input 
                    placeholder="Buscar treino..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus-visible:ring-offset-0"
                />
            </div>
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg w-full sm:w-auto">
                <FilterButton active={filter === 'ALL'} onClick={() => setFilter('ALL')} icon={Activity}>Todos</FilterButton>
                <FilterButton active={filter === 'GYM'} onClick={() => setFilter('GYM')} icon={Dumbbell}>Treino</FilterButton>
                <FilterButton active={filter === 'RUN'} onClick={() => setFilter('RUN')} icon={Footprints}>Corrida</FilterButton>
            </div>
        </div>
    )
}

function FilterButton({ active, onClick, icon: Icon, children }: FilterButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all flex-1 sm:flex-none justify-center",
                active 
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-200/50"
            )}
        >
            <Icon className="h-3.5 w-3.5" />
            {children}
        </button>
    )
}

function DayGroup({ dateKey, items, onDelete }: DayGroupProps) {
    const dateObj = new Date(items[0].date);
    let dateLabel = format(dateObj, "dd 'de' MMMM", { locale: ptBR });
    if (isToday(dateObj)) dateLabel = "Hoje";
    if (isYesterday(dateObj)) dateLabel = "Ontem";

    return (
        <div className="relative z-10 mb-8">
            <div className="flex items-center gap-4 mb-4 sm:ml-0 ml-1">
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600 ring-4 ring-white dark:ring-black hidden sm:block"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 bg-zinc-50/80 dark:bg-black/80 px-2 py-1 rounded backdrop-blur-sm sticky top-0 z-20">
                    {dateLabel}
                </span>
            </div>

            <div className="space-y-3 sm:pl-10">
                {items.map((w: Workout) => (
                    <ActivityCard key={w.id} workout={w} onDelete={onDelete} />
                ))}
            </div>
        </div>
    )
}

function ActivityCard({ workout, onDelete }: { workout: Workout, onDelete: (id: string) => void }) {
    const isRun = workout.type === 'RUN' || workout.type === 'RUNNING';
    
    // Parse seguro dos exercícios
    let parsedExercises: ExerciseItem[] = [];
    try { 
        if(workout.exercises) parsedExercises = JSON.parse(workout.exercises); 
    } catch {
        parsedExercises = [];
    }

    return (
        <Card className="group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
            <CardContent className="p-4">
                <div className="flex gap-4">
                    {/* Ícone Lateral */}
                    <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border mt-1",
                        isRun 
                            ? "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-900" 
                            : "bg-orange-50 border-orange-100 text-orange-600 dark:bg-orange-900/20 dark:border-orange-900"
                    )}>
                        {isRun ? <Footprints className="h-5 w-5" /> : <Dumbbell className="h-5 w-5" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                        {/* Título e Hora */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 truncate text-sm sm:text-base">
                                    {workout.title}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                                    <Clock className="h-3 w-3" />
                                    <span>{format(new Date(workout.date), "HH:mm")}</span>
                                    <span>•</span>
                                    <span>{workout.duration} min</span>
                                </div>
                            </div>
                            
                            {/* Ações (Editar/Excluir) */}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-blue-500">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Editar Atividade</DialogTitle>
                                        </DialogHeader>
                                        {/* Passa dados iniciais para edição se os forms suportarem, senão é um novo registro */}
                                        {isRun ? <RunForm /> : <GymForm />} 
                                    </DialogContent>
                                </Dialog>
                                <Button size="icon" variant="ghost" onClick={() => onDelete(workout.id)} className="h-7 w-7 text-zinc-400 hover:text-red-500">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* Badges e Métricas */}
                        <div className="flex flex-wrap gap-2">
                            {workout.feeling && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-normal bg-zinc-100 dark:bg-zinc-800 text-zinc-600">
                                    {workout.feeling === 'GOOD' ? '😃 Bem' : workout.feeling === 'TIRED' ? '😫 Cansado' : '🔥 Max'}
                                </Badge>
                            )}
                            {workout.distance && (
                                <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-normal border-blue-200 text-blue-600 gap-1">
                                    <MapPin className="h-3 w-3" /> {workout.distance} km
                                </Badge>
                            )}
                            {workout.pace && (
                                <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-normal border-zinc-200 text-zinc-500 gap-1">
                                    <Zap className="h-3 w-3" /> {workout.pace}/km
                                </Badge>
                            )}
                        </div>

                        {/* Lista de Exercícios (Preview) */}
                        {parsedExercises.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
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
                </div>
            </CardContent>
        </Card>
    )
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-zinc-300" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Nenhum treino encontrado</h3>
            <p className="text-sm text-zinc-500 mt-1">Tente ajustar seus filtros ou registre uma nova atividade.</p>
        </div>
    )
}