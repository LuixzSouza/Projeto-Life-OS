"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { logWorkout, updateWorkout } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { DialogFooter } from "@/components/ui/dialog";
import { Workout } from "@prisma/client";

// Interface do Exercício
interface Exercise {
    name: string;
    sets: string;
    reps: string;
    weight: string;
}

// Interface das Props (inclui onSuccess)
interface GymFormProps {
    onSuccess?: () => void;
    onClose?: () => void;
    initialData?: Workout;
}

export function GymForm({ onSuccess, onClose, initialData }: GymFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    // Parse inicial dos exercícios se for edição
    const initialExercises = initialData?.exercises 
        ? JSON.parse(initialData.exercises) as Exercise[]
        : [{ name: "", sets: "", reps: "", weight: "" }];

    const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
    const [muscleGroup, setMuscleGroup] = useState(initialData?.muscleGroup || "CHEST");

    const addExercise = () => setExercises([...exercises, { name: "", sets: "", reps: "", weight: "" }]);
    
    const removeExercise = (index: number) => {
        const newEx = [...exercises];
        newEx.splice(index, 1);
        setExercises(newEx);
    };

    const updateExercise = (index: number, field: keyof Exercise, value: string) => {
        const newEx = [...exercises];
        newEx[index][field] = value;
        setExercises(newEx);
    };

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        
        // Dados manuais que não vêm dos inputs diretos
        formData.append("type", "GYM");
        formData.append("muscleGroup", muscleGroup);
        formData.append("exercises", JSON.stringify(exercises));
        formData.append("intensity", "HIGH"); // Pode virar um select no futuro
        
        try {
            if (initialData) {
                formData.append("id", initialData.id);
                await updateWorkout(formData);
                toast.success("Treino atualizado!");
            } else {
                await logWorkout(formData);
                toast.success("Treino registrado! 💪");
            }
            
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (error) {
            toast.error("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form action={handleSubmit} className="space-y-5 py-2">
            
            {/* Linha 1: Foco e Nome */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-zinc-500">Foco Muscular</Label>
                    <Select value={muscleGroup} onValueChange={setMuscleGroup}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="CHEST">Peito 💪</SelectItem>
                            <SelectItem value="BACK">Costas 🦅</SelectItem>
                            <SelectItem value="LEGS">Pernas 🦵</SelectItem>
                            <SelectItem value="SHOULDERS">Ombros 🥥</SelectItem>
                            <SelectItem value="ARMS">Braços 💪</SelectItem>
                            <SelectItem value="ABS">Abdômen 🍫</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                     <Label className="text-xs uppercase font-bold text-zinc-500">Nome do Treino</Label>
                     <Input name="title" defaultValue={initialData?.title} placeholder="Ex: Treino A" className="h-9" required />
                </div>
            </div>
            
            <div className="space-y-2">
                 <Label className="text-xs uppercase font-bold text-zinc-500">Duração Estimada (min)</Label>
                 <Input name="duration" type="number" defaultValue={initialData?.duration || 60} className="h-9" required />
            </div>

            {/* Lista de Exercícios */}
            <div className="space-y-3 border rounded-lg p-3 max-h-[350px] overflow-y-auto bg-zinc-50 dark:bg-zinc-900/50">
                <div className="flex justify-between items-center mb-2">
                    <Label className="text-xs text-zinc-500 uppercase font-bold flex items-center gap-1">
                        Exercícios <span className="text-[10px] font-normal opacity-70">({exercises.length})</span>
                    </Label>
                    <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-medium">Nome / Séries / Reps / Carga</span>
                </div>
                
                <div className="space-y-2">
                    {exercises.map((ex, i) => (
                        <div key={i} className="flex gap-2 items-center animate-in fade-in slide-in-from-left-2">
                            <Input 
                                placeholder="Nome do exercício" 
                                className="flex-[3] h-8 text-sm bg-white dark:bg-zinc-950" 
                                value={ex.name}
                                onChange={(e) => updateExercise(i, 'name', e.target.value)}
                                autoFocus={i === exercises.length - 1 && !initialData} // Foca no novo item
                            />
                            <Input 
                                placeholder="3" 
                                className="flex-1 min-w-[30px] text-center h-8 text-sm bg-white dark:bg-zinc-950 px-1" 
                                value={ex.sets}
                                onChange={(e) => updateExercise(i, 'sets', e.target.value)}
                            />
                            <Input 
                                placeholder="12" 
                                className="flex-1 min-w-[30px] text-center h-8 text-sm bg-white dark:bg-zinc-950 px-1" 
                                value={ex.reps}
                                onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                            />
                             <Input 
                                placeholder="kg" 
                                className="flex-1 min-w-[40px] text-center h-8 text-sm bg-white dark:bg-zinc-950 px-1" 
                                value={ex.weight}
                                onChange={(e) => updateExercise(i, 'weight', e.target.value)}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeExercise(i)} className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <Button type="button" variant="outline" size="sm" onClick={addExercise} className="w-full border-dashed h-9 text-xs mt-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <Plus className="h-3 w-3 mr-2" /> Adicionar Exercício
                </Button>
            </div>

            <DialogFooter>
                <Button type="submit" disabled={isLoading} className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    {isLoading ? "Salvando..." : (initialData ? "Salvar Alterações" : "Finalizar Treino")}
                </Button>
            </DialogFooter>
        </form>
    )
}