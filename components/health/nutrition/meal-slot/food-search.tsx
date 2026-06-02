import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FOOD_DATABASE } from "@/lib/food-db";
import type { IngredientRow } from "../weekly-planner-types";

interface FoodSearchProps {
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  ingredients: IngredientRow[];
  onAdd: (foodId: string) => void;
}

export function FoodSearch({ searchOpen, setSearchOpen, ingredients, onAdd }: FoodSearchProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold flex items-center gap-2">
        <Search className="h-4 w-4 text-primary" />
        Adicionar Alimentos
      </Label>

      <Popover open={searchOpen} onOpenChange={setSearchOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={searchOpen}
            className="w-full justify-between h-12 text-base font-normal border-primary/20 hover:border-primary/40"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span>Busque por alimentos (ex: Arroz, Frango, Salada)...</span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command className="border border-border">
            <CommandInput
              placeholder="Digite o nome do alimento..."
              className="h-12 border-b"
            />
            <CommandList className="max-h-[300px]">
              <CommandEmpty className="py-6 text-center text-muted-foreground">
                Nenhum alimento encontrado.
              </CommandEmpty>
              <CommandGroup heading="Banco de Alimentos">
                {FOOD_DATABASE.map((food) => (
                  <CommandItem
                    key={food.id}
                    value={food.name}
                    onSelect={() => onAdd(food.id)}
                    className="cursor-pointer py-3 px-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{food.emoji}</span>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{food.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {food.calories} kcal / {food.unit}
                          </span>
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4",
                          ingredients.some(i => i.foodId === food.id)
                            ? "opacity-100 text-primary"
                            : "opacity-0"
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
