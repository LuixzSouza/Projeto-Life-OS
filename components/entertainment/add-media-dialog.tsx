"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, Plus, Film, Music, Gamepad2, X, Check, ImageOff } from "lucide-react";
import { searchMedia, addMediaItem, type SearchResult, type MediaType } from "@/app/(dashboard)/entertainment/actions";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export function AddMediaDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    
    // Estados de Loading
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);
    const [isSavingId, setIsSavingId] = useState<string | null>(null);
    
    const [activeTab, setActiveTab] = useState<MediaType>('MOVIE');

    const inputRef = useRef<HTMLInputElement>(null);

    // ✅ CORREÇÃO 1: Handler dedicado para mudança de estado do Dialog
    // Isso substitui a lógica de limpeza que estava no useEffect
    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        
        if (!open) {
            // Se estiver fechando, limpamos os estados aqui (Event Handler é seguro)
            // React agrupa essas atualizações (Batching), evitando re-renders extras
            setTimeout(() => {
                setResults([]);
                setQuery("");
            }, 300); // Pequeno delay para não limpar visualmente antes da animação de fechar terminar
        }
    };

    // ✅ CORREÇÃO 2: useEffect puramente para Foco (Visual)
    useEffect(() => {
        if (isOpen) {
            // Pequeno delay para garantir que o modal montou no DOM
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Função de Busca Unificada
    async function handleSearch(overrideType?: MediaType) {
        if (!query.trim()) return;
        
        setIsLoadingSearch(true);
        setResults([]);

        let apiType: 'VIDEO' | 'MUSIC' | 'GAME' = 'VIDEO';
        const typeToSearch = overrideType || activeTab;

        if (typeToSearch === 'ALBUM') apiType = 'MUSIC';
        else if (typeToSearch === 'GAME') apiType = 'GAME';
        else apiType = 'VIDEO';

        const data = await searchMedia(query, apiType);
        setResults(data);
        setIsLoadingSearch(false);
    }

    const handleTabChange = (val: string) => {
        const newTab = val as MediaType;
        setActiveTab(newTab);
        if (query) {
            handleSearch(newTab);
        } else {
            setResults([]);
        }
    };

    async function handleSave(item: SearchResult) {
        if (isSavingId) return;
        setIsSavingId(item.id);

        const result = await addMediaItem(item);
        
        if (result.success) {
            toast.success(
                <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="font-bold">{item.title}</span> salvo na coleção!
                </div>
            );
            handleOpenChange(false); // Fecha usando o handler correto
        } else {
            toast.error("Erro ao salvar o item. Tente novamente.");
        }
        setIsSavingId(null);
    }

    const clearSearch = () => {
        setQuery("");
        setResults([]);
        inputRef.current?.focus();
    };

    const getPlaceholder = () => {
        switch (activeTab) {
            case 'GAME': return "Ex: The Witcher 3, Cyberpunk, Zelda...";
            case 'ALBUM': return "Ex: Pink Floyd, Daft Punk, Anitta...";
            default: return "Ex: Interestelar, Breaking Bad, Matrix...";
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}> 
            {/* ✅ Usamos o handleOpenChange aqui */}
            
            <DialogTrigger asChild>
                <Button size="lg" className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20 gap-2 font-semibold transition-transform active:scale-95">
                    <Plus className="h-5 w-5" /> Adicionar Novo
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden border-zinc-200 dark:border-zinc-800">
                
                {/* Header Integrado */}
                <div className="p-6 pb-4 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Adicionar à Coleção</DialogTitle>
                        <DialogDescription>Busque e salve seus favoritos instantaneamente.</DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="MOVIE" onValueChange={handleTabChange} className="w-full mt-4">
                        <TabsList className="grid w-full grid-cols-3 h-10">
                            <TabsTrigger value="MOVIE" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-rose-500">
                                <Film className="h-4 w-4 mr-2" /> Filmes/TV
                            </TabsTrigger>
                            <TabsTrigger value="GAME" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-green-500">
                                <Gamepad2 className="h-4 w-4 mr-2" /> Jogos
                            </TabsTrigger>
                            <TabsTrigger value="ALBUM" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-indigo-500">
                                <Music className="h-4 w-4 mr-2" /> Álbuns
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input 
                            ref={inputRef}
                            placeholder={getPlaceholder()} 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="pl-9 pr-10 h-11 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 focus-visible:ring-offset-0 focus-visible:ring-rose-500"
                        />
                        {query && (
                            <button 
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    
                    <div className="flex justify-end mt-2">
                        <Button 
                            onClick={() => handleSearch()} 
                            disabled={isLoadingSearch || !query.trim()}
                            size="sm"
                            className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                        >
                            {isLoadingSearch ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                            {isLoadingSearch ? "Buscando..." : "Pesquisar"}
                        </Button>
                    </div>
                </div>

                {/* Área de Resultados */}
                <ScrollArea className="h-[380px] bg-white dark:bg-zinc-950 p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        
                        {isLoadingSearch && Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className={`w-full rounded-lg ${activeTab === 'GAME' ? 'aspect-video' : 'aspect-[2/3]'}`} />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        ))}

                        {!isLoadingSearch && results.map((item) => {
                            const isSavingThis = isSavingId === item.id;
                            
                            return (
                                <div 
                                    key={item.id} 
                                    className={`
                                        group relative cursor-pointer rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 
                                        transition-all duration-300 hover:shadow-lg hover:border-rose-500/50 hover:scale-[1.02]
                                        ${isSavingThis ? 'opacity-70 pointer-events-none' : ''}
                                    `}
                                    onClick={() => handleSave(item)}
                                >
                                    <div className={`w-full relative bg-zinc-100 dark:bg-zinc-800 ${activeTab === 'GAME' ? 'aspect-video' : 'aspect-[2/3]'}`}>
                                        {item.coverUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img 
                                                src={item.coverUrl} 
                                                alt={item.title} 
                                                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" 
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-zinc-300 gap-2">
                                                <ImageOff className="h-8 w-8" />
                                                <span className="text-[10px] uppercase font-bold tracking-widest">Sem Imagem</span>
                                            </div>
                                        )}

                                        <div className={`
                                            absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-200
                                            ${isSavingThis ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                        `}>
                                            {isSavingThis ? (
                                                <Loader2 className="h-8 w-8 text-white animate-spin" />
                                            ) : (
                                                <div className="bg-white text-black rounded-full p-2 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                                    <Plus className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800/50">
                                        <p className="font-bold truncate text-sm text-zinc-800 dark:text-zinc-200" title={item.title}>{item.title}</p>
                                        <p className="text-xs text-zinc-500 truncate mt-0.5">{item.subtitle}</p>
                                    </div>
                                </div>
                            );
                        })}

                        {!isLoadingSearch && results.length === 0 && query && (
                            <div className="col-span-full py-12 text-center text-zinc-500">
                                <p>Nenhum resultado encontrado para &quot;{query}&quot;.</p>
                                <p className="text-xs mt-1">Tente outro termo ou troque a categoria.</p>
                            </div>
                        )}

                        {!isLoadingSearch && results.length === 0 && !query && (
                            <div className="col-span-full py-16 flex flex-col items-center justify-center text-zinc-400 opacity-50">
                                <Search className="h-10 w-10 mb-3" />
                                <p className="text-sm">Digite acima para buscar no banco de dados.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}