"use client";

import { Shirt, Scissors, Footprints, PackageOpen, Plus, Heart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BaseCard } from "./base-card";
import { motion } from "framer-motion";

// model WardrobeItem: category, wearCount, isFavorite.
interface Category {
  id: string;
  label: string;
  count: number;
  wears: number; // wearCount agregado
  icon: LucideIcon;
}

const INVENTORY: Category[] = [
  { id: "tops", label: "Camisetas & Tops", count: 32, wears: 124, icon: Shirt },
  { id: "bottoms", label: "Calças & Shorts", count: 12, wears: 86, icon: Scissors },
  { id: "shoes", label: "Tênis & Calçados", count: 8, wears: 54, icon: Footprints },
];

export function ClosetCard() {
  const total = INVENTORY.reduce((acc, i) => acc + i.count, 0);
  const maxWears = Math.max(...INVENTORY.map((i) => i.wears));
  const favPercent = 38; // % de peças favoritas (isFavorite)

  return (
    <BaseCard title="Closet" icon={PackageOpen} description="Inventário e uso das peças." className="col-span-1 h-full">
      <div className="flex h-full flex-col justify-between p-5">
        {/* Resumo */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-bold tabular-nums text-foreground">{total}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">peças no total</span>
          </div>

          {/* Donut: % favoritas (accent) */}
          <div className="relative flex size-12 items-center justify-center">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(var(--color-primary) ${favPercent}%, color-mix(in oklch, var(--muted) 100%, transparent) 0)`,
              }}
            >
              <div className="absolute inset-1 rounded-full bg-card" />
            </div>
            <Heart className="relative size-4 text-primary" />
          </div>
        </div>

        {/* Categorias por uso (wearCount) */}
        <div className="flex flex-col gap-3">
          {INVENTORY.map((cat, i) => {
            const pct = Math.round((cat.wears / maxWears) * 100);
            return (
              <div key={cat.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-foreground">
                    <cat.icon className="size-3.5 text-primary" />
                    <span className="font-medium">{cat.label}</span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    <span className="text-foreground">{cat.count}</span> · {cat.wears} usos
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    transition={{ duration: 1, delay: i * 0.15 }}
                    className="h-full rounded-full bg-gradient-brand"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Ação */}
        <button className="group mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 py-2 transition-all hover:border-primary/40 hover:bg-primary/5">
          <Plus className="size-3 text-muted-foreground group-hover:text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">
            Cadastrar peça
          </span>
        </button>
      </div>
    </BaseCard>
  );
}
