"use client";

import { useState, useMemo } from "react";
import { MediaItem } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
    Search, Clapperboard, Gamepad2, Disc, LayoutGrid, Dices, Trash2, 
    Tv, Music2, Trophy, Heart, CheckCircle2, PlayCircle, MoreVertical, BookmarkPlus,
    LucideIcon, Filter
} from "lucide-react";
import { deleteMediaItem, updateMediaStatus } from "@/app/(dashboard)/entertainment/actions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { AddMediaDialog } from "./add-media-dialog";
import { cn } from "@/lib/utils";

// --- TIPAGEM ---
type CategoryType = "WISHLIST" | "PLAYING" | "COMPLETED" | "FAVORITE";
type MediaTabType = "ALL" | "WATCH" | "PLAY" | "LISTEN";

interface StatusConfigItem {
    label: string;
    icon: LucideIcon;
    color: string;
    bg: string;
    activeClass: string;
}

// Configuração Visual dos Tipos
const TYPE_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
    MOVIE: { icon: Clapperboard, label: "Filme" },
    TV: { icon: Tv, label: "Série" },
    GAME: { icon: Gamepad2, label: "Jogo" },
    ALBUM: { icon: Disc, label: "Álbum" },
};

// Configuração Visual dos Status
const STATUS_CONFIG: Record<string, StatusConfigItem> = {
    WISHLIST: { 
        label: "Na Lista", 
        icon: BookmarkPlus, 
        color: "text-yellow-500", 
        bg: "bg-blue-500/10",
        activeClass: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400"
    },
    PLAYING: { 
        label: "Ativo", // O label muda dinamicamente no componente
        icon: PlayCircle, 
        color: "text-purple-500", 
        bg: "bg-purple-500/10",
        activeClass: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400"
    },
    COMPLETED: { 
        label: "Concluído", 
        icon: CheckCircle2, 
        color: "text-green-500", 
        bg: "bg-green-500/10",
        activeClass: "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400"
    },
    FAVORITE: { 
        label: "Favoritos", 
        icon: Heart, 
        color: "text-rose-500", 
        bg: "bg-rose-500/10",
        activeClass: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400"
    },
};

export function EntertainmentBoard({ initialItems }: { initialItems: MediaItem[] }) {
    const [filterQuery, setFilterQuery] = useState("");
    const [activeTypeTab, setActiveTypeTab] = useState<string>("ALL"); 
    const [activeStatusFilter, setActiveStatusFilter] = useState<string>("ALL");
    
    const [randomItem, setRandomItem] = useState<MediaItem | null>(null);

    // --- LÓGICA DE FILTRAGEM OTIMIZADA ---
    const filteredItems = useMemo(() => {
        let items = initialItems;

        // 1. Filtro por Tipo (Abas Principais)
        if (activeTypeTab === "WATCH") items = items.filter(i => i.type === 'MOVIE' || i.type === 'TV');
        else if (activeTypeTab === "PLAY") items = items.filter(i => i.type === 'GAME');
        else if (activeTypeTab === "LISTEN") items = items.filter(i => i.type === 'ALBUM');

        // 2. Filtro por Status (Barra Secundária)
        if (activeStatusFilter !== "ALL") {
            items = items.filter(i => i.category === activeStatusFilter);
        }

        // 3. Filtro por Texto
        if (filterQuery) {
            const lower = filterQuery.toLowerCase();
            items = items.filter(i => 
                i.title.toLowerCase().includes(lower) || 
                (i.subtitle && i.subtitle.toLowerCase().includes(lower))
            );
        }

        return items;
    }, [initialItems, activeTypeTab, activeStatusFilter, filterQuery]);

    // --- ESTATÍSTICAS ---
    const stats = useMemo(() => {
        return {
            total: initialItems.length,
            watch: initialItems.filter(i => i.type === 'MOVIE' || i.type === 'TV').length,
            play: initialItems.filter(i => i.type === 'GAME').length,
            listen: initialItems.filter(i => i.type === 'ALBUM').length,
        };
    }, [initialItems]);

    // --- HELPERS DE TEXTO DINÂMICO ---
    const getPlayingLabel = () => {
        if (activeTypeTab === 'PLAY') return "Jogando";
        if (activeTypeTab === 'WATCH') return "Assistindo";
        if (activeTypeTab === 'LISTEN') return "Ouvindo";
        return "Consumindo Agora";
    };

    const handlePickRandom = () => {
        const backlog = filteredItems.filter(i => i.category === 'WISHLIST');
        const pool = backlog.length > 0 ? backlog : filteredItems;

        if (pool.length === 0) {
            toast.info("Nada para sortear neste filtro.");
            return;
        }
        const random = pool[Math.floor(Math.random() * pool.length)];
        setRandomItem(random);
    };

    return (
        <div className="space-y-6">
            
            {/* 1. Header de Controle Principal */}
            <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
                
                {/* Abas de Tipo (Tabs) */}
                <Tabs defaultValue="ALL" className="w-full xl:w-auto" onValueChange={(val) => { setActiveTypeTab(val); setActiveStatusFilter("ALL"); }}>
                    <TabsList className="grid w-full xl:w-auto grid-cols-4 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl h-auto">
                        <TabsTrigger value="ALL" className="gap-2 text-xs sm:text-sm py-2">
                            <LayoutGrid className="h-4 w-4" /> <span className="hidden sm:inline">Geral</span>
                            <span className="ml-1 text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1.5 rounded-full">{stats.total}</span>
                        </TabsTrigger>
                        <TabsTrigger value="WATCH" className="gap-2 data-[state=active]:text-rose-600 text-xs sm:text-sm py-2">
                            <Clapperboard className="h-4 w-4" /> <span className="hidden sm:inline">Assistir</span>
                            <span className="ml-1 text-[10px] bg-rose-100 text-rose-700 px-1.5 rounded-full">{stats.watch}</span>
                        </TabsTrigger>
                        <TabsTrigger value="PLAY" className="gap-2 data-[state=active]:text-green-600 text-xs sm:text-sm py-2">
                            <Gamepad2 className="h-4 w-4" /> <span className="hidden sm:inline">Jogar</span>
                            <span className="ml-1 text-[10px] bg-green-100 text-green-700 px-1.5 rounded-full">{stats.play}</span>
                        </TabsTrigger>
                        <TabsTrigger value="LISTEN" className="gap-2 data-[state=active]:text-indigo-600 text-xs sm:text-sm py-2">
                            <Music2 className="h-4 w-4" /> <span className="hidden sm:inline">Ouvir</span>
                            <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded-full">{stats.listen}</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Ações e Busca */}
                <div className="flex gap-2 w-full xl:w-auto">
                    <div className="relative flex-1 xl:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input 
                            placeholder="Buscar título..." 
                            className="pl-9 bg-white dark:bg-zinc-900"
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={handlePickRandom} title="Me sugira algo!">
                        <Dices className="h-5 w-5 text-indigo-500" />
                    </Button>
                </div>
            </div>

            {/* 2. Filtros de Status (Sub-navegação Clean) */}
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-xs font-semibold text-zinc-400 mr-2 flex items-center gap-1">
                    <Filter className="h-3 w-3" /> FILTRAR:
                </span>
                
                <StatusFilterButton 
                    label="Mostrar Tudo" 
                    isActive={activeStatusFilter === "ALL"} 
                    onClick={() => setActiveStatusFilter("ALL")} 
                />
                
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                    // Texto dinâmico para "Playing"
                    const label = key === 'PLAYING' ? getPlayingLabel() : config.label;
                    return (
                        <StatusFilterButton 
                            key={key}
                            label={label}
                            icon={config.icon}
                            isActive={activeStatusFilter === key}
                            onClick={() => setActiveStatusFilter(key)}
                            activeClass={config.activeClass}
                        />
                    );
                })}
            </div>

            {/* 3. Grid de Conteúdo */}
            {filteredItems.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30">
                    <Trophy className="h-12 w-12 mx-auto text-zinc-300 mb-3" />
                    <p className="text-zinc-500 font-medium">Nenhum item encontrado.</p>
                    <p className="text-sm text-zinc-400">Tente mudar o filtro ou adicione novos itens.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-in fade-in slide-in-from-bottom-4">
                    {filteredItems.map((item) => (
                        <MediaCard key={item.id} item={item} />
                    ))}
                </div>
            )}

            {/* Modal de Sorteio */}
            <Dialog open={!!randomItem} onOpenChange={(open) => !open && setRandomItem(null)}>
                <DialogContent className="sm:max-w-md text-center">
                    <DialogHeader>
                        <DialogTitle className="flex flex-col items-center gap-3 pb-2">
                            <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 animate-bounce">
                                <Dices className="h-6 w-6" />
                            </div>
                            <span className="text-2xl">Sugestão do Destino</span>
                        </DialogTitle>
                        <DialogDescription>
                            Dica para agora baseada na sua lista <strong>{activeTypeTab === 'ALL' ? 'Geral' : activeTypeTab}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {randomItem && (
                        <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                            <div className={`w-32 mx-auto rounded-lg overflow-hidden shadow-md mb-4 ${randomItem.type === 'GAME' ? 'aspect-video' : 'aspect-[2/3]'}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={randomItem.coverUrl || ""} alt={randomItem.title} className="w-full h-full object-cover" />
                            </div>
                            <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{randomItem.title}</h3>
                            <Badge variant="outline" className="mt-2">
                                {TYPE_CONFIG[randomItem.type]?.label}
                            </Badge>
                        </div>
                    )}

                    <DialogFooter className="mt-4 sm:justify-center">
                        <Button onClick={() => setRandomItem(null)} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700">
                            Aceitar Sugestão
                        </Button>
                        <Button variant="ghost" onClick={handlePickRandom}>Sortear Outro</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- SUBCOMPONENTES TYPED ---

interface StatusFilterButtonProps {
    label: string;
    icon?: LucideIcon;
    isActive: boolean;
    onClick: () => void;
    activeClass?: string;
}

function StatusFilterButton({ label, icon: Icon, isActive, onClick, activeClass }: StatusFilterButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                isActive 
                    ? `border-transparent shadow-sm ${activeClass || "bg-zinc-900 text-white dark:bg-white dark:text-black"}` 
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
        >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
        </button>
    );
}

function MediaCard({ item }: { item: MediaItem }) {
    // Fallback seguro usando type assertion se necessário, mas MediaItem garante strings válidas
    const typeKey = item.type as keyof typeof TYPE_CONFIG;
    const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.MOVIE;
    
    // Fallback para status
    const statusKey = (item.category || "WISHLIST") as keyof typeof STATUS_CONFIG;
    const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.WISHLIST;
    
    const Icon = config.icon;
    const isLandscape = item.type === 'GAME';

    const handleStatusChange = async (newStatus: string) => {
        const result = await updateMediaStatus(item.id, newStatus);
        if (result.success) {
            toast.success("Status atualizado!");
        } else {
            toast.error("Erro ao atualizar.");
        }
    };

    return (
        <div className="group relative flex flex-col gap-2">
            <div className={cn(
                "relative w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-800 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
                isLandscape ? 'aspect-video' : 'aspect-[2/3]'
            )}>
                {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                        src={item.coverUrl} 
                        alt={item.title} 
                        className={cn(
                            "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                            item.category === 'COMPLETED' && "grayscale-[0.5]" // Efeito visual para completados
                        )}
                        loading="lazy"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-zinc-300">
                        <Icon className="h-10 w-10" />
                    </div>
                )}

                {/* Badge de Status (Flutuante) */}
                <div className={cn(
                    "absolute top-2 left-2 px-2 py-1 rounded-md backdrop-blur-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm border border-white/10 bg-opacity-90 transition-all",
                    status.bg, status.color
                )}>
                    <status.icon className="h-3 w-3" /> 
                    <span className="hidden sm:inline">{status.label}</span>
                </div>

                {/* Menu de Ações (Top Right) */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 text-white border-none shadow-sm">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={item.category || "WISHLIST"} onValueChange={handleStatusChange}>
                                <DropdownMenuRadioItem value="WISHLIST" className="gap-2 cursor-pointer text-xs">
                                    <BookmarkPlus className="h-3.5 w-3.5 text-yellow-500" /> Na Lista
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="PLAYING" className="gap-2 cursor-pointer text-xs">
                                    <PlayCircle className="h-3.5 w-3.5 text-purple-500" /> Consumindo
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="COMPLETED" className="gap-2 cursor-pointer text-xs">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Concluído
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="FAVORITE" className="gap-2 cursor-pointer text-xs">
                                    <Heart className="h-3.5 w-3.5 text-rose-500" /> Favorito
                                </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600 gap-2 cursor-pointer text-xs"
                                onClick={() => {
                                    if(confirm("Remover este item?")) {
                                        deleteMediaItem(item.id);
                                        toast.success("Item removido.");
                                    }
                                }}
                            >
                                <Trash2 className="h-3.5 w-3.5" /> Remover da Coleção
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Texto Overlay (Degradê Suave) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 pointer-events-none">
                    <div className="translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <p className="text-white font-bold text-xs line-clamp-2">{item.title}</p>
                        <p className="text-white/70 text-[10px]">{item.subtitle}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}