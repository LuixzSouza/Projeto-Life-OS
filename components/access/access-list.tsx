"use client";

import { useState, useMemo } from "react";
import { AccessItem } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Search, Shield, X } from "lucide-react";
import { AccessCard } from "./access-card";

export function AccessList({ items }: { items: AccessItem[] }) {
    const [search, setSearch] = useState("");

    // Usar useMemo para evitar recomputação desnecessária
    const filteredItems = useMemo(() => {
        return items.filter(item => 
            item.title.toLowerCase().includes(search.toLowerCase()) ||
            (item.username && item.username.toLowerCase().includes(search.toLowerCase())) ||
            (item.category && item.category.toLowerCase().includes(search.toLowerCase())) ||
            (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()))
        );
    }, [search, items]);

    return (
        <div className="space-y-6">
            {/* Barra de Busca */}
            <div className="relative max-w-md mx-auto md:mx-0">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input 
                    placeholder="Buscar acesso (nome, user, categoria, notas)..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                />
                {/* Botão para limpar a busca */}
                {search && (
                    <button 
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Grid */}
            {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <Shield className="h-12 w-12 text-zinc-300 mb-4" />
                    <h3 className="text-lg font-semibold text-zinc-600 dark:text-zinc-400">
                        {items.length === 0 ? "Seu cofre está vazio" : "Nenhum resultado encontrado"}
                    </h3>
                    <p className="text-zinc-400 text-sm">
                        {items.length === 0 ? "Adicione sua primeira senha para começar." : `Não encontramos nada com "${search}"`}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredItems.map(item => (
                        <AccessCard key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}
