"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge"; // Import Badge
import { Plus, Trash2, Loader2, Save, Dumbbell, Timer, Layers, X } from "lucide-react";
import { logWorkout, updateWorkout } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { DialogFooter } from "@/components/ui/dialog";
import { Workout } from "@prisma/client";
import { cn } from "@/lib/utils";

// --- Types ---
interface Exercise {
  name: string;
  sets: string;
  reps: string;
  weight: string;
}

interface GymFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
  initialData?: Workout;
}

// Lista expandida para cobrir mais casos
const MUSCLE_GROUPS = [
  { value: "Peito", label: "Peito", icon: "💪" },
  { value: "Costas", label: "Costas", icon: "🦅" },
  { value: "Pernas", label: "Pernas", icon: "🦵" },
  { value: "Ombros", label: "Ombros", icon: "🥥" },
  { value: "Biceps", label: "Bíceps", icon: "💪" },
  { value: "Triceps", label: "Tríceps", icon: "🦾" },
  { value: "Abdomen", label: "Abdômen", icon: "🍫" },
  { value: "Cardio", label: "Cardio", icon: "🏃" },
];

export function GymForm({ onSuccess, onClose, initialData }: GymFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize Exercises
  const initialExercises = initialData?.exercises 
    ? (JSON.parse(initialData.exercises) as Exercise[])
    : [{ name: "", sets: "", reps: "", weight: "" }];

  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  
  // Initialize Selected Muscles (Split string by comma if exists)
  const initialMuscles = initialData?.muscleGroup 
    ? initialData.muscleGroup.split(", ") 
    : [];
    
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>(initialMuscles);

  // --- Handlers ---

  const toggleMuscle = (value: string) => {
    setSelectedMuscles(prev => 
      prev.includes(value) 
        ? prev.filter(m => m !== value) 
        : [...prev, value]
    );
  };

  const addExercise = () => {
    setExercises([...exercises, { name: "", sets: "", reps: "", weight: "" }]);
  };
  
  const removeExercise = (index: number) => {
    if (exercises.length === 1) {
        toast.error("O treino precisa de pelo menos 1 exercício.");
        return;
    }
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
    
    // Validate basics
    const title = formData.get("title") as string;
    if (!title?.trim()) {
        toast.error("Nome do treino é obrigatório.");
        setIsLoading(false);
        return;
    }

    if (selectedMuscles.length === 0) {
        toast.warning("Selecione pelo menos um grupo muscular.");
        setIsLoading(false);
        return;
    }

    // Join muscles into a single string (e.g., "Peito, Tríceps")
    const muscleString = selectedMuscles.join(", ");

    // Append manual data
    formData.append("type", "GYM");
    formData.append("muscleGroup", muscleString); // Updated to send combined string
    formData.append("exercises", JSON.stringify(exercises));
    formData.append("intensity", "HIGH"); // Default for now
    
    try {
      if (initialData) {
        formData.append("id", initialData.id);
        await updateWorkout(formData);
        toast.success("Treino atualizado com sucesso!");
      } else {
        await logWorkout(formData);
        toast.success("Treino registrado! 💪");
      }
      
      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar treino.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-6 py-2">
      
      {/* --- Section 1: Meta Data --- */}
      <div className="space-y-4">
        
        {/* Title & Duration Row */}
        <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8 space-y-2">
               <Label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                 <Dumbbell className="h-3.5 w-3.5" /> Nome do Treino
               </Label>
               <Input 
                 name="title" 
                 defaultValue={initialData?.title || ""} 
                 placeholder="Ex: Treino A - Superior" 
                 className="bg-background border-border/60 focus-visible:ring-primary/20" 
                 required 
               />
            </div>

            <div className="col-span-4 space-y-2">
               <Label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                 <Timer className="h-3.5 w-3.5" /> Min
               </Label>
               <Input 
                 name="duration" 
                 type="number" 
                 defaultValue={initialData?.duration || 60} 
                 className="bg-background border-border/60 focus-visible:ring-primary/20 text-center" 
                 required 
               />
            </div>
        </div>

        {/* Multi-Select Muscle Groups */}
        <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Foco Muscular (Múltipla Escolha)
            </Label>
            <div className="flex flex-wrap gap-2 p-3 bg-muted/20 border border-border/50 rounded-lg">
                {MUSCLE_GROUPS.map((group) => {
                    const isSelected = selectedMuscles.includes(group.value);
                    return (
                        <Badge
                            key={group.value}
                            variant="outline"
                            onClick={() => toggleMuscle(group.value)}
                            className={cn(
                                "cursor-pointer transition-all hover:border-primary/50 text-xs py-1 px-3 select-none flex items-center gap-1",
                                isSelected 
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                            )}
                        >
                            <span>{group.icon}</span>
                            {group.label}
                            {isSelected && <X className="h-3 w-3 ml-1 opacity-50" />}
                        </Badge>
                    );
                })}
            </div>
            {selectedMuscles.length === 0 && (
                <p className="text-[10px] text-destructive font-medium ml-1">* Selecione ao menos um foco.</p>
            )}
        </div>

      </div>
      
      {/* --- Section 2: Exercise List --- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                Exercícios
                <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full">
                    {exercises.length}
                </span>
            </Label>
        </div>

        <div className="bg-muted/20 border border-border/50 rounded-xl p-1 max-h-[400px] overflow-y-auto custom-scrollbar">
            {/* Table Header (Visual only) */}
            <div className="flex gap-2 px-2 py-1 mb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <span className="flex-[4]">Nome</span>
                <span className="flex-1 text-center">Séries</span>
                <span className="flex-1 text-center">Reps</span>
                <span className="flex-1 text-center">Kg</span>
                <span className="w-8"></span>
            </div>

            <div className="space-y-1">
                {exercises.map((ex, i) => (
                    <div key={i} className="flex gap-2 items-center group animate-in fade-in slide-in-from-left-1 duration-300">
                        <Input 
                            placeholder="Nome..." 
                            className="flex-[4] h-9 text-sm bg-background border-transparent hover:border-border focus:border-primary/50 transition-all shadow-sm" 
                            value={ex.name}
                            onChange={(e) => updateExercise(i, 'name', e.target.value)}
                            // Auto-focus only on new rows added manually, not initial load
                            autoFocus={i === exercises.length - 1 && exercises.length > 1} 
                        />
                        <Input 
                            placeholder="3" 
                            className="flex-1 min-w-[40px] text-center h-9 text-sm bg-background border-transparent hover:border-border focus:border-primary/50 transition-all shadow-sm p-1" 
                            value={ex.sets}
                            onChange={(e) => updateExercise(i, 'sets', e.target.value)}
                        />
                        <Input 
                            placeholder="10" 
                            className="flex-1 min-w-[40px] text-center h-9 text-sm bg-background border-transparent hover:border-border focus:border-primary/50 transition-all shadow-sm p-1" 
                            value={ex.reps}
                            onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                        />
                         <Input 
                            placeholder="kg" 
                            className="flex-1 min-w-[40px] text-center h-9 text-sm bg-background border-transparent hover:border-border focus:border-primary/50 transition-all shadow-sm p-1" 
                            value={ex.weight}
                            onChange={(e) => updateExercise(i, 'weight', e.target.value)}
                        />
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeExercise(i)} 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>

        <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={addExercise} 
            className="w-full border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 h-10 transition-all"
        >
            <Plus className="h-4 w-4 mr-2" /> Adicionar Exercício
        </Button>
      </div>

      <DialogFooter className="border-t border-border pt-4 mt-2">
        <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full sm:w-auto min-w-[150px] bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 font-semibold"
        >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {initialData ? "Salvar Alterações" : "Registrar Treino"}
        </Button>
      </DialogFooter>
    </form>
  );
}