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
    <div className="bg-card p-3 rounded-2xl border border-border/60 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">

      <div className="relative w-full lg:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Pesquisar matérias..."
          className="pl-9 bg-muted/30 border-0 focus-visible:ring-1 shadow-none h-11 rounded-xl w-full"
        />
      </div>

      <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center w-full lg:w-auto">
        {!isSearching && (
          <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as "flat" | "tree")} className="w-full sm:w-auto">
            <TabsList className="h-11 w-full sm:w-auto grid grid-cols-2 rounded-xl p-1 bg-muted/50 border border-border/50">
              <TabsTrigger value="tree" className="text-xs font-bold rounded-lg"><LayoutGrid className="h-4 w-4 mr-2"/> Grade</TabsTrigger>
              <TabsTrigger value="flat" className="text-xs font-bold rounded-lg"><Layers className="h-4 w-4 mr-2"/> Lista</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger className="h-11 w-full sm:w-[150px] rounded-xl bg-muted/30 border-border/50 font-medium text-sm">
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
          <SelectTrigger className="h-11 w-full sm:w-[170px] rounded-xl bg-muted/30 border-border/50 font-medium text-sm">
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
