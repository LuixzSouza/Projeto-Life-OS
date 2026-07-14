"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Save, Dumbbell, Timer, Layers, Hash, Weight, ChevronDown } from "lucide-react";
import { logWorkout, updateWorkout } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MuscleBodyIcon } from "./muscle-body-icon";
import { EXERCISES_BY_GROUP } from "./exercise-db";

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  weight: string;
}

// Shape mínimo para criação e edição (compatível com GymWorkout serializado).
export interface GymFormInitial {
  id: string;
  title: string;
  duration: number;
  muscleGroup: string | null;
  exercises: string; // JSON string
}

interface GymFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
  initialData?: GymFormInitial;
}

const MUSCLE_GROUPS = [
  { value: "Peito", label: "Peito" },
  { value: "Costas", label: "Costas" },
  { value: "Pernas", label: "Pernas" },
  { value: "Ombros", label: "Ombros" },
  { value: "Biceps", label: "Bíceps" },
  { value: "Triceps", label: "Tríceps" },
  { value: "Abdomen", label: "Abdômen" },
  { value: "Cardio", label: "Cardio" },
];

export function GymForm({ onSuccess, initialData }: GymFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const initialExercises: Exercise[] = (() => {
    if (!initialData?.exercises) return [{ name: "", sets: "", reps: "", weight: "" }];
    try {
      const parsed = JSON.parse(initialData.exercises) as Exercise[];
      return Array.isArray(parsed) && parsed.length ? parsed : [{ name: "", sets: "", reps: "", weight: "" }];
    } catch {
      return [{ name: "", sets: "", reps: "", weight: "" }];
    }
  })();

  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  // Editando um treino da sessão ao vivo? (tem setLog → avisar que o detalhe edita série a série)
  const hasDetailedSets = initialExercises.some((e) => Array.isArray((e as { setLog?: unknown }).setLog));
  const initialMuscles = initialData?.muscleGroup ? initialData.muscleGroup.split(", ") : [];
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>(initialMuscles);

  const toggleMuscle = (value: string) => {
    setSelectedMuscles(prev =>
      prev.includes(value) ? prev.filter(m => m !== value) : [...prev, value]
    );
  };

  const addExercise = () => setExercises([...exercises, { name: "", sets: "", reps: "", weight: "" }]);
  const removeExercise = (index: number) => {
    if (exercises.length === 1) return;
    setExercises(exercises.filter((_, i) => i !== index));
  };

  // Insere um exercício a partir de uma sugestão (com séries/reps padrão para agilizar).
  // Se já existir, remove (toggle); preenche a 1ª linha vazia ou adiciona uma nova.
  const toggleSuggestion = (name: string) => {
    const exists = exercises.some(e => e.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      const remaining = exercises.filter(e => e.name.toLowerCase() !== name.toLowerCase());
      setExercises(remaining.length ? remaining : [{ name: "", sets: "", reps: "", weight: "" }]);
      return;
    }
    const newRow = { name, sets: "3", reps: "12", weight: "" };
    setExercises(prev => {
      const firstEmpty = prev.findIndex(e => !e.name.trim());
      if (firstEmpty !== -1) {
        const copy = [...prev];
        copy[firstEmpty] = newRow;
        return copy;
      }
      return [...prev, newRow];
    });
  };

  // Sugestões dos grupos selecionados (sem duplicar nomes entre grupos).
  const suggestions = (() => {
    const seen = new Set<string>();
    const out: { group: string; items: string[] }[] = [];
    for (const g of selectedMuscles) {
      const items = (EXERCISES_BY_GROUP[g] || []).filter(n => {
        const k = n.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      if (items.length) out.push({ group: g, items });
    }
    return out;
  })();

  const addedNames = new Set(exercises.map(e => e.name.toLowerCase()));
  const updateExercise = (index: number, field: keyof Exercise, value: string) => {
    const newEx = [...exercises];
    newEx[index][field] = value;
    setExercises(newEx);
  };

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    const title = formData.get("title") as string;

    if (!title?.trim() || selectedMuscles.length === 0) {
      toast.error("Preencha o nome do treino e selecione ao menos um músculo.");
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
    } catch {
      toast.error("Erro ao salvar treino.");
    } finally {
      setIsLoading(false);
    }
  };

  const labelCls = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1";

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* SEÇÃO 1: CABEÇALHO */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 space-y-1.5">
          <Label className={labelCls}>Nome da sessão</Label>
          <div className="relative group">
            <Dumbbell className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              name="title"
              defaultValue={initialData?.title || ""}
              placeholder="Ex: Push Day - Hipertrofia"
              className="h-11 pl-10 rounded-xl bg-muted/40 border-border/40 focus-visible:bg-background font-semibold"
              required
            />
          </div>
        </div>

        <div className="md:col-span-4 space-y-1.5">
          <Label className={labelCls}>Duração (min)</Label>
          <div className="relative group">
            <Timer className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              name="duration"
              type="number"
              defaultValue={initialData?.duration || 60}
              className="h-11 pl-10 rounded-xl bg-muted/40 border-border/40 focus-visible:bg-background font-mono font-semibold"
              required
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: FOCO MUSCULAR (tiles com ícone do corpo) */}
      <div className="space-y-2">
        <Label className={labelCls}>Grupos ativados</Label>
        <div className="grid grid-cols-4 gap-2">
          {MUSCLE_GROUPS.map((group) => {
            const isSelected = selectedMuscles.includes(group.value);
            return (
              <button
                key={group.value}
                type="button"
                onClick={() => toggleMuscle(group.value)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/40 bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
                )}
              >
                <MuscleBodyIcon group={group.value} className="h-9 w-7" />
                <span className={cn("text-[10px] font-semibold", isSelected ? "text-primary" : "text-muted-foreground")}>
                  {group.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 3: EXERCÍCIOS */}
      <div className="space-y-3">
        {/* Treino da sessão ao vivo: o resumo abaixo NÃO altera as séries detalhadas
            (setLog) — os gráficos leem delas. A edição série a série fica no detalhe. */}
        {hasDetailedSets && (
          <p className="rounded-lg bg-amber-400/10 px-2.5 py-2 text-[11px] font-medium leading-relaxed text-amber-600">
            Este treino tem séries detalhadas da sessão ao vivo. Para corrigir carga/reps
            série a série (o que os gráficos usam), toque no treino e use <span className="font-semibold">“Editar séries”</span>.
          </p>
        )}
        <div className="flex items-center justify-between px-1">
          <Label className={labelCls}>Exercícios</Label>
          <Badge variant="secondary" className="font-mono text-[10px] bg-muted/60 text-muted-foreground border-none">
            {exercises.length} {exercises.length === 1 ? "item" : "itens"}
          </Badge>
        </div>

        {/* Sugestões por grupo muscular selecionado (clique para adicionar) */}
        {suggestions.length > 0 ? (
          <div className="space-y-2.5 p-3 rounded-xl bg-primary/[0.03] border border-primary/15">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80 flex items-center gap-1.5">
              <Plus className="h-3 w-3" /> Sugestões rápidas
            </p>
            <div className="space-y-2.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
              {suggestions.map(({ group, items }) => (
                <div key={group} className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground">{group}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((name) => {
                      const added = addedNames.has(name.toLowerCase());
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleSuggestion(name)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all",
                            added
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border/50 text-foreground hover:border-primary/50 hover:bg-primary/5"
                          )}
                        >
                          {added ? "✓ " : "+ "}{name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground px-1">
            Selecione um grupo muscular acima para ver sugestões de exercícios.
          </p>
        )}

        <div className="border border-border/40 rounded-xl overflow-hidden bg-muted/10">
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/30 border-b border-border/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            <div className="col-span-6 flex items-center gap-1.5"><Layers className="h-3 w-3" /> Exercício</div>
            <div className="col-span-2 text-center flex items-center justify-center gap-1"><Hash className="h-3 w-3" /> Sets</div>
            <div className="col-span-2 text-center flex items-center justify-center gap-1"><ChevronDown className="h-3 w-3" /> Reps</div>
            <div className="col-span-2 text-center flex items-center justify-center gap-1"><Weight className="h-3 w-3" /> Kg</div>
          </div>

          <div className="divide-y divide-border/20 max-h-[320px] overflow-y-auto custom-scrollbar">
            {exercises.map((ex, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 p-2.5 items-center group hover:bg-primary/5 transition-colors">
                <div className="col-span-6">
                  <Input
                    placeholder="Ex: Supino Reto"
                    className="h-9 bg-transparent border-transparent focus-visible:border-primary/30 focus-visible:bg-background rounded-lg text-sm font-medium"
                    value={ex.name}
                    onChange={(e) => updateExercise(i, 'name', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input placeholder="4" className="h-9 text-center bg-transparent border-transparent focus-visible:border-primary/30 focus-visible:bg-background rounded-lg font-mono text-sm" value={ex.sets} onChange={(e) => updateExercise(i, 'sets', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Input placeholder="12" className="h-9 text-center bg-transparent border-transparent focus-visible:border-primary/30 focus-visible:bg-background rounded-lg font-mono text-sm" value={ex.reps} onChange={(e) => updateExercise(i, 'reps', e.target.value)} />
                </div>
                <div className="col-span-2 relative flex items-center">
                  <Input placeholder="0" className="h-9 text-center bg-transparent border-transparent focus-visible:border-primary/30 focus-visible:bg-background rounded-lg font-mono text-sm" value={ex.weight} onChange={(e) => updateExercise(i, 'weight', e.target.value)} />
                  <button type="button" onClick={() => removeExercise(i)} className="absolute -right-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button type="button" variant="outline" onClick={addExercise} className="w-full border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 h-10 rounded-xl text-xs font-semibold gap-2">
          <Plus className="h-4 w-4" /> Incluir exercício
        </Button>
      </div>

      {/* RODAPÉ */}
      <div className="pt-4 border-t border-border/40">
        <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl font-bold gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {initialData ? "Atualizar treino" : "Salvar treino"}
        </Button>
      </div>
    </form>
  );
}
