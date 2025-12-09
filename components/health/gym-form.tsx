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

interface Exercise {
    name: string;
    sets: string;
    reps: string;
    weight: string;
}

export function GymForm({ onClose, initialData }: { onClose?: () => void, initialData?: Workout }) {
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
        formData.append("type", "GYM");
        formData.append("muscleGroup", muscleGroup);
        formData.append("exercises", JSON.stringify(exercises));
        formData.append("duration", formData.get("duration") || "60"); 
        formData.append("intensity", "HIGH"); 
        
        try {
            if (initialData) {
                formData.append("id", initialData.id);
                await updateWorkout(formData);
                toast.success("Treino atualizado!");
            } else {
                await logWorkout(formData);
                toast.success("Treino registrado! 💪");
            }
            if(onClose) onClose();
        } catch (error) {
            toast.error("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4 py-2">
            <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                    <Label>Foco</Label>
                    <Select value={muscleGroup} onValueChange={setMuscleGroup}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="CHEST">Peito 💪</SelectItem>
                            <SelectItem value="BACK">Costas 🦅</SelectItem>
                            <SelectItem value="LEGS">Pernas 🦵</SelectItem>
                            <SelectItem value="SHOULDERS">Ombros 🥥</SelectItem>
                            <SelectItem value="ARMS">Braços 💪</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
                     <Label>Nome</Label>
                     <Input name="title" defaultValue={initialData?.title} placeholder="Ex: Treino A" required />
                </div>
            </div>
            
            <div className="space-y-2">
                 <Label>Duração (min)</Label>
                 <Input name="duration" type="number" defaultValue={initialData?.duration || 60} required />
            </div>

            <div className="space-y-3 border rounded-lg p-3 max-h-[300px] overflow-y-auto bg-zinc-50 dark:bg-zinc-900">
                <div className="flex justify-between items-center">
                    <Label className="text-xs text-zinc-500 uppercase font-bold">Exercícios</Label>
                    <span className="text-[10px] text-zinc-400">Nome | Séries | Reps | Kg</span>
                </div>
                
                {exercises.map((ex, i) => (
                    <div key={i} className="flex gap-2 items-center animate-in fade-in slide-in-from-left-2">
                        <Input 
                            placeholder="Exercício" 
                            className="flex-[2] h-8 text-sm" 
                            value={ex.name}
                            onChange={(e) => updateExercise(i, 'name', e.target.value)}
                        />
                        <Input 
                            placeholder="3" 
                            className="w-12 text-center h-8 text-sm" 
                            value={ex.sets}
                            onChange={(e) => updateExercise(i, 'sets', e.target.value)}
                        />
                        <Input 
                            placeholder="12" 
                            className="w-12 text-center h-8 text-sm" 
                            value={ex.reps}
                            onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                        />
                         <Input 
                            placeholder="20" 
                            className="w-14 text-center h-8 text-sm" 
                            value={ex.weight}
                            onChange={(e) => updateExercise(i, 'weight', e.target.value)}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeExercise(i)} className="h-8 w-8 text-red-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addExercise} className="w-full border-dashed h-8 text-xs">
                    <Plus className="h-3 w-3 mr-2" /> Adicionar Exercício
                </Button>
            </div>

            <DialogFooter>
                <Button type="submit" disabled={isLoading} className="w-full bg-zinc-900 text-white hover:bg-zinc-800">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (initialData ? "Salvar Alterações" : "Finalizar Treino")}
                </Button>
            </DialogFooter>
        </form>
    )
}