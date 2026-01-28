"use client";

import { AccessItem } from "@prisma/client";
import { AccessCard } from "./access-card";
import { cn } from "@/lib/utils";

interface AccessListProps {
  items: AccessItem[];
  showClientBadge?: boolean;
}

export function AccessList({ items, showClientBadge = false }: AccessListProps) {
  
  // Se a lista estiver vazia (embora o AccessView já trate isso, é uma segurança extra)
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            "animate-in fade-in zoom-in-95 duration-500 fill-mode-both",
            // Cria um efeito de "cascata" (stagger) baseado no índice
            // Os primeiros 10 itens aparecem sequencialmente
            index === 0 && "delay-[0ms]",
            index === 1 && "delay-[75ms]",
            index === 2 && "delay-[150ms]",
            index === 3 && "delay-[225ms]",
            index > 3 && "delay-[300ms]"
          )}
        >
          <AccessCard item={item} />
        </div>
      ))}
    </div>
  );
}