import { Coffee, Utensils, Apple, Moon } from "lucide-react";
import type { GoalType, Suggestion } from "./weekly-planner-types";

export const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export const MEAL_TYPES = [
  { id: "BREAKFAST", label: "Café da Manhã", icon: Coffee, color: "text-amber-600", bg: "bg-amber-500/10" },
  { id: "LUNCH", label: "Almoço", icon: Utensils, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  { id: "SNACK", label: "Lanche", icon: Apple, color: "text-orange-600", bg: "bg-orange-500/10" },
  { id: "DINNER", label: "Jantar", icon: Moon, color: "text-indigo-600", bg: "bg-indigo-500/10" }
];

export const MEAL_ICONS: Record<string, React.ReactNode> = {
  BREAKFAST: <Coffee className="h-4 w-4" />,
  LUNCH: <Utensils className="h-4 w-4" />,
  SNACK: <Apple className="h-4 w-4" />,
  DINNER: <Moon className="h-4 w-4" />
};

export const SMART_SUGGESTIONS: Record<GoalType, Suggestion[]> = {
  "LOSE_WEIGHT": [
    {
      title: "Omelete Fit",
      ingredients: [
        { id: "1", foodId: "egg", name: "Ovo Cozido", amount: 3, unit: "unid", unitCalories: 70 },
        { id: "2", foodId: "cheese", name: "Queijo Mussarela", amount: 1, unit: "30g", unitCalories: 90 }
      ],
      cal: 300
    },
    {
      title: "Salada Proteica",
      ingredients: [
        { id: "1", foodId: "chicken", name: "Peito de Frango", amount: 1, unit: "100g", unitCalories: 165 },
        { id: "2", foodId: "lettuce", name: "Alface", amount: 2, unit: "xíc", unitCalories: 10 }
      ],
      cal: 175
    }
  ],
  "GAIN_MUSCLE": [
    {
      title: "Mingau Turbinado",
      ingredients: [
        { id: "1", foodId: "oats", name: "Aveia", amount: 2, unit: "30g", unitCalories: 120 },
        { id: "2", foodId: "milk", name: "Leite Integral", amount: 1, unit: "200ml", unitCalories: 120 }
      ],
      cal: 360
    },
    {
      title: "Wrap Proteico",
      ingredients: [
        { id: "1", foodId: "beef", name: "Carne Moída", amount: 1, unit: "150g", unitCalories: 250 },
        { id: "2", foodId: "wheat", name: "Tortilla Integral", amount: 1, unit: "unid", unitCalories: 120 }
      ],
      cal: 370
    }
  ]
};
