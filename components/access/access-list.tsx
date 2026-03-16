"use client";

import { AccessItem } from "@prisma/client";
import { AccessCard } from "./access-card";
import { cn } from "@/lib/utils";

interface AccessListProps {
  items: AccessItem[];
  showClientBadge?: boolean;
}

export function AccessList({ items }: AccessListProps) {
  
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
      {items.map((item, index) => {
        /**
         * Lógica de Delay Dinâmico:
         * Criamos um efeito de cascata (stagger) suave. 
         * O limite de 8 garante que se houver muitos itens, 
         * os últimos não demorem uma eternidade para aparecer.
         */
        const delay = Math.min(index * 50, 400); 

        return (
          <div
            key={item.id}
            style={{ animationDelay: `${delay}ms` }}
            className={cn(
              "animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-500 fill-mode-both"
            )}
          >
            <AccessCard item={item} />
          </div>
        );
      })}
    </div>
  );
}