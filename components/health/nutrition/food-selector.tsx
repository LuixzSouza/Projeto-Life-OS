"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, X, Utensils, Trash2, ChevronRight, Apple } from "lucide-react";
import { FOOD_DATABASE, FoodItem } from "@/lib/food-db";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col h-full gap-4">
        
        {/* --- TOPO: RESUMO DO PRATO --- */}
        <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <div className="p-1 bg-primary/10 rounded-md text-primary">
                        <Utensils className="h-3.5 w-3.5" />
                    </div>
                    <span>Prato Atual</span>
                    {selectedFoods.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-mono bg-muted text-muted-foreground">
                            {selectedFoods.length}
                        </Badge>
                    )}
                </div>
                
                {selectedFoods.length > 0 && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearSelection} 
                        className="h-6 px-2 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10 uppercase tracking-wider font-bold"
                    >
                        Limpar Tudo
                    </Button>
                )}
            </div>

            {/* Lista Horizontal de Chips Selecionados */}
            <div className="min-h-[40px] flex flex-wrap gap-2 items-center content-start max-h-[100px] overflow-y-auto custom-scrollbar">
                {selectedFoods.length === 0 ? (
                    <div className="flex items-center justify-center w-full py-3 border border-dashed border-border rounded-lg bg-muted/20">
                        <span className="text-xs text-muted-foreground flex items-center gap-2">
                            <Plus className="h-3 w-3" /> Adicione itens da lista abaixo
                        </span>
                    </div>
                ) : (
                    selectedFoods.map((food, i) => (
                        <Badge 
                            key={i} 
                            variant="secondary" 
                            className="pl-2 pr-1 py-1 gap-1.5 bg-background border border-border hover:border-primary/40 transition-all group shadow-sm"
                        >
                            <span className="text-sm">{food.emoji}</span>
                            <span className="text-xs font-medium text-foreground">{food.name}</span>
                            <button 
                                type="button" 
                                onClick={() => removeFood(i)}
                                className="ml-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-full p-0.5 transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))
                )}
            </div>
            
            {/* Totalizador */}
            {selectedFoods.length > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-border/40 mt-auto">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Estimado</span>
                    <span className="text-sm font-bold text-primary font-mono bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                        {totalCalories} kcal
                    </span>
                </div>
            )}
        </div>

        {/* --- ÁREA DE BUSCA E LISTAGEM --- */}
        <div className="flex-1 flex flex-col border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
            {/* Barra de Busca */}
            <div className="p-3 border-b border-border bg-muted/30">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar alimento (ex: frango, arroz)..." 
                        className="pl-9 h-10 text-sm bg-background border-border/60 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all shadow-sm"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>
            
            {/* Lista de Alimentos */}
            <ScrollArea className="flex-1 bg-background">
                <div className="p-2 grid grid-cols-1 gap-1">
                    {filteredFoods.length > 0 ? filteredFoods.map(food => (
                        <button
                            key={food.id}
                            type="button"
                            onClick={() => addFood(food)}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-all text-left group border border-transparent hover:border-border/60 hover:shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <div className="text-xl bg-muted/30 w-10 h-10 flex items-center justify-center rounded-xl border border-border/40 group-hover:scale-110 transition-transform shadow-sm">
                                    {food.emoji}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground leading-none group-hover:text-primary transition-colors">
                                        {food.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-1.5 font-medium uppercase tracking-wide">
                                        {food.unit}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                                    {food.calories} kcal
                                </span>
                                <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm">
                                    <Plus className="h-4 w-4" />
                                </div>
                            </div>
                        </button>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-60">
                            <div className="p-3 bg-muted rounded-full mb-2">
                                <Apple className="h-6 w-6" />
                            </div>
                            <p className="text-xs font-medium">Nenhum alimento encontrado.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    </div>
  );
}