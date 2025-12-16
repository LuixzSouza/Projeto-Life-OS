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
    Activity, ChevronDown, Search, Zap, LucideIcon, Flame, Timer
} from "lucide-react";
import { deleteWorkout } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { GymForm } from "./gym/gym-form";
import { RunForm } from "./running/run-form";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
    label: string;
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

    const handleDelete = async (id: string) => {
        const result = await deleteWorkout(id);
        if (result.success) {
            toast.success("Atividade removida com sucesso.");
        } else {
            toast.error("Erro ao remover atividade.");
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            
            {/* CABEÇALHO DE CONTROLE */}
            <div className="bg-card rounded-xl border border-border/60 p-1 shadow-sm">
                <div className="p-4 border-b border-border/40">
                    <ActivityStats stats={stats} />
                </div>
                <div className="p-4 bg-muted/20">
                    <ActivityFilters 
                        filter={filter} 
                        setFilter={setFilter} 
                        searchTerm={searchTerm} 
                        setSearchTerm={setSearchTerm} 
                    />
                </div>
            </div>

            {/* TIMELINE */}
            <div className="relative min-h-[200px] pl-4 sm:pl-0">
                {/* Linha Vertical Conectora */}
                <div className="absolute left-[7px] sm:left-[19px] top-2 bottom-4 w-px bg-border/60 z-0 border-l border-dashed border-primary/20"></div>

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
                <div className="flex justify-center pt-4 pb-12">
                    <Button 
                        variant="outline" 
                        onClick={() => setVisibleCount(prev => prev + 5)}
                        className="gap-2 bg-background shadow-sm hover:bg-muted/50 border-border/60 text-muted-foreground hover:text-foreground transition-all"
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
        <div className="grid grid-cols-3 gap-4">
            <StatItem 
                label="Atividades" 
                value={stats.count} 
                icon={Activity}
            />
            <StatItem 
                label="Tempo Total" 
                value={
                    <span className="flex items-baseline gap-1">
                        {Math.floor(stats.duration / 60)}<span className="text-xs text-muted-foreground font-medium">h</span>
                        {stats.duration % 60}<span className="text-xs text-muted-foreground font-medium">min</span>
                    </span>
                } 
                icon={Timer}
            />
            <StatItem 
                label="Est. Calorias" 
                value={<span className="text-primary">{stats.calories} <span className="text-xs text-muted-foreground font-medium">kcal</span></span>} 
                icon={Flame}
            />
        </div>
    )
}

function StatItem({ label, value, icon: Icon }: { label: string, value: React.ReactNode, icon: LucideIcon }) {
    return (
        <div className="flex flex-col items-center justify-center p-2 first:border-r last:border-l border-border/40 sm:border-r-0 sm:last:border-l-0">
            <div className="flex items-center gap-1.5 mb-1 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
            </div>
            <div className="text-2xl font-bold text-foreground leading-none tracking-tight">{value}</div>
        </div>
    )
}

function ActivityFilters({ filter, setFilter, searchTerm, setSearchTerm }: ActivityFiltersProps) {
    return (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar por título ou notas..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm bg-background border-border/60 focus:border-primary/50 transition-colors"
                />
            </div>
            <div className="flex gap-1 bg-background p-1 rounded-lg border border-border/60 w-full sm:w-auto overflow-x-auto">
                <FilterButton active={filter === 'ALL'} onClick={() => setFilter('ALL')} icon={Activity} label="Todos" />
                <FilterButton active={filter === 'GYM'} onClick={() => setFilter('GYM')} icon={Dumbbell} label="Treino" />
                <FilterButton active={filter === 'RUN'} onClick={() => setFilter('RUN')} icon={Footprints} label="Corrida" />
            </div>
        </div>
    )
}

function FilterButton({ active, onClick, icon: Icon, label }: FilterButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all flex-1 sm:flex-none justify-center whitespace-nowrap",
                active 
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
        >
            <Icon className="h-3.5 w-3.5" />
            {label}
        </button>
    )
}

function DayGroup({ dateKey, items, onDelete }: DayGroupProps) {
    const dateObj = new Date(items[0].date);
    let dateLabel = format(dateObj, "dd 'de' MMMM", { locale: ptBR });
    if (isToday(dateObj)) dateLabel = "Hoje";
    if (isYesterday(dateObj)) dateLabel = "Ontem";

    return (
        <div className="relative z-10 mb-10 group/day">
            <div className="flex items-center gap-4 mb-5 sm:ml-0 -ml-2">
                <div className="h-3 w-3 rounded-full bg-background border-2 border-primary ring-4 ring-background z-20 hidden sm:block"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/5 border border-primary/10 px-3 py-1 rounded-full backdrop-blur-sm sticky top-2 z-20 shadow-sm">
                    {dateLabel}
                </span>
            </div>

            <div className="space-y-4 sm:pl-10 pl-2">
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
        <Card className="group hover:border-primary/40 transition-all border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden hover:shadow-md">
            <CardContent className="p-5">
                <div className="flex gap-5">
                    {/* Ícone Lateral */}
                    <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border mt-1 shadow-sm transition-colors",
                        isRun 
                            ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20" 
                            : "bg-primary/10 border-primary/20 text-primary group-hover:bg-primary/20"
                    )}>
                        {isRun ? <Footprints className="h-6 w-6" /> : <Dumbbell className="h-6 w-6" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-3">
                        {/* Header do Card */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-foreground text-base leading-tight truncate pr-2">
                                    {workout.title}
                                </h4>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 font-medium">
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-primary/70" />
                                        {format(new Date(workout.date), "HH:mm")}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    <span>{workout.duration} min</span>
                                </div>
                            </div>
                            
                            {/* Menu de Ações (Visível no Hover em Desktop) */}
                            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Editar Atividade</DialogTitle>
                                        </DialogHeader>
                                        {isRun ? <RunForm /> : <GymForm />} 
                                    </DialogContent>
                                </Dialog>
                                
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir Atividade?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta ação não pode ser desfeita. Isso removerá permanentemente o registro do histórico.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDelete(workout.id)} className="bg-destructive hover:bg-destructive/90">
                                                Excluir
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>

                        {/* Badges de Métricas */}
                        <div className="flex flex-wrap gap-2">
                            {workout.feeling && (
                                <Badge variant="secondary" className="bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted">
                                    {workout.feeling === 'GOOD' ? '😃 Bem' : workout.feeling === 'TIRED' ? '😫 Cansado' : '🔥 Max'}
                                </Badge>
                            )}
                            {workout.distance && (
                                <Badge variant="outline" className="border-blue-500/20 text-blue-600 bg-blue-500/5 gap-1.5">
                                    <MapPin className="h-3 w-3" /> {workout.distance} km
                                </Badge>
                            )}
                            {workout.pace && (
                                <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 gap-1.5">
                                    <Zap className="h-3 w-3" /> {workout.pace}/km
                                </Badge>
                            )}
                        </div>

                        {/* Lista de Exercícios (Preview Compacto) */}
                        {parsedExercises.length > 0 && (
                            <div className="pt-2 border-t border-border/40 flex flex-wrap gap-2">
                                {parsedExercises.slice(0, 4).map((ex, i) => (
                                    <div key={i} className="inline-flex items-center text-[11px] px-2 py-1 rounded-md bg-muted/30 border border-border/50 text-muted-foreground font-medium">
                                        <span className="text-foreground mr-1.5">{ex.name}</span>
                                        {ex.weight && <span className="opacity-70 border-l border-border pl-1.5 ml-0.5">{ex.weight}kg</span>}
                                    </div>
                                ))}
                                {parsedExercises.length > 4 && (
                                    <span className="text-[10px] font-medium text-muted-foreground px-2 py-1 bg-muted/20 rounded-md">
                                        +{parsedExercises.length - 4} mais
                                    </span>
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
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl bg-card/30">
            <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                <Search className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Nenhuma atividade encontrada</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                Tente ajustar seus filtros ou comece registrando um novo treino hoje.
            </p>
        </div>
    )
}