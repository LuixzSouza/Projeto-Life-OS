"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Heart, MoreVertical, Pencil, Trash2, CheckCircle2, Tag, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { getCostPerWear, getCategoryIcon, StatusBadge } from "./wardrobe-list-helpers";
import type { WardrobeItem } from "./wardrobe-list-types";

interface WardrobeItemCardProps {
  item: WardrobeItem;
  isBuildingOutfit: boolean;
  isSelectedForOutfit: boolean;
  onToggleOutfit: (item: WardrobeItem) => void;
  onFavorite: (id: string, current: boolean) => void;
  onEdit: (item: WardrobeItem) => void;
  onDelete: (id: string) => void;
  onWear: (id: string) => void;
  onConnections: (item: WardrobeItem) => void;
}

export function WardrobeItemCard({
  item,
  isBuildingOutfit,
  isSelectedForOutfit,
  onToggleOutfit,
  onFavorite,
  onEdit,
  onDelete,
  onWear,
  onConnections,
}: WardrobeItemCardProps) {
  const formatMoney = useFormatCurrency();
  const costPerWear = getCostPerWear(item.price, item.wearCount);

  return (
    <Card
      onClick={() => isBuildingOutfit ? onToggleOutfit(item) : undefined}
      className={cn(
        "group relative overflow-hidden border-border/40 shadow-sm transition-all duration-300 bg-card rounded-[1.25rem] flex flex-col",
        isBuildingOutfit && "cursor-pointer hover:border-primary/40",
        isSelectedForOutfit ? "ring-2 ring-primary border-primary shadow-lg shadow-primary/10 scale-[0.98]" : "hover:shadow-xl hover:border-primary/20"
      )}
    >
      {/* Overlay Visual de Seleção no Modo Outfit */}
      {isSelectedForOutfit && (
        <div className="absolute inset-0 bg-primary/5 z-20 pointer-events-none flex items-center justify-center">
          <div className="bg-primary text-primary-foreground p-2 rounded-full shadow-xl">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      )}

      {/* --- ZONA DE IMAGEM / COR (SEM FOTO) --- */}
      <div className="aspect-[4/5] relative bg-muted/20 flex items-center justify-center overflow-hidden border-b border-border/20">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className={cn("w-full h-full object-cover transition-transform duration-700", !isBuildingOutfit && "group-hover:scale-105")} />
        ) : (
          // 🟢 MÁGICA "FRICTIONLESS": Se não tem foto, usa a cor e o ícone!
          <div className="w-full h-full flex flex-col items-center justify-center opacity-90 transition-transform duration-500 group-hover:scale-105" style={{ backgroundColor: item.color || '#f4f4f5' }}>
            {getCategoryIcon(item.category, "h-16 w-16 text-white drop-shadow-md mix-blend-overlay")}
          </div>
        )}

        {/* Overlay Gradiente (Apenas escurece o topo e base se tiver imagem) */}
        {item.imageUrl && !isBuildingOutfit && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />}

        {/* Botões Flutuantes (Top Right) */}
        {!isBuildingOutfit && (
          <div className="absolute top-2 right-2 flex flex-col gap-2 z-10 translate-x-10 group-hover:translate-x-0 transition-transform duration-300">
            <button
              onClick={(e) => { e.stopPropagation(); onFavorite(item.id, item.isFavorite); }}
              className="p-2 rounded-full bg-background/80 backdrop-blur-md hover:bg-background transition-colors shadow-sm"
            >
              <Heart className={cn("h-4 w-4 transition-colors", item.isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground")} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button onClick={(e) => e.stopPropagation()} className="p-2 rounded-full bg-background/80 backdrop-blur-md hover:bg-background transition-colors shadow-sm text-muted-foreground">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="cursor-pointer font-medium text-xs">
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onConnections(item); }} className="cursor-pointer font-medium text-xs">
                  <Tags className="h-3.5 w-3.5 mr-2" /> Tags & Anexos
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium text-xs">
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir {item.name}?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação apagará a peça permanentemente do seu acervo.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 left-2 z-10">
          <StatusBadge status={item.status} />
        </div>
      </div>

      {/* --- CONTEÚDO --- */}
      <CardContent className="p-4 pb-3 flex-1 flex flex-col gap-1">
        <h4 className="font-bold text-sm text-foreground line-clamp-1" title={item.name}>{item.name}</h4>
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 truncate">
          <Tag className="h-3 w-3 opacity-50" /> {item.brand || "Sem marca"}
        </p>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-muted/30 p-2 rounded-lg border border-border/40">
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">Usos</p>
            <p className="text-xs font-bold text-foreground">{item.wearCount}x</p>
          </div>
          <div className="bg-muted/30 p-2 rounded-lg border border-border/40">
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">CPW</p>
            <p className={cn("text-xs font-bold", (item.wearCount || 0) > 10 ? "text-emerald-600" : "text-foreground")}>
              {costPerWear !== null ? formatMoney(costPerWear) : "-"}
            </p>
          </div>
        </div>
      </CardContent>

      {/* --- AÇÃO PRINCIPAL --- */}
      {!isBuildingOutfit && (
        <CardFooter className="p-4 pt-0">
          <Button
            variant="secondary"
            onClick={(e) => { e.stopPropagation(); onWear(item.id); }}
            className="w-full h-9 text-xs font-bold rounded-lg shadow-sm hover:bg-primary hover:text-primary-foreground transition-all group/btn"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5 opacity-50 group-hover/btn:opacity-100 transition-opacity" /> Usei Hoje
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
