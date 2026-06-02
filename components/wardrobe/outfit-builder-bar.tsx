"use client";

import { Button } from "@/components/ui/button";
import { Wand2, X } from "lucide-react";
import { getCategoryIcon } from "./wardrobe-list-helpers";
import type { WardrobeItem } from "./wardrobe-list-types";

interface OutfitBuilderBarProps {
  outfitBuilder: WardrobeItem[];
  onToggleItem: (item: WardrobeItem) => void;
  onCancel: () => void;
  onWear: () => void;
}

export function OutfitBuilderBar({ outfitBuilder, onToggleItem, onCancel, onWear }: OutfitBuilderBarProps) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 md:p-5 animate-in slide-in-from-top-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shadow-inner">
      <div className="flex items-center gap-3 w-full xl:w-auto shrink-0">
        <div className="p-3 bg-primary/10 rounded-2xl"><Wand2 className="h-6 w-6 text-primary" /></div>
        <div>
          <h3 className="text-base font-bold text-primary">Montando Look do Dia</h3>
          <p className="text-xs font-medium text-primary/60">Selecione até 5 peças abaixo</p>
        </div>
      </div>

      <div className="flex-1 flex gap-3 overflow-x-auto px-2 min-h-[60px] items-center bg-background/60 rounded-xl p-3 border border-border/40 w-full scrollbar-hide">
        {outfitBuilder.length === 0 ? (
          <span className="text-xs text-muted-foreground font-medium w-full text-center">Clique nas peças para adicionar ao look...</span>
        ) : (
          outfitBuilder.map(item => (
            <div key={`outfit-${item.id}`} className="relative h-12 w-12 shrink-0 rounded-lg border border-border/50 overflow-hidden group shadow-sm">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center opacity-80" style={{ backgroundColor: item.color || '#e5e7eb' }}>
                  {getCategoryIcon(item.category, "h-5 w-5 text-white drop-shadow-md")}
                </div>
              )}
              <button onClick={() => onToggleItem(item)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2 w-full xl:w-auto shrink-0">
        <Button variant="ghost" onClick={onCancel} className="text-muted-foreground w-full xl:w-auto hover:bg-destructive/10 hover:text-destructive">Cancelar</Button>
        <Button disabled={outfitBuilder.length === 0} onClick={onWear} className="bg-primary shadow-lg shadow-primary/20 w-full xl:w-auto">Usar Look</Button>
      </div>
    </div>
  );
}
