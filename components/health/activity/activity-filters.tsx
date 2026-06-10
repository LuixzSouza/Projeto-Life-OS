"use client";

import { Input } from "@/components/ui/input";
import { Search, Activity, Dumbbell, Footprints, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityFilter } from "./activity-types";

interface ActivityFiltersProps {
  filter: ActivityFilter;
  setFilter: (f: ActivityFilter) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
}

// Toolbar compacta: busca + segmented control na mesma linha (quebra no mobile).
export function ActivityFilters({ filter, setFilter, searchTerm, setSearchTerm }: ActivityFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 basis-44">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar treino…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9 rounded-lg border-border/40 bg-background pl-8 text-sm"
        />
      </div>
      <div className="flex shrink-0 rounded-lg border border-border/40 bg-muted/40 p-0.5">
        <FilterTab active={filter === 'ALL'} onClick={() => setFilter('ALL')} icon={Activity} label="Todos" />
        <FilterTab active={filter === 'GYM'} onClick={() => setFilter('GYM')} icon={Dumbbell} label="Treino" />
        <FilterTab active={filter === 'RUN'} onClick={() => setFilter('RUN')} icon={Footprints} label="Corrida" />
      </div>
    </div>
  );
}

function FilterTab({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: LucideIcon, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", active && "text-primary")} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
