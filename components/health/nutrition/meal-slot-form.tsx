"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveMealPlanSlot } from "@/app/(dashboard)/health/actions";

import { FOOD_DATABASE } from "@/lib/food-db";
import type { GoalType, IngredientRow, Suggestion, MealSlotFormProps } from "./weekly-planner-types";

import { CalorieSummary } from "./meal-slot/calorie-summary";
import { FoodSearch } from "./meal-slot/food-search";
import { IngredientList } from "./meal-slot/ingredient-list";
import { SmartSuggestions } from "./meal-slot/smart-suggestions";

// --- FORMULÁRIO DE EDIÇÃO ---
export function MealSlotForm({ dayIdx, type, existingSlot, onClose }: MealSlotFormProps) {
  const [title, setTitle] = useState(existingSlot?.title || "");
  const [goal, setGoal] = useState<GoalType>("LOSE_WEIGHT");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [ingredients, setIngredients] = useState<IngredientRow[]>(() => {
    if (existingSlot?.items) {
      return existingSlot.items.split(',').map((item, idx) => {
        const parts = item.trim().split(' ');
        const quantityStr = parts[0]?.replace('x', '') || "1";
        const amount = parseFloat(quantityStr) || 1;
        const name = parts.slice(1).join(' ') || item.trim();

        const dbFood = FOOD_DATABASE.find(f => f.name.toLowerCase() === name.toLowerCase());

        return {
          id: idx.toString(),
          foodId: dbFood?.id || "custom",
          name: name,
          amount: amount,
          unit: dbFood?.unit || "porção",
          unitCalories: dbFood?.calories || 0
        };
      });
    }
    return [];
  });

  const totalCalories = useMemo(() => {
    return ingredients.reduce((acc, item) => {
      return acc + Math.round(item.amount * item.unitCalories);
    }, 0);
  }, [ingredients]);

  const addIngredient = (foodId: string) => {
    const food = FOOD_DATABASE.find(f => f.id === foodId);
    if (!food) return;

    setIngredients(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        foodId: food.id,
        name: food.name,
        amount: 1,
        unit: food.unit,
        unitCalories: food.calories
      }
    ]);

    if (!title) setTitle(food.name);
    setSearchOpen(false);
  };

  const updateAmount = (id: string, newAmount: number) => {
    setIngredients(prev => prev.map(item =>
      item.id === id ? { ...item, amount: newAmount } : item
    ));
  };

  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(item => item.id !== id));
  };

  const applySuggestion = (suggestion: Suggestion) => {
    setTitle(suggestion.title);
    const mappedIngredients = suggestion.ingredients.map(ing => ({
      ...ing,
      id: Math.random().toString()
    }));
    setIngredients(mappedIngredients);
    toast.success("Sugestão aplicada com sucesso!");
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Defina um nome para o prato.");
      return;
    }

    const itemsString = ingredients
      .map(ing => `${ing.amount}x ${ing.name}`)
      .join(', ');

    const formData = new FormData();
    formData.append("dayOfWeek", dayIdx.toString());
    formData.append("mealType", type);
    formData.append("title", title);
    formData.append("items", itemsString);
    formData.append("calories", totalCalories.toString());

    setIsSaving(true);
    try {
      await saveMealPlanSlot(formData);
      toast.success("Planejamento salvo com sucesso!");
      onClose();
    } catch {
      toast.error("Erro ao salvar planejamento.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DialogBody className="space-y-6">
        {/* CABEÇALHO DO PRATO */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <span className="text-foreground">Nome da Refeição</span>
            <span className="text-destructive">*</span>
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Almoço Fit Segunda-feira"
            className="h-12 text-base font-medium bg-background border-primary/20 focus:border-primary"
            autoFocus
          />
        </div>

        <CalorieSummary totalCalories={totalCalories} />

        <Separator className="bg-border/50" />

        <FoodSearch
          searchOpen={searchOpen}
          setSearchOpen={setSearchOpen}
          ingredients={ingredients}
          onAdd={addIngredient}
        />

        <IngredientList
          ingredients={ingredients}
          onUpdateAmount={updateAmount}
          onRemove={removeIngredient}
        />

        <SmartSuggestions goal={goal} setGoal={setGoal} onApply={applySuggestion} />
      </DialogBody>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isSaving}
          className="sm:flex-1 h-11 border-border/50 hover:border-primary/30"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSaving}
          className="sm:flex-1 h-11 gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-primary/25 transition-all duration-200"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar Refeição
        </Button>
      </DialogFooter>
    </>
  );
}
