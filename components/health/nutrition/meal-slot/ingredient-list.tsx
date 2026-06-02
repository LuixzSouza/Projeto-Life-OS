import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, X } from "lucide-react";
import type { IngredientRow } from "../weekly-planner-types";

interface IngredientListProps {
  ingredients: IngredientRow[];
  onUpdateAmount: (id: string, newAmount: number) => void;
  onRemove: (id: string) => void;
}

export function IngredientList({ ingredients, onUpdateAmount, onRemove }: IngredientListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Ingredientes Adicionados</Label>
        <span className="text-xs text-muted-foreground">
          {ingredients.length} item{ingredients.length !== 1 ? 's' : ''}
        </span>
      </div>

      {ingredients.length > 0 ? (
        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
          {ingredients.map((ing) => (
            <div
              key={ing.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-gradient-to-r from-background to-muted/5 hover:border-primary/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{ing.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {ing.unitCalories} kcal / {ing.unit}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-md hover:bg-muted"
                    onClick={() => onUpdateAmount(ing.id, Math.max(0.1, ing.amount - 0.1))}
                  >
                    <span className="sr-only">Diminuir</span>
                    -
                  </Button>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    className="w-12 text-center bg-transparent text-sm font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={ing.amount}
                    onChange={(e) => onUpdateAmount(ing.id, parseFloat(e.target.value) || 0)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-md hover:bg-muted"
                    onClick={() => onUpdateAmount(ing.id, ing.amount + 0.1)}
                  >
                    <span className="sr-only">Aumentar</span>
                    +
                  </Button>
                </div>

                <div className="text-right min-w-[80px]">
                  <p className="text-sm font-bold text-primary">
                    {Math.round(ing.amount * ing.unitCalories)} kcal
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive rounded-md"
                  onClick={() => onRemove(ing.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-border/50 rounded-xl bg-gradient-to-b from-muted/5 to-transparent">
          <Search className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum ingrediente adicionado</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Use a busca acima para adicionar alimentos ao seu prato
          </p>
        </div>
      )}
    </div>
  );
}
