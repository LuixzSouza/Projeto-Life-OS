"use client";

import { Badge } from "@/components/ui/badge";
import {
  Shirt, RotateCcw, Droplets, ShoppingBag, AlertTriangle, Footprints, Gem, Layers
} from "lucide-react";

// --- HELPERS VISUAIS E DE NEGÓCIO ---
// Retorna o custo-por-uso como número (ou null) para formatar com a moeda do usuário.
export const getCostPerWear = (price: number | null, count: number): number | null => {
  if (!price) return null;
  if (count === 0) return price;
  return price / count;
};

// 🟢 INTELIGÊNCIA VISUAL: Ícones baseados na categoria
export const getCategoryIcon = (category: string, className?: string) => {
  switch (category) {
    case "BOTTOM": return <Layers className={className} />;
    case "SHOES": return <Footprints className={className} />;
    case "ACCESSORY": return <Gem className={className} />;
    case "TOP":
    default: return <Shirt className={className} />;
  }
};

export const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "LAUNDRY": return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200/50 gap-1"><Droplets className="w-3 h-3" /> Lavando</Badge>;
    case "LENT": return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-200/50 gap-1"><RotateCcw className="w-3 h-3" /> Emprestado</Badge>;
    case "REPAIR": return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-200/50 gap-1"><AlertTriangle className="w-3 h-3" /> Conserto</Badge>;
    case "DONATED": return <Badge variant="outline" className="text-muted-foreground bg-muted/50 gap-1"><ShoppingBag className="w-3 h-3" /> Doado</Badge>;
    default: return null;
  }
};
