"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Save, Dumbbell, Timer, Layers, X, Hash, Weight, ChevronDown } from "lucide-react";
import { logWorkout, updateWorkout } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { Workout } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
  
  const initialExercises = initialData?.exercises 
    ? (JSON.parse(initialData.exercises) as Exercise[])
    : [{ name: "", sets: "", reps: "", weight: "" }];

  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const initialMuscles = initialData?.muscleGroup ? initialData.muscleGroup.split(", ") : [];
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>(initialMuscles);

  const toggleMuscle = (value: string) => {
    setSelectedMuscles(prev => 
      prev.includes(value) ? prev.filter(m => m !== value) : [...prev, value]
    );
  };

  const addExercise = () => {
    setExercises([...exercises, { name: "", sets: "", reps: "", weight: "" }]);
  };
  
  const removeExercise = (index: number) => {
    if (exercises.length === 1) return;
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof Exercise, value: string) => {
    const newEx = [...exercises];
    newEx[index][field] = value;
    setExercises(newEx);
  };

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    const title = formData.get("title") as string;

    if (!title?.trim() || selectedMuscles.length === 0) {
      toast.error("Preencha o nome do treino e selecione os músculos.");
      setIsLoading(false);
      return;
    }

    formData.append("type", "GYM");
    formData.append("muscleGroup", selectedMuscles.join(", "));
    formData.append("exercises", JSON.stringify(exercises));
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
      onSuccess?.();
    } catch (error) {
      toast.error("Erro ao salvar treino.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-8">
      {/* SEÇÃO 1: CABEÇALHO DO TREINO */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-1">
        <div className="md:col-span-8 space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
            Identificação da Sessão
          </Label>
          <div className="relative group">
            <Dumbbell className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              name="title" 
              defaultValue={initialData?.title || ""} 
              placeholder="Ex: Push Day - Hipertrofia" 
              className="h-12 pl-11 rounded-xl bg-muted/20 border-border/40 focus:bg-background transition-all font-bold"
              required 
            />
          </div>
        </div>

        <div className="md:col-span-4 space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
            Duração (Min)
          </Label>
          <div className="relative group">
            <Timer className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              name="duration" 
              type="number" 
              defaultValue={initialData?.duration || 60} 
              className="h-12 pl-11 rounded-xl bg-muted/20 border-border/40 focus:bg-background transition-all font-mono font-bold"
              required 
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: FOCO MUSCULAR */}
      <div className="space-y-3">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          Grupos Ativados
        </Label>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map((group) => {
            const isSelected = selectedMuscles.includes(group.value);
            return (
              <button
                key={group.value}
                type="button"
                onClick={() => toggleMuscle(group.value)}
                className={cn(
                  "h-10 px-4 rounded-xl border text-xs font-bold transition-all flex items-center gap-2",
                  isSelected 
                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-105" 
                    : "bg-muted/30 text-muted-foreground border-border/40 hover:border-primary/50"
                )}
              >
                <span className="text-base">{group.icon}</span>
                {group.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 3: TABELA DE EXERCÍCIOS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Cronograma de Exercícios
          </Label>
          <Badge variant="outline" className="font-mono text-[10px] opacity-60">
            {exercises.length} ITENS
          </Badge>
        </div>

        <div className="border border-border/40 rounded-2xl overflow-hidden bg-muted/10">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/30 border-b border-border/40 text-[9px] font-black uppercase tracking-tighter text-muted-foreground/70">
            <div className="col-span-6 flex items-center gap-2"><Layers className="h-3 w-3" /> Exercício</div>
            <div className="col-span-2 text-center flex items-center justify-center gap-1"><Hash className="h-3 w-3" /> Sets</div>
            <div className="col-span-2 text-center flex items-center justify-center gap-1"><ChevronDown className="h-3 w-3" /> Reps</div>
            <div className="col-span-2 text-center flex items-center justify-center gap-1"><Weight className="h-3 w-3" /> Kg</div>
          </div>

          <div className="divide-y divide-border/20 max-h-[350px] overflow-y-auto custom-scrollbar">
            {exercises.map((ex, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 p-3 items-center group hover:bg-primary/5 transition-colors">
                <div className="col-span-6 relative">
                  <Input 
                    placeholder="Ex: Supino Reto" 
                    className="h-10 bg-transparent border-transparent focus:border-primary/30 focus:bg-background rounded-lg text-sm font-medium transition-all"
                    value={ex.name}
                    onChange={(e) => updateExercise(i, 'name', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input 
                    placeholder="4" 
                    className="h-10 text-center bg-transparent border-transparent focus:border-primary/30 focus:bg-background rounded-lg font-mono text-sm"
                    value={ex.sets}
                    onChange={(e) => updateExercise(i, 'sets', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input 
                    placeholder="12" 
                    className="h-10 text-center bg-transparent border-transparent focus:border-primary/30 focus:bg-background rounded-lg font-mono text-sm"
                    value={ex.reps}
                    onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                  />
                </div>
                <div className="col-span-2 relative flex items-center gap-2">
                  <Input 
                    placeholder="0" 
                    className="h-10 text-center bg-transparent border-transparent focus:border-primary/30 focus:bg-background rounded-lg font-mono text-sm pr-2"
                    value={ex.weight}
                    onChange={(e) => updateExercise(i, 'weight', e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => removeExercise(i)}
                    className="absolute -right-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button 
          type="button" 
          variant="outline" 
          onClick={addExercise} 
          className="w-full border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 h-12 rounded-xl text-xs font-bold gap-2 transition-all"
        >
          <Plus className="h-4 w-4" /> Incluir Novo Exercício
        </Button>
      </div>

      {/* RODAPÉ FIXO DO FORM */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
        <Button 
          type="submit" 
          disabled={isLoading} 
          className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
          {initialData ? "Atualizar Registro" : "Finalizar e Salvar Treino"}
        </Button>
      </div>
    </form>
  );
}