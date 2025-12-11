"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, X, Utensils, Trash2, ChevronRight } from "lucide-react";
import { FOOD_DATABASE, FoodItem } from "@/lib/food-db";
import { Separator } from "@/components/ui/separator";

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

  const clearSelection = () => {
      setSelectedFoods([]);
      onSelectionChange([]);
  }

  const totalCalories = selectedFoods.reduce((acc, item) => acc + item.calories, 0);

  return (
    <div className="flex flex-col h-[450px] md:h-[400px] gap-4">
        
        {/* Prato Montado (Resumo no Topo) */}
        <div className="bg-zinc-50/80 dark:bg-zinc-900/80 border rounded-xl p-4 flex flex-col gap-3 shadow-sm">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                    <Utensils className="h-4 w-4 text-green-600" />
                    <span>Prato Atual</span>
                    {selectedFoods.length > 0 && <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px]">{selectedFoods.length}</Badge>}
                </div>
                {selectedFoods.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearSelection} className="h-6 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 px-2">
                        Limpar
                    </Button>
                )}
            </div>

            <div className="min-h-[40px] flex flex-wrap gap-2 items-center">
                {selectedFoods.length === 0 ? (
                    <div className="flex items-center justify-center w-full py-2 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                        <span className="text-xs text-zinc-400">Adicione alimentos abaixo para montar seu prato.</span>
                    </div>
                ) : (
                    selectedFoods.map((food, i) => (
                        <Badge key={i} variant="secondary" className="pl-2 pr-1 py-1 gap-1.5 bg-white dark:bg-zinc-950 border shadow-sm group hover:border-zinc-300 transition-all">
                            <span className="text-sm">{food.emoji}</span>
                            <span className="text-xs font-medium">{food.name}</span>
                            <button 
                                type="button" 
                                onClick={() => removeFood(i)}
                                className="ml-1 hover:bg-red-100 text-zinc-400 hover:text-red-500 rounded-full p-0.5 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))
                )}
            </div>
            
            {selectedFoods.length > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-zinc-800 mt-1">
                    <span className="text-xs font-medium text-zinc-500">Total Estimado</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400 font-mono">{totalCalories} kcal</span>
                </div>
            )}
        </div>

        {/* Área de Busca e Seleção */}
        <div className="flex-1 flex flex-col border rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
            <div className="p-3 border-b bg-zinc-50/30 dark:bg-zinc-900/30">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input 
                        placeholder="Buscar alimento (ex: frango, arroz)..." 
                        className="pl-9 h-10 text-sm bg-transparent border-zinc-200 dark:border-zinc-800 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-green-500"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>
            
            <ScrollArea className="flex-1 bg-zinc-50/10">
                <div className="p-2 grid grid-cols-1 gap-1">
                    {filteredFoods.length > 0 ? filteredFoods.map(food => (
                        <button
                            key={food.id}
                            type="button"
                            onClick={() => addFood(food)}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all text-left group border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                        >
                            <div className="flex items-center gap-3">
                                <div className="text-xl bg-white dark:bg-zinc-900 w-10 h-10 flex items-center justify-center rounded-xl border shadow-sm group-hover:scale-110 transition-transform">{food.emoji}</div>
                                <div>
                                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 leading-none group-hover:text-green-600 transition-colors">{food.name}</p>
                                    <p className="text-[10px] text-zinc-400 mt-1.5 font-medium uppercase tracking-wide">{food.unit}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold font-mono text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">{food.calories} kcal</span>
                                <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-green-500 group-hover:text-white transition-all shadow-sm">
                                    <Plus className="h-4 w-4" />
                                </div>
                            </div>
                        </button>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                            <Search className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-xs">Nenhum alimento encontrado.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    </div>
  );
}