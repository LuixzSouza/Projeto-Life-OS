"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Apple, Loader2, Globe, Check } from "lucide-react";
import { FOOD_DATABASE, FoodItem } from "@/lib/food-db";
import { searchFoodProducts } from "@/app/(dashboard)/health/actions";
import { cn } from "@/lib/utils";

interface FoodSelectorProps {
  onAdd: (food: FoodItem) => void;
  addedIds?: Set<string>;
}

// Miniatura: imagem do produto (Open Food Facts) ou emoji do banco local.
function FoodThumb({ food, className }: { food: FoodItem; className?: string }) {
  if (food.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={food.image} alt={food.name} className={cn("object-cover", className)} loading="lazy" />;
  }
  return <span className="text-xl">{food.emoji}</span>;
}

export function FoodSelector({ onAdd, addedIds }: FoodSelectorProps) {
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState<FoodItem[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);

  const filteredLocal = FOOD_DATABASE.filter(f =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setOnline([]); setLoadingOnline(false); return; }
    let active = true;
    setLoadingOnline(true);
    const t = setTimeout(async () => {
      try {
        const results = await searchFoodProducts(term);
        if (active) setOnline(results);
      } finally {
        if (active) setLoadingOnline(false);
      }
    }, 450);
    return () => { active = false; clearTimeout(t); };
  }, [query]);

  const FoodRow = ({ food }: { food: FoodItem }) => {
    const added = addedIds?.has(food.id);
    return (
      <button
        type="button"
        onClick={() => onAdd(food)}
        className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-all text-left group border border-transparent hover:border-border/60 w-full"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 flex items-center justify-center rounded-xl border border-border/40 overflow-hidden bg-muted/30 shrink-0">
            <FoodThumb food={food} className="w-full h-full" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors truncate">{food.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {food.brand ? `${food.brand} · ` : ""}{food.calories} kcal / {food.unit}
            </p>
          </div>
        </div>
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all",
          added ? "bg-emerald-500/15 text-emerald-600" : "bg-muted/60 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground"
        )}>
          {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/40 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar alimento (ex: arroz, feijão, frango)..."
            className="pl-9 h-11 text-sm bg-background border-border/60 focus-visible:ring-primary/30"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {loadingOnline && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredLocal.length > 0 && (
            <>
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Banco rápido</p>
              <div className="grid grid-cols-1 gap-0.5 mb-2">
                {filteredLocal.slice(0, 30).map(food => <FoodRow key={food.id} food={food} />)}
              </div>
            </>
          )}

          {(online.length > 0 || (query.trim().length >= 2 && loadingOnline)) && (
            <>
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                <Globe className="h-3 w-3" /> Open Food Facts
              </p>
              {loadingOnline && online.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" /> Buscando produtos...
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-0.5">
                  {online.map(food => <FoodRow key={food.id} food={food} />)}
                </div>
              )}
            </>
          )}

          {query.trim().length >= 2 && !loadingOnline && filteredLocal.length === 0 && online.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-60">
              <div className="p-3 bg-muted rounded-full mb-2"><Apple className="h-6 w-6" /></div>
              <p className="text-xs font-medium">Nenhum alimento encontrado.</p>
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50 text-center px-6">
              <Search className="h-7 w-7 mb-2" />
              <p className="text-xs font-medium">Busque alimentos e toque para montar seu prato.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
