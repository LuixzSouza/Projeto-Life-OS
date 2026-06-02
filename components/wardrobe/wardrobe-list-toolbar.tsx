"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Droplets, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "ALL", label: "Tudo" },
  { key: "FAVORITES", label: "Favoritos ❤️" },
  { key: "TOP", label: "Parte de Cima" },
  { key: "BOTTOM", label: "Parte de Baixo" },
  { key: "SHOES", label: "Calçados" },
  { key: "ACCESSORY", label: "Acessórios" },
];

interface WardrobeListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  isBuildingOutfit: boolean;
  onToggleOutfitMode: () => void;
  filterStatus: string | null;
  onToggleLaundry: () => void;
  filterCategory: string;
  onCategoryChange: (key: string) => void;
}

export function WardrobeListToolbar({
  search,
  onSearchChange,
  isBuildingOutfit,
  onToggleOutfitMode,
  filterStatus,
  onToggleLaundry,
  filterCategory,
  onCategoryChange,
}: WardrobeListToolbarProps) {
  return (
    <div className="flex flex-col gap-4 bg-background p-3 rounded-2xl border border-border/40 shadow-sm">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, marca ou cor..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-11 bg-muted/20 border-border/50 focus:border-primary/50 transition-all rounded-xl"
          />
        </div>

        <div className="flex gap-2 shrink-0">
          {/* Botão de Ativar o Outfit Builder */}
          <Button
            variant={isBuildingOutfit ? "secondary" : "outline"}
            onClick={onToggleOutfitMode}
            className={cn("h-11 transition-all rounded-xl px-4", isBuildingOutfit ? "bg-primary text-primary-foreground border-primary" : "border-border/50")}
          >
            <Sparkles className="h-4 w-4 mr-2" /> Montar Look
          </Button>

          {/* Filtro de Lavanderia */}
          <Button
            variant={filterStatus === "LAUNDRY" ? "default" : "outline"}
            onClick={onToggleLaundry}
            className={cn(
              "h-11 transition-all rounded-xl px-4",
              filterStatus === "LAUNDRY" ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" : "text-muted-foreground hover:text-foreground border-border/50"
            )}
          >
            <Droplets className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Lavanderia</span>
          </Button>
        </div>
      </div>

      {/* Categorias (Tabs Visuais) */}
      <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.key}
            variant="ghost"
            size="sm"
            onClick={() => onCategoryChange(cat.key)}
            className={cn(
              "rounded-lg px-4 font-medium text-xs h-8 transition-all border shrink-0",
              filterCategory === cat.key
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {cat.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
