"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "ALL", label: "Todos" },
  { key: "CLOSE", label: "Próximos" },
  { key: "WORK", label: "Trabalho" },
  { key: "FAMILY", label: "Família" },
];

interface FriendFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
}

export function FriendFilterBar({ search, onSearchChange, filter, onFilterChange }: FriendFilterBarProps) {
  return (
    <div className="flex flex-col xl:flex-row gap-4 bg-card p-2 rounded-2xl border border-border/40 shadow-sm items-start xl:items-center">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, empresa ou tag (Ex: Cliente, LoL)..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0 text-base md:text-sm"
        />
        {search && (
          <button onClick={() => onSearchChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl overflow-x-auto w-full xl:w-auto scrollbar-hide">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange(f.key)}
            className={cn(
              "rounded-lg px-4 font-medium transition-all whitespace-nowrap h-9",
              filter === f.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
