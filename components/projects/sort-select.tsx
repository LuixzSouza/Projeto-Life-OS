"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, Calendar, Clock, AlignJustify } from "lucide-react";

interface SortSelectProps {
  sortBy: string;
  slug: string;
}

export function SortSelect({ sortBy, slug }: SortSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleValueChange = (value: string) => {
    // Criamos uma nova instância de URLSearchParams baseada nos params atuais
    const params = new URLSearchParams(searchParams.toString());
    
    // Atualizamos apenas o campo 'sort'
    params.set("sort", value);
    
    // Navegamos para a nova URL
    router.push(`/projects/${slug}?${params.toString()}`);
  };

  return (
    <Select value={sortBy} onValueChange={handleValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Ordenar por..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="priority">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4" /> Prioridade
          </div>
        </SelectItem>
        <SelectItem value="dueDate">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Vencimento
          </div>
        </SelectItem>
        <SelectItem value="createdAt">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Criação
          </div>
        </SelectItem>
        <SelectItem value="title">
          <div className="flex items-center gap-2">
            <AlignJustify className="h-4 w-4" /> Título
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}