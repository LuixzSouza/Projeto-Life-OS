// components/projects/task-filters.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { List, Target, CheckCircle2, Pin, Star, Clock, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type FilterType = "all" | "active" | "completed" | "pinned" | "starred" | "overdue";

interface TaskFiltersProps {
  currentFilter: FilterType;
  buildUrl: (params: { filter: FilterType }) => string;
  stats?: {
    overdue?: number;
    pinned?: number;
  };
}

export function TaskFilters({ currentFilter, buildUrl, stats }: TaskFiltersProps) {
  const filters = [
    { value: "all" as const, label: "Todas as Tarefas", icon: <List className="h-4 w-4" /> },
    { value: "active" as const, label: "Pendentes", icon: <Target className="h-4 w-4" /> },
    { value: "completed" as const, label: "Concluídas", icon: <CheckCircle2 className="h-4 w-4" /> },
    { value: "pinned" as const, label: "Fixadas", icon: <Pin className="h-4 w-4" /> },
    { value: "starred" as const, label: "Destacadas", icon: <Star className="h-4 w-4" /> },
    { value: "overdue" as const, label: "Atrasadas", icon: <Clock className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Filter className="h-4 w-4" />
        Filtrar por
      </h3>
      <div className="space-y-2">
        {filters.map(({ value, label, icon }) => (
          <Link key={value} href={buildUrl({ filter: value })}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3",
                currentFilter === value && "bg-primary/10 text-primary"
              )}
            >
              {icon}
              {label}
              {value === "overdue" && stats?.overdue && stats.overdue > 0 && (
                <Badge className="ml-auto bg-red-500">{stats.overdue}</Badge>
              )}
              {value === "pinned" && stats?.pinned && stats.pinned > 0 && (
                <Badge className="ml-auto bg-amber-500">{stats.pinned}</Badge>
              )}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}