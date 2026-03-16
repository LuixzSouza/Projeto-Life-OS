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
    Activity, ChevronDown, Search, Zap, LucideIcon, Flame, Timer,
    Calendar, ListFilter, Target, History
} from "lucide-react";
import { deleteWorkout } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { GymForm } from "./gym/gym-form";
import { RunForm } from "./running/run-form";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, 
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

// --- INTERFACES ESTREITAS ---
interface ExerciseItem {
    name: string;
    weight: string;
    sets?: string;
    reps?: string;
}

interface ActivityStatsData {
    count: number;
    duration: number;
    calories: number;
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

// --- COMPONENTE PRINCIPAL ---
export function ActivityFeed({ initialWorkouts }: { initialWorkouts: Workout[] }) {
    const [filter, setFilter] = useState<'ALL' | 'GYM' | 'RUN'>('ALL');
    const [searchTerm, setSearchTerm] = useState("");
    const [visibleCount, setVisibleCount] = useState(10);

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

    const stats = useMemo<ActivityStatsData>(() => {
        const totalDuration = filteredWorkouts.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        const totalCaloriesEst = Math.round(totalDuration * 8); 
        return { count: filteredWorkouts.length, duration: totalDuration, calories: totalCaloriesEst };
    }, [filteredWorkouts]);

    const visibleWorkouts = filteredWorkouts.slice(0, visibleCount);

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
            toast.success("Log de atividade removido.");
        } else {
            toast.error("Falha ao deletar.");
        }
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
            
            {/* PAINEL DE CONTROLE DE ATIVIDADE */}
            <div className="bg-card border border-border/40 rounded-[2.5rem] shadow-2xl overflow-hidden p-2">
                <div className="p-6 md:p-8 space-y-8">
                    <ActivityStats stats={stats} />
                    <SeparatorWithIcon icon={ListFilter} />
                    <ActivityFilters 
                        filter={filter} 
                        setFilter={setFilter} 
                        searchTerm={searchTerm} 
                        setSearchTerm={setSearchTerm} 
                    />
                </div>
            </div>

            {/* TIMELINE DE LOGS */}
            <div className="relative pl-6 md:pl-10">
                {/* Linha de Conexão Vertical Estilizada */}
                <div className="absolute left-2.5 md:left-[19px] top-4 bottom-0 w-px bg-gradient-to-b from-primary/50 via-border/40 to-transparent z-0" />

                {Object.keys(groupedWorkouts).length === 0 ? (
                    <EmptyState />
                ) : (
                    Object.entries(groupedWorkouts).map(([dateKey, items]) => (
                        <div key={dateKey} className="relative z-10 mb-12">
                            {/* Marcador de Data */}
                            <div className="flex items-center gap-4 mb-6 -ml-[22px] md:-ml-[31px]">
                                <div className="h-6 w-6 rounded-full bg-background border-2 border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] flex items-center justify-center z-20">
                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                </div>
                                <div className="bg-muted/40 backdrop-blur-md border border-border/40 px-4 py-1.5 rounded-xl">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70">
                                        {isToday(new Date(dateKey)) ? "Hoje" : isYesterday(new Date(dateKey)) ? "Ontem" : format(new Date(dateKey), "dd 'de' MMMM", { locale: ptBR })}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {items.map((w) => (
                                    <ActivityCard key={w.id} workout={w} onDelete={handleDelete} />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* CARREGAR MAIS */}
            {visibleCount < filteredWorkouts.length && (
                <div className="flex justify-center pb-10">
                    <Button 
                        variant="outline" 
                        onClick={() => setVisibleCount(prev => prev + 5)}
                        className="rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 px-8 border-border/60 hover:bg-muted shadow-lg transition-all active:scale-95"
                    >
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Expandir Histórico ({filteredWorkouts.length - visibleCount})
                    </Button>
                </div>
            )}
        </div>
    );
}

// --- SUBCOMPONENTES ---

function ActivityStats({ stats }: { stats: ActivityStatsData }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatBox label="Frequência" value={stats.count} unit="Logs" icon={History} color="text-primary" />
            <StatBox label="Carga de Tempo" value={stats.duration} unit="Min" icon={Timer} color="text-blue-500" isTime />
            <StatBox label="Energia Estimada" value={stats.calories} unit="Kcal" icon={Flame} color="text-orange-500" />
        </div>
    );
}

function StatBox({ label, value, unit, icon: Icon, color, isTime }: { label: string, value: number, unit: string, icon: LucideIcon, color: string, isTime?: boolean }) {
    return (
        <div className="bg-muted/10 border border-border/30 rounded-3xl p-5 flex items-center gap-5 shadow-inner group hover:bg-muted/20 transition-all">
            <div className={cn("h-12 w-12 rounded-2xl bg-background border border-border/40 shadow-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform", color)}>
                <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none">{label}</p>
                <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black tracking-tighter tabular-nums text-foreground">
                        {isTime ? `${Math.floor(value / 60)}h ${value % 60}` : value}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase">{unit}</span>
                </div>
            </div>
        </div>
    );
}

function ActivityFilters({ filter, setFilter, searchTerm, setSearchTerm }: ActivityFiltersProps) {
    return (
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-center">
            <div className="relative w-full xl:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                    placeholder="Filtrar por nome ou notas..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 h-12 rounded-2xl bg-background border-border/60 shadow-inner focus-visible:ring-primary/20 font-medium"
                />
            </div>
            <div className="flex p-1.5 bg-muted/40 rounded-[1.25rem] border border-border/40 w-full xl:w-auto shadow-inner">
                <FilterTab active={filter === 'ALL'} onClick={() => setFilter('ALL')} icon={Activity} label="Todos" />
                <FilterTab active={filter === 'GYM'} onClick={() => setFilter('GYM')} icon={Dumbbell} label="Gym" />
                <FilterTab active={filter === 'RUN'} onClick={() => setFilter('RUN')} icon={Footprints} label="Run" />
            </div>
        </div>
    );
}

function FilterTab({ active, onClick, icon: Icon, label }: FilterButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-1 xl:flex-none",
                active 
                    ? "bg-background text-primary shadow-lg ring-1 ring-border/20" 
                    : "text-muted-foreground hover:text-foreground"
            )}
        >
            <Icon className="h-3.5 w-3.5" />
            {label}
        </button>
    );
}

function ActivityCard({ workout, onDelete }: { workout: Workout, onDelete: (id: string) => void }) {
    const isRun = workout.type === 'RUN' || workout.type === 'RUNNING';
    
    const parsedExercises = useMemo<ExerciseItem[]>(() => {
        try { 
            return workout.exercises ? JSON.parse(workout.exercises) : []; 
        } catch { return []; }
    }, [workout.exercises]);

    return (
        <Card className="group border-border/40 bg-card hover:border-primary/30 transition-all rounded-[2rem] shadow-sm hover:shadow-xl overflow-hidden">
            <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                    {/* Indicador de Tipo */}
                    <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner transition-all",
                        isRun 
                            ? "bg-blue-500/10 border-blue-500/20 text-blue-500" 
                            : "bg-primary/10 border-primary/20 text-primary"
                    )}>
                        {isRun ? <Footprints className="h-7 w-7" /> : <Dumbbell className="h-7 w-7" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="min-w-0">
                                <h4 className="font-black text-foreground text-lg uppercase tracking-tight truncate leading-none">
                                    {workout.title}
                                </h4>
                                <div className="flex items-center gap-3 mt-2">
                                    <Badge variant="outline" className="font-mono text-[9px] font-bold bg-muted/30 border-border/40 px-2">
                                        <Clock className="h-3 w-3 mr-1 opacity-40" />
                                        {format(new Date(workout.date), "HH:mm")}
                                    </Badge>
                                    <Badge variant="outline" className="font-mono text-[9px] font-bold bg-muted/30 border-border/40 px-2">
                                        <Timer className="h-3 w-3 mr-1 opacity-40" />
                                        {workout.duration} MIN
                                    </Badge>
                                </div>
                            </div>

                            {/* AÇÕES */}
                            <div className="flex gap-1.5 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-[2.5rem] border-border/40 p-8 shadow-2xl fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md">
                                        <AlertDialogHeader className="flex flex-col items-center text-center">
                                            <div className="h-14 w-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                                                <Trash2 className="h-7 w-7" />
                                            </div>
                                            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter">Excluir Log?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-sm font-medium">Esta atividade será removida permanentemente do histórico biometrizado.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="sm:justify-center gap-3 mt-6">
                                            <AlertDialogCancel className="rounded-xl font-black uppercase text-[10px] tracking-widest h-12 px-6">Abortar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDelete(workout.id)} className="rounded-xl bg-rose-500 text-white hover:bg-rose-600 font-black uppercase text-[10px] tracking-widest h-12 px-6 shadow-lg shadow-rose-500/20">Confirmar Exclusão</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>

                        {/* Badges de Performance */}
                        <div className="flex flex-wrap gap-2">
                            {workout.feeling && (
                                <Badge className={cn(
                                    "text-[9px] font-black uppercase tracking-widest border-none px-2",
                                    workout.feeling === 'GOOD' ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"
                                )}>
                                    Feel: {workout.feeling}
                                </Badge>
                            )}
                            {workout.distance && <MetricBadge icon={Target} value={`${workout.distance} KM`} color="text-blue-500" />}
                            {workout.pace && <MetricBadge icon={Zap} value={`${workout.pace}/KM`} color="text-amber-500" />}
                        </div>

                        {/* LISTA DE EXERCÍCIOS (Se existir) */}
                        {parsedExercises.length > 0 && (
                            <div className="pt-4 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {parsedExercises.map((ex, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground bg-muted/20 p-2 rounded-lg border border-border/40">
                                        <span className="text-foreground uppercase truncate">{ex.name}</span>
                                        {ex.weight && <span className="ml-auto text-primary font-mono tabular-nums">{ex.weight}kg</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// --- HELPERS UI ---

function MetricBadge({ icon: Icon, value, color }: { icon: LucideIcon, value: string, color: string }) {
    return (
        <Badge variant="outline" className={cn("border-current/20 bg-current/5 gap-1.5 font-mono text-[9px] font-black", color)}>
            <Icon className="h-3 w-3" /> {value}
        </Badge>
    );
}

function SeparatorWithIcon({ icon: Icon }: { icon: LucideIcon }) {
    return (
        <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-border/40"></div>
            <div className="mx-4 p-1.5 rounded-lg bg-muted/30 border border-border/60">
                <Icon className="h-3 w-3 text-muted-foreground/40" />
            </div>
            <div className="flex-grow border-t border-border/40"></div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-border/40 rounded-[3rem] bg-muted/5 opacity-50">
            <div className="h-20 w-20 bg-muted/40 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                <History className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter">Fila Vazia</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-3 max-w-[280px] leading-relaxed">
                Nenhuma atividade detectada para este filtro. Inicie um log agora.
            </p>
        </div>
    );
}