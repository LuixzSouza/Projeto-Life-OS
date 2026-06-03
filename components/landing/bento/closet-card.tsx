"use client";

import { Shirt, Scissors, Footprints, PackageOpen, Plus, LucideIcon, WashingMachine } from "lucide-react";
import { BaseCard } from "./base-card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Tipagem estrita para o inventário
interface InventoryCategory {
  id: string;
  label: string;
  count: number;
  cleanCount: number; // Para calcular a barra de progresso
  icon: LucideIcon;
  color: string;
  barColor: string;
}

const INVENTORY: InventoryCategory[] = [
  { 
    id: "tops", 
    label: "Camisetas & Tops", 
    count: 32, 
    cleanCount: 28, 
    icon: Shirt, 
    color: "text-blue-400",
    barColor: "bg-blue-500"
  },
  { 
    id: "bottoms", 
    label: "Calças & Shorts", 
    count: 12, 
    cleanCount: 12, // 100% limpo
    icon: Scissors, 
    color: "text-emerald-400",
    barColor: "bg-emerald-500"
  },
  { 
    id: "shoes", 
    label: "Coleção Tênis", 
    count: 8, 
    cleanCount: 8, 
    icon: Footprints, 
    color: "text-primary",
    barColor: "bg-primary"
  },
];

export function ClosetCard() {
  // Calcula o total de peças para o header
  const totalItems = INVENTORY.reduce((acc, item) => acc + item.count, 0);
  const totalClean = INVENTORY.reduce((acc, item) => acc + item.cleanCount, 0);
  const cleanPercentage = Math.round((totalClean / totalItems) * 100);

  return (
    <BaseCard 
        title="Gestão de Closet" 
        icon={PackageOpen} 
        description="Inventário e status de lavanderia."
        className="col-span-1 h-full"
    >
        <div className="flex flex-col h-full p-5 justify-between">
            
            {/* --- HEADER: RESUMO GERAL --- */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                    <span className="text-2xl font-bold text-foreground tabular-nums">{totalItems}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Peças no Total</span>
                </div>
                
                {/* Donut Chart Simplificado (CSS Conic) */}
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div 
                        className="absolute inset-0 rounded-full" 
                        style={{ 
                            background: `conic-gradient(#10b981 ${cleanPercentage}%, #27272a 0)` 
                        }} 
                    >
                        {/* Mascara do centro */}
                        <div className="absolute inset-1 bg-card rounded-full" />
                    </div>
                    <WashingMachine className="relative w-5 h-5 text-muted-foreground" />
                </div>
            </div>

            {/* --- LISTA DE CATEGORIAS (INVENTÁRIO) --- */}
            <div className="flex flex-col gap-3">
                {INVENTORY.map((cat, i) => {
                    const percentage = Math.round((cat.cleanCount / cat.count) * 100);
                    
                    return (
                        <div key={cat.id} className="group flex flex-col gap-1.5">
                            {/* Linha de Info */}
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 text-foreground">
                                    <cat.icon className={cn("w-3.5 h-3.5", cat.color)} />
                                    <span className="font-medium">{cat.label}</span>
                                </div>
                                <div className="flex gap-1 text-[10px] font-mono text-muted-foreground">
                                    <span className="text-foreground">{cat.cleanCount}</span>/{cat.count}
                                </div>
                            </div>

                            {/* Barra de Progresso (Status de Limpeza) */}
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${percentage}%` }}
                                    transition={{ duration: 1, delay: i * 0.2 }}
                                    className={cn("h-full rounded-full", cat.barColor)}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* --- FOOTER: BOTÃO DE AÇÃO RÁPIDA --- */}
            <button className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border hover:bg-muted/50 hover:border-border transition-all group">
                <div className="bg-muted p-0.5 rounded group-hover:bg-zinc-700 transition-colors">
                    <Plus className="w-3 h-3 text-muted-foreground" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest group-hover:text-foreground">
                    Cadastrar Peça
                </span>
            </button>

        </div>
    </BaseCard>
  );
}