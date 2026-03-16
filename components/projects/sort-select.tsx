"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    Flag, 
    Calendar, 
    Clock, 
    AlignLeft, 
    ArrowDownNarrowWide,
    LucideIcon // Importamos o tipo específico para os ícones
} from "lucide-react";

interface SortSelectProps {
    sortBy: string;
    slug: string;
}

export function SortSelect({ sortBy, slug }: SortSelectProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleValueChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", value);
        
        const basePath = slug === "inbox" ? "/projects/inbox" : `/projects/${slug}`;
        router.push(`${basePath}?${params.toString()}`);
    };

    return (
        <div className="flex flex-col gap-1.5 min-w-[160px]">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">
                Ordenar por
            </span>

            <Select value={sortBy} onValueChange={handleValueChange}>
                <SelectTrigger className="h-10 bg-muted/30 border-border/50 rounded-xl px-3 font-bold text-xs hover:bg-muted/50 transition-all focus:ring-primary/20 shadow-sm">
                    <div className="flex items-center gap-2">
                        <ArrowDownNarrowWide className="h-3.5 w-3.5 text-primary" />
                        <SelectValue placeholder="Ordenar por..." />
                    </div>
                </SelectTrigger>
                
                <SelectContent className="rounded-2xl p-1.5 border-border/40 shadow-xl backdrop-blur-xl">
                    <SortItem value="priority" label="Prioridade" icon={Flag} />
                    <SortItem value="dueDate" label="Vencimento" icon={Calendar} />
                    <SortItem value="createdAt" label="Data de Criação" icon={Clock} />
                    <SortItem value="title" label="Título (A-Z)" icon={AlignLeft} />
                </SelectContent>
            </Select>
        </div>
    );
}

// --- SUBCOMPONENTE COM TIPAGEM CORRETA ---

interface SortItemProps {
    value: string;
    label: string;
    icon: LucideIcon; // Substituímos o 'any' pelo tipo correto
}

function SortItem({ value, label, icon: Icon }: SortItemProps) {
    return (
        <SelectItem 
            value={value} 
            className="rounded-xl px-3 py-2.5 focus:bg-primary/5 cursor-pointer transition-colors group"
        >
            <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-muted group-focus:bg-primary/10 transition-colors">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground group-focus:text-primary" />
                </div>
                <span className="font-bold text-xs tracking-tight">{label}</span>
            </div>
        </SelectItem>
    );
}