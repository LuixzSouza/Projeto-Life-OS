"use client";

import { useState, useMemo } from "react";
import { AccessItem } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Search, Shield, X, Briefcase } from "lucide-react";
import { AccessCard } from "./access-card";
import { cn } from "@/lib/utils";

// --- NOVA INTERFACE ---
interface AccessListProps {
    items: AccessItem[];
    // ✅ PROPRIEDADE ADICIONADA PARA O ERRO DE TIPAGEM
    showClientBadge?: boolean; 
}

export function AccessList({ items, showClientBadge = false }: AccessListProps) {
    const [search, setSearch] = useState("");

    const filteredItems = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        
        return items.filter(item => 
            item.title.toLowerCase().includes(lowerSearch) ||
            (item.username && item.username.toLowerCase().includes(lowerSearch)) ||
            (item.category && item.category.toLowerCase().includes(lowerSearch)) ||
            (item.notes && item.notes.toLowerCase().includes(lowerSearch)) ||
            (item.client && item.client.toLowerCase().includes(lowerSearch))
        );
    }, [search, items]);

    const isSearching = search.length > 0;
    const noResults = isSearching && filteredItems.length === 0;
    const cofferEmpty = items.length === 0;

    return (
        <div className="space-y-6">
            {/* Barra de Busca (Mantida igual) */}
            <div className="relative max-w-lg mx-auto md:mx-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar acesso (título, usuário, cliente, categoria)..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-background border-border/60 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50"
                />
                
                {search && (
                    <button 
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted/50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Contador de Resultados */}
            {isSearching && !noResults && (
                <p className="text-sm text-muted-foreground ml-1">
                    Encontrados <strong className="text-foreground">{filteredItems.length}</strong> {filteredItems.length === 1 ? 'item' : 'itens'}
                </p>
            )}

            {/* Grid ou Empty State */}
            {cofferEmpty || noResults ? (
                <div className={cn(
                    "flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl bg-muted/10",
                    cofferEmpty ? "border-primary/30" : "border-border/60"
                )}>
                    <Shield className={cn("h-12 w-12 mb-4", cofferEmpty ? "text-primary/70" : "text-muted-foreground/50")} />
                    <h3 className="text-xl font-semibold text-foreground">
                        {cofferEmpty ? "Seu Cofre está Vazio" : "Sem Resultados"}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm max-w-md text-center">
                        {cofferEmpty 
                            ? "Adicione seu primeiro acesso seguro para começar a proteger seus dados." 
                            : `Não encontramos nenhum item que corresponda à busca por "${search}". Tente simplificar a pesquisa.`
                        }
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredItems.map(item => (
                        // No AccessCard, a badge do cliente é renderizada se item.client existir.
                        // Não precisamos passar showClientBadge para o AccessCard, mas ele é útil
                        // para o controle de renderização aqui na lista.
                        <AccessCard key={item.id} item={item} /> 
                    ))}
                </div>
            )}
        </div>
    );
}