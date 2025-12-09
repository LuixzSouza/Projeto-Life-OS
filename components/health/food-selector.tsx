"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, X, Utensils, Minus } from "lucide-react";
import { FOOD_DATABASE, FoodItem } from "@/lib/food-db";

interface FoodSelectorProps {
  onSelectionChange: (selectedItems: FoodItem[]) => void;
}

export function FoodSelector({ onSelectionChange }: FoodSelectorProps) {
  const [query, setQuery] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<FoodItem[]>([]);

  // Filtra por nome
  const filteredFoods = FOOD_DATABASE.filter(f => 
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  const addFood = (food: FoodItem) => {
    const newSelection = [...selectedFoods, food];
    setSelectedFoods(newSelection);
    onSelectionChange(newSelection);
  };

  const removeFood = (index: number) => {
    const newSelection = [...selectedFoods];
    newSelection.splice(index, 1);
    setSelectedFoods(newSelection);
    onSelectionChange(newSelection);
  };

  return (
    <div className="flex flex-col h-[400px] md:h-[350px] gap-4">
        
        {/* Prato Montado (Resumo no Topo) */}
        <div className="bg-zinc-50 dark:bg-zinc-900 border rounded-lg p-3 min-h-[60px] flex flex-wrap gap-2 items-center">
            {selectedFoods.length === 0 ? (
                <span className="text-xs text-zinc-400 w-full text-center">Seu prato está vazio. Adicione itens abaixo.</span>
            ) : (
                selectedFoods.map((food, i) => (
                    <Badge key={i} variant="secondary" className="pl-2 pr-1 py-1 gap-1 bg-white dark:bg-zinc-800 border">
                        <span>{food.emoji} {food.name}</span>
                        <button 
                            type="button" 
                            onClick={() => removeFood(i)}
                            className="ml-1 hover:bg-red-100 text-zinc-400 hover:text-red-500 rounded-full p-0.5 transition-colors"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))
            )}
        </div>

        {/* Área de Busca e Seleção */}
        <div className="flex-1 flex flex-col border rounded-md overflow-hidden">
            <div className="p-2 border-b bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input 
                        placeholder="Buscar alimento (ex: frango)..." 
                        className="pl-9 h-9 text-sm"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>
            
            <ScrollArea className="flex-1">
                <div className="p-1 grid grid-cols-1 gap-1">
                    {filteredFoods.length > 0 ? filteredFoods.map(food => (
                        <button
                            key={food.id}
                            type="button"
                            onClick={() => addFood(food)}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl bg-zinc-50 dark:bg-zinc-900 w-8 h-8 flex items-center justify-center rounded-full border">{food.emoji}</span>
                                <div>
                                    <p className="text-sm font-medium leading-none">{food.name}</p>
                                    <p className="text-[10px] text-zinc-500 mt-1">{food.unit}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-zinc-400 group-hover:text-zinc-600 transition-colors">{food.calories} kcal</span>
                                <div className="h-6 w-6 rounded-full border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 group-hover:border-green-500 group-hover:bg-green-50 group-hover:text-green-600">
                                    <Plus className="h-3 w-3" />
                                </div>
                            </div>
                        </button>
                    )) : (
                        <div className="py-8 text-center text-xs text-zinc-400">
                            Nenhum alimento encontrado com &quot;{query}&quot;.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    </div>
  );
}