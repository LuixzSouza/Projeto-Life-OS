"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    List, 
    Target, 
    CheckCircle2, 
    Pin, 
    Star, 
    Clock, 
    Filter,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import React from "react";

// --- TYPES ---
export type FilterType = "all" | "active" | "completed" | "pinned" | "starred" | "overdue";

interface FilterOption {
    value: FilterType;
    label: string;
    icon: React.ElementType;
    color: string;
}

interface TaskFiltersProps {
    currentFilter: FilterType;
    buildUrl: (params: { filter: FilterType }) => string;
    stats?: {
        overdue?: number;
        pinned?: number;
        active?: number;
    };
}

// --- CONFIGURAÇÃO ---
const FILTERS: FilterOption[] = [
    { value: "all", label: "Tudo", icon: List, color: "text-zinc-500" },
    { value: "active", label: "Pendentes", icon: Target, color: "text-blue-500" },
    { value: "overdue", label: "Atrasadas", icon: Clock, color: "text-rose-500" },
    { value: "pinned", label: "Fixadas", icon: Pin, color: "text-amber-500" },
    { value: "starred", label: "Importantes", icon: Star, color: "text-purple-500" },
    { value: "completed", label: "Concluídas", icon: CheckCircle2, color: "text-emerald-500" },
];

export function TaskFilters({ currentFilter, buildUrl, stats }: TaskFiltersProps) {
    return (
        <div className="space-y-6">
            {/* Header da Seção */}
            <div className="flex items-center gap-2 px-3">
                <div className="p-1.5 bg-muted rounded-lg border border-border/50">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                    Filtragem
                </h3>
            </div>

            <div className="space-y-1">
                {FILTERS.map((filter) => {
                    const isActive = currentFilter === filter.value;
                    const Icon = filter.icon;
                    
                    // Lógica de Badges de contagem
                    const showBadge = 
                        (filter.value === "overdue" && (stats?.overdue ?? 0) > 0) ||
                        (filter.value === "pinned" && (stats?.pinned ?? 0) > 0) ||
                        (filter.value === "active" && (stats?.active ?? 0) > 0);

                    const badgeCount = 
                        filter.value === "overdue" ? stats?.overdue :
                        filter.value === "pinned" ? stats?.pinned :
                        stats?.active;

                    return (
                        <Link 
                            key={filter.value} 
                            href={buildUrl({ filter: filter.value })}
                            className="block group"
                        >
                            <div className={cn(
                                "flex items-center justify-between px-3 h-10 rounded-xl transition-all duration-200 active:scale-[0.98]",
                                isActive 
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "transition-colors",
                                        isActive ? "text-primary-foreground" : filter.color
                                    )}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm font-bold tracking-tight">
                                        {filter.label}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {showBadge && (
                                        <Badge 
                                            variant="secondary"
                                            className={cn(
                                                "h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] font-black rounded-md border-none",
                                                isActive 
                                                    ? "bg-white/20 text-white" 
                                                    : filter.value === "overdue" 
                                                        ? "bg-rose-500/10 text-rose-600" 
                                                        : "bg-muted-foreground/10 text-muted-foreground"
                                            )}
                                        >
                                            {badgeCount}
                                        </Badge>
                                    )}
                                    
                                    {!isActive && (
                                        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                    )}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}