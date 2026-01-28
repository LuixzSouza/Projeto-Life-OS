// components/projects/task-select.tsx
"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, Calendar, Clock, AlignJustify } from "lucide-react";

type SortType = "priority" | "dueDate" | "createdAt" | "title";

interface TaskSelectProps {
  value: SortType;
  buildUrl: (params: { sort: SortType }) => string;
}

export function TaskSelect({ value, buildUrl }: TaskSelectProps) {
  const router = useRouter();

  const handleValueChange = (newValue: SortType) => {
    router.push(buildUrl({ sort: newValue }));
  };

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Ordenar por..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="priority">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Prioridade
          </div>
        </SelectItem>
        <SelectItem value="dueDate">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Data de Vencimento
          </div>
        </SelectItem>
        <SelectItem value="createdAt">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Data de Criação
          </div>
        </SelectItem>
        <SelectItem value="title">
          <div className="flex items-center gap-2">
            <AlignJustify className="h-4 w-4" />
            Título
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}