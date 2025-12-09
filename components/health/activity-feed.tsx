"use client";

import { useState } from "react";
import { Workout } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Dumbbell, Footprints, Clock, MapPin, Trash2, History, Pencil } from "lucide-react";
import { deleteWorkout } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { GymForm } from "./gym-form";
import { RunForm } from "./run-form";

// ... (Interface ExerciseItem mantida) ...
interface ExerciseItem {
    name: string;
    weight: string;
    sets?: string;
    reps?: string;
}

export function ActivityFeed({ initialWorkouts }: { initialWorkouts: Workout[] }) {
    const [filter, setFilter] = useState<'ALL' | 'GYM' | 'RUN'>('ALL');
    const [visibleCount, setVisibleCount] = useState(5);

    const filteredWorkouts = initialWorkouts.filter(w => {
        if (filter === 'ALL') return true;
        return w.type === filter;
    });

    const visibleWorkouts = filteredWorkouts.slice(0, visibleCount);

    const handleDelete = async (id: string) => {
        if(confirm("Apagar atividade?")) {
            await deleteWorkout(id);
            toast.success("Atividade removida.");
        }
    }

    return (
        <div className="space-y-6">
            {/* ... (Header com Filtros mantido) ... */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-zinc-400" />
                    <h3 className="font-semibold text-lg text-zinc-800 dark:text-zinc-200">Diário de Atividades</h3>
                    <Badge variant="secondary" className="ml-2">{filteredWorkouts.length}</Badge>
                </div>
                
                <div className="flex gap-2">
                    <Button variant={filter === 'ALL' ? "default" : "outline"} size="sm" onClick={() => setFilter('ALL')} className="text-xs h-8">Todos</Button>
                    <Button variant={filter === 'GYM' ? "default" : "outline"} size="sm" onClick={() => setFilter('GYM')} className="text-xs h-8 gap-1"><Dumbbell className="h-3 w-3" /> Treino</Button>
                    <Button variant={filter === 'RUN' ? "default" : "outline"} size="sm" onClick={() => setFilter('RUN')} className="text-xs h-8 gap-1"><Footprints className="h-3 w-3" /> Corrida</Button>
                </div>
            </div>

            <div className="grid gap-3">
                {visibleWorkouts.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed rounded-xl bg-zinc-50 dark:bg-zinc-900/50">
                        <p className="text-zinc-400 text-sm">Nenhuma atividade encontrada neste filtro.</p>
                    </div>
                ) : visibleWorkouts.map((w) => {
                    const isRun = w.type === 'RUN';
                    
                    let parsedExercises: ExerciseItem[] = [];
                    if (w.exercises) {
                        try { parsedExercises = JSON.parse(w.exercises); } catch {}
                    }

                    return (
                        <Card key={w.id} className="group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm">
                            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 sm:items-start">
                                
                                {/* Ícone Lateral */}
                                <div className={`p-3 rounded-xl w-fit shrink-0 ${isRun ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'}`}>
                                    {isRun ? <Footprints className="h-5 w-5" /> : <Dumbbell className="h-5 w-5" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                                                {w.title} 
                                                {w.feeling && <span className="text-[10px] font-normal bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">{w.feeling}</span>}
                                            </h4>
                                            <p className="text-xs text-zinc-500 mt-0.5">
                                                {new Date(w.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                        
                                        {/* AÇÕES: EDITAR E DELETAR */}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            
                                            {/* BOTÃO EDITAR COM MODAL INTELIGENTE */}
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-300 hover:text-blue-500">
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                                                    <DialogHeader>
                                                        <DialogTitle>Editar {isRun ? 'Corrida' : 'Treino'}</DialogTitle>
                                                    </DialogHeader>
                                                    {/* Renderiza o form correto baseado no tipo */}
                                                    {isRun ? <RunForm initialData={w} /> : <GymForm initialData={w} />}
                                                </DialogContent>
                                            </Dialog>

                                            <Button size="icon" variant="ghost" onClick={() => handleDelete(w.id)} className="h-6 w-6 text-zinc-300 hover:text-red-500">
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* ... (Métricas e Exercícios mantidos) ... */}
                                    <div className="flex flex-wrap gap-3 mt-3">
                                        <Badge variant="outline" className="font-normal text-zinc-600 dark:text-zinc-400 gap-1 bg-zinc-50 dark:bg-zinc-900">
                                            <Clock className="h-3 w-3" /> {w.duration} min
                                        </Badge>
                                        {w.distance && (
                                            <Badge variant="outline" className="font-normal text-blue-600 dark:text-blue-400 gap-1 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900">
                                                <MapPin className="h-3 w-3" /> {w.distance} km
                                            </Badge>
                                        )}
                                        {w.pace && (
                                            <Badge variant="outline" className="font-normal text-zinc-500 gap-1">
                                                ⚡ {w.pace} /km
                                            </Badge>
                                        )}
                                    </div>

                                    {parsedExercises.length > 0 && (
                                        <div className="mt-3 pt-2 border-t border-dashed border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-1">
                                            {parsedExercises.slice(0, 5).map((ex, i) => (
                                                <span key={i} className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded">
                                                    {ex.name} <span className="opacity-50">{ex.weight ? `(${ex.weight}kg)` : ''}</span>
                                                </span>
                                            ))}
                                            {parsedExercises.length > 5 && <span className="text-[10px] text-zinc-400 px-1">+{parsedExercises.length - 5}</span>}
                                        </div>
                                    )}

                                    {!parsedExercises.length && w.notes && (
                                        <p className="text-xs text-zinc-500 italic mt-2 line-clamp-2 bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded">
                                            &quot;{w.notes}&quot;
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {visibleCount < filteredWorkouts.length && (
                <div className="text-center pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setVisibleCount(prev => prev + 5)} className="text-zinc-500">
                        Carregar mais atividades ({filteredWorkouts.length - visibleCount} restantes)
                    </Button>
                </div>
            )}
        </div>
    );
}