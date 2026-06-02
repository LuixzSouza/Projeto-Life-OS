// Tipos compartilhados do planejador semanal de refeições.

export interface MealPlanSlot {
  id: string;
  dayOfWeek: number;
  mealType: string;
  title: string;
  items: string;
  calories: number | null;
}

export interface IngredientRow {
  id: string;
  foodId: string;
  name: string;
  amount: number;
  unit: string;
  unitCalories: number;
}

export interface Suggestion {
  title: string;
  ingredients: IngredientRow[];
  cal: number;
}

export type GoalType = "LOSE_WEIGHT" | "GAIN_MUSCLE";

export interface MealSlotDialogProps {
  dayIdx: number;
  type: string;
  label: string;
  existingSlot?: MealPlanSlot;
}

export interface MealSlotFormProps extends MealSlotDialogProps {
  onClose: () => void;
}
