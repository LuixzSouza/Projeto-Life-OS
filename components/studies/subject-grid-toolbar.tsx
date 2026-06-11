"use client";

import { Search, SortAsc, Layers, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SortOption } from "./subject-grid-types";

interface SubjectGridToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  isSearching: boolean;
  viewMode: "flat" | "tree";
  onViewModeChange: (value: "flat" | "tree") => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
}

export function SubjectGridToolbar({
  searchTerm,
  onSearchChange,
  isSearching,
  viewMode,
  onViewModeChange,
  categoryFilter,
  onCategoryChange,
  categories,
  sortBy,
  onSortChange,
}: SubjectGridToolbarProps) {
  return (
    // Duas linhas SEMPRE: busca + Grade/Lista em cima, filtros embaixo.
    // (A linha única quebrava feio nas larguras intermediárias: o grupo de
    // tabs w-full + selects estourava e desalinhava tudo.)
    <div className="bg-card p-3 rounded-2xl border border-border/60 shadow-sm flex flex-col gap-3">

      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pesquisar matérias..."
            className="pl-9 bg-muted/30 border-0 focus-visible:ring-1 shadow-none h-11 rounded-xl w-full"
          />
        </div>

        {!isSearching && (
          <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as "flat" | "tree")} className="shrink-0">
            <TabsList className="h-11 grid grid-cols-2 rounded-xl p-1 bg-muted/50 border border-border/50">
              <TabsTrigger value="tree" className="text-xs font-bold rounded-lg px-3">
                <LayoutGrid className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Grade</span>
              </TabsTrigger>
              <TabsTrigger value="flat" className="text-xs font-bold rounded-lg px-3">
                <Layers className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Lista</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger className="h-10 w-full sm:w-[160px] rounded-xl bg-muted/30 border-border/50 font-medium text-sm">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-bold text-primary">Todas</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
          <SelectTrigger className="h-10 w-full sm:w-[170px] rounded-xl bg-muted/30 border-border/50 font-medium text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <SortAsc className="h-4 w-4" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="totalMinutes">Mais Focado</SelectItem>
            <SelectItem value="title">Ordem (A-Z)</SelectItem>
            <SelectItem value="createdAt">Mais Recente</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
