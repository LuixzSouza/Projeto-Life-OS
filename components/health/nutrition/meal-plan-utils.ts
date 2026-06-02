import type { MealPlanSlot } from "./weekly-planner-types";
import { FOOD_DATABASE } from "@/lib/food-db";

export interface ShoppingItem {
  name: string;
  amount: number;
}

export const fmtQty = (q: number) => (Number.isInteger(q) ? `${q}` : q.toFixed(1).replace(/\.0$/, ""));

export const emojiForFood = (name: string) =>
  FOOD_DATABASE.find(f => f.name.toLowerCase() === name.toLowerCase())?.emoji ?? "🛒";

/**
 * Agrega todos os ingredientes da semana, somando quantidades por alimento.
 * Formato esperado de `items`: "2x Ovo Cozido, 1x Arroz Branco".
 */
export function buildShoppingList(slots: MealPlanSlot[]): ShoppingItem[] {
  const map = new Map<string, number>();

  for (const slot of slots) {
    if (!slot.items) continue;
    for (const raw of slot.items.split(",")) {
      const piece = raw.trim();
      if (!piece) continue;

      const match = piece.match(/^([\d.,]+)\s*x?\s+(.*)$/i);
      const amount = match ? parseFloat(match[1].replace(",", ".")) || 1 : 1;
      const name = (match ? match[2] : piece).trim();
      if (!name) continue;

      map.set(name, (map.get(name) ?? 0) + amount);
    }
  }

  return Array.from(map.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
