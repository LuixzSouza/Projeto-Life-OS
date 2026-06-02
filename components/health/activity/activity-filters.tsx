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

export function ActivityFilters({ filter, setFilter, searchTerm, setSearchTerm }: ActivityFiltersProps) {
  return (
    <div className="flex flex-col xl:flex-row gap-4 justify-between items-center">
      <div className="relative w-full xl:w-96 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Filtrar por nome ou notas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-11 h-12 rounded-2xl bg-background border-border/60 shadow-inner focus-visible:ring-primary/20 font-medium"
        />
      </div>
      <div className="flex p-1.5 bg-muted/40 rounded-[1.25rem] border border-border/40 w-full xl:w-auto shadow-inner">
        <FilterTab active={filter === 'ALL'} onClick={() => setFilter('ALL')} icon={Activity} label="Todos" />
        <FilterTab active={filter === 'GYM'} onClick={() => setFilter('GYM')} icon={Dumbbell} label="Gym" />
        <FilterTab active={filter === 'RUN'} onClick={() => setFilter('RUN')} icon={Footprints} label="Run" />
      </div>
    </div>
  );
}

function FilterTab({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: LucideIcon, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-1 xl:flex-none",
        active
          ? "bg-background text-primary shadow-lg ring-1 ring-border/20"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
