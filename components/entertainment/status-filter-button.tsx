"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusFilterButton({ label, icon: Icon, isActive, onClick, activeClass }: { label: string; icon?: LucideIcon; isActive: boolean; onClick: () => void; activeClass?: string; }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200", isActive ? activeClass || "bg-secondary text-secondary-foreground border-border shadow-sm" : "bg-background text-muted-foreground border-transparent hover:bg-muted hover:border-border/50")}>
      {Icon && <Icon className="h-3.5 w-3.5" />} {label}
    </button>
  );
}
