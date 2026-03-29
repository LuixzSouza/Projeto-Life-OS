"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
    Search, Heart, MoreVertical, Pencil, Trash2, 
    Shirt, CheckCircle2, RotateCcw, Droplets, X, Tag, ShoppingBag, 
    AlertTriangle, Sparkles, Wand2, Footprints, Gem, Layers
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteWardrobeItem, toggleFavoriteItem, wearItem } from "@/app/(dashboard)/wardrobe/actions";
import { WardrobeFormDialog, WardrobeItemData } from "./wardrobe-form-dialog";

// --- TIPAGEM ESTRITA ---
interface WardrobeItem {
    id: string;
    name: string;
    category: string;
    brand: string | null;
    size: string | null;
    color: string | null; // Usaremos isso para gerar a capa sem foto!
    season: string | null;
    imageUrl: string | null;
    price: number | null;
    wearCount: number;
    lastWorn: string | null;
    isFavorite: boolean;
    status: "IN_CLOSET" | "LAUNDRY" | "LENT" | "REPAIR" | "DONATED";
    createdAt: string;
    updatedAt: string;
}

// --- HELPERS VISUAIS E DE NEGÓCIO ---
const getCostPerWear = (price: number | null, count: number) => {
    if (!price) return null;
    if (count === 0) return price.toFixed(2);
    return (price / count).toFixed(2);
};

// 🟢 INTELIGÊNCIA VISUAL: Ícones baseados na categoria
const getCategoryIcon = (category: string, className?: string) => {
    switch (category) {
        case "BOTTOM": return <Layers className={className} />;
        case "SHOES": return <Footprints className={className} />;
        case "ACCESSORY": return <Gem className={className} />;
        case "TOP": 
        default: return <Shirt className={className} />;
    }
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case "LAUNDRY": return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200/50 gap-1"><Droplets className="w-3 h-3" /> Lavando</Badge>;
        case "LENT": return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-200/50 gap-1"><RotateCcw className="w-3 h-3" /> Emprestado</Badge>;
        case "REPAIR": return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-200/50 gap-1"><AlertTriangle className="w-3 h-3" /> Conserto</Badge>;
        case "DONATED": return <Badge variant="outline" className="text-muted-foreground bg-muted/50 gap-1"><ShoppingBag className="w-3 h-3" /> Doado</Badge>;
        default: return null; 
    }
};

// --- COMPONENTE PRINCIPAL ---
export function WardrobeList({ initialData }: { initialData: WardrobeItem[] }) {
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("ALL");
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<WardrobeItemData | null>(null);
    
    // Estado para o "Montador de Looks"
    const [outfitBuilder, setOutfitBuilder] = useState<WardrobeItem[]>([]);
    const [isBuildingOutfit, setIsBuildingOutfit] = useState(false);

    // --- FILTRAGEM ---
    const filteredItems = initialData.filter(item => {
        const searchLower = search.toLowerCase();
        const matchesSearch = (item.name?.toLowerCase() || "").includes(searchLower) || 
                              (item.brand?.toLowerCase() || "").includes(searchLower) ||
                              (item.color?.toLowerCase() || "").includes(searchLower); 
        
        const matchesCategory = filterCategory === "ALL" ? true : 
                                filterCategory === "FAVORITES" ? item.isFavorite : 
                                item.category === filterCategory;
        const matchesStatus = filterStatus ? item.status === filterStatus : true;

        return matchesSearch && matchesCategory && matchesStatus;
    });

    // --- ACTIONS BÁSICAS ---
    const handleWear = async (id: string) => {
        toast.promise(wearItem(id), {
            loading: 'Registrando uso...',
            success: 'Look registrado! +1 uso 👗',
            error: 'Erro ao registrar.'
        });
    };

    const handleFavorite = async (id: string, current: boolean) => {
        await toggleFavoriteItem(id, current);
        toast.success(current ? "Removido dos favoritos" : "Adicionado aos favoritos ❤️");
    };

    const handleDelete = async (id: string) => {
        const res = await deleteWardrobeItem(id);
        if (res.success) toast.success(res.message);
        else toast.error("Erro ao excluir.");
    };

    const handleEditClick = (item: WardrobeItem) => {
        setEditingItem({
            id: item.id,
            name: item.name,
            category: item.category,
            brand: item.brand,
            size: item.size,
            color: item.color,
            season: item.season,
            imageUrl: item.imageUrl,
            price: item.price,
            status: item.status
        });
    };

    // --- ACTIONS DO OUTFIT BUILDER ---
    const toggleOutfitItem = (item: WardrobeItem) => {
        setOutfitBuilder(prev => {
            const exists = prev.find(i => i.id === item.id);
            if (exists) return prev.filter(i => i.id !== item.id);
            if (prev.length >= 5) {
                toast.warning("Seu look já tem 5 peças!");
                return prev;
            }
            return [...prev, item];
        });
    };

    const handleWearOutfit = async () => {
        if (outfitBuilder.length === 0) return;
        
        toast.loading("Registrando o look completo...");
        let successCount = 0;
        
        for (const item of outfitBuilder) {
            const res = await wearItem(item.id);
            if (res.success) successCount++;
        }

        toast.success(`Look registrado! ${successCount} peças atualizadas. ✨`);
        setOutfitBuilder([]);
        setIsBuildingOutfit(false);
    };

    return (
        <div className="space-y-6">
            
            {/* OUTFIT BUILDER WIDGET (Premium Look) */}
            {isBuildingOutfit && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 md:p-5 animate-in slide-in-from-top-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shadow-inner">
                    <div className="flex items-center gap-3 w-full xl:w-auto shrink-0">
                        <div className="p-3 bg-primary/10 rounded-2xl"><Wand2 className="h-6 w-6 text-primary" /></div>
                        <div>
                            <h3 className="text-base font-bold text-primary">Montando Look do Dia</h3>
                            <p className="text-xs font-medium text-primary/60">Selecione até 5 peças abaixo</p>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex gap-3 overflow-x-auto px-2 min-h-[60px] items-center bg-background/60 rounded-xl p-3 border border-border/40 w-full scrollbar-hide">
                        {outfitBuilder.length === 0 ? (
                            <span className="text-xs text-muted-foreground font-medium w-full text-center">Clique nas peças para adicionar ao look...</span>
                        ) : (
                            outfitBuilder.map(item => (
                                <div key={`outfit-${item.id}`} className="relative h-12 w-12 shrink-0 rounded-lg border border-border/50 overflow-hidden group shadow-sm">
                                    {item.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center opacity-80" style={{ backgroundColor: item.color || '#e5e7eb' }}>
                                            {getCategoryIcon(item.category, "h-5 w-5 text-white drop-shadow-md")}
                                        </div>
                                    )}
                                    <button onClick={() => toggleOutfitItem(item)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X className="h-4 w-4 text-white" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    
                    <div className="flex gap-2 w-full xl:w-auto shrink-0">
                        <Button variant="ghost" onClick={() => { setIsBuildingOutfit(false); setOutfitBuilder([]); }} className="text-muted-foreground w-full xl:w-auto hover:bg-destructive/10 hover:text-destructive">Cancelar</Button>
                        <Button disabled={outfitBuilder.length === 0} onClick={handleWearOutfit} className="bg-primary shadow-lg shadow-primary/20 w-full xl:w-auto">Usar Look</Button>
                    </div>
                </div>
            )}

            {/* --- TOOLBAR DE FILTROS --- */}
            <div className="flex flex-col gap-4 bg-background p-3 rounded-2xl border border-border/40 shadow-sm">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por nome, marca ou cor..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                            className="pl-10 h-11 bg-muted/20 border-border/50 focus:border-primary/50 transition-all rounded-xl"
                        />
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                        {/* Botão de Ativar o Outfit Builder */}
                        <Button 
                            variant={isBuildingOutfit ? "secondary" : "outline"} 
                            onClick={() => setIsBuildingOutfit(!isBuildingOutfit)}
                            className={cn("h-11 transition-all rounded-xl px-4", isBuildingOutfit ? "bg-primary text-primary-foreground border-primary" : "border-border/50")}
                        >
                            <Sparkles className="h-4 w-4 mr-2" /> Montar Look
                        </Button>
                        
                        {/* Filtro de Lavanderia */}
                        <Button 
                            variant={filterStatus === "LAUNDRY" ? "default" : "outline"} 
                            onClick={() => setFilterStatus(filterStatus === "LAUNDRY" ? null : "LAUNDRY")}
                            className={cn(
                                "h-11 transition-all rounded-xl px-4", 
                                filterStatus === "LAUNDRY" ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" : "text-muted-foreground hover:text-foreground border-border/50"
                            )}
                        >
                            <Droplets className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Lavanderia</span>
                        </Button>
                    </div>
                </div>

                {/* Categorias (Tabs Visuais) */}
                <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-hide">
                    {[
                        { key: "ALL", label: "Tudo" },
                        { key: "FAVORITES", label: "Favoritos ❤️" },
                        { key: "TOP", label: "Parte de Cima" },
                        { key: "BOTTOM", label: "Parte de Baixo" },
                        { key: "SHOES", label: "Calçados" },
                        { key: "ACCESSORY", label: "Acessórios" }
                    ].map((cat) => (
                        <Button 
                            key={cat.key}
                            variant="ghost"
                            size="sm" 
                            onClick={() => setFilterCategory(cat.key)}
                            className={cn(
                                "rounded-lg px-4 font-medium text-xs h-8 transition-all border shrink-0",
                                filterCategory === cat.key 
                                    ? "bg-foreground text-background border-foreground shadow-sm" 
                                    : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            )}
                        >
                            {cat.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* --- GRID DE RESULTADOS --- */}
            {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/60 rounded-3xl bg-muted/10">
                    <div className="bg-background p-4 rounded-2xl mb-4 shadow-sm border border-border/40">
                        <Shirt className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Nenhuma peça encontrada</h3>
                    <p className="text-sm text-muted-foreground mt-1">Adicione uma nova roupa para compor seu acervo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                    {filteredItems.map((item) => {
                        const costPerWear = getCostPerWear(item.price, item.wearCount);
                        const isSelectedForOutfit = outfitBuilder.some(i => i.id === item.id);
                        
                        return (
                            <Card 
                                key={item.id} 
                                onClick={() => isBuildingOutfit ? toggleOutfitItem(item) : undefined}
                                className={cn(
                                    "group relative overflow-hidden border-border/40 shadow-sm transition-all duration-300 bg-card rounded-[1.25rem] flex flex-col",
                                    isBuildingOutfit && "cursor-pointer hover:border-primary/40",
                                    isSelectedForOutfit ? "ring-2 ring-primary border-primary shadow-lg shadow-primary/10 scale-[0.98]" : "hover:shadow-xl hover:border-primary/20"
                                )}
                            >
                                {/* Overlay Visual de Seleção no Modo Outfit */}
                                {isSelectedForOutfit && (
                                    <div className="absolute inset-0 bg-primary/5 z-20 pointer-events-none flex items-center justify-center">
                                        <div className="bg-primary text-primary-foreground p-2 rounded-full shadow-xl">
                                            <CheckCircle2 className="h-6 w-6" />
                                        </div>
                                    </div>
                                )}

                                {/* --- ZONA DE IMAGEM / COR (SEM FOTO) --- */}
                                <div className="aspect-[4/5] relative bg-muted/20 flex items-center justify-center overflow-hidden border-b border-border/20">
                                    {item.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={item.imageUrl} alt={item.name} className={cn("w-full h-full object-cover transition-transform duration-700", !isBuildingOutfit && "group-hover:scale-105")} />
                                    ) : (
                                        // 🟢 MÁGICA "FRICTIONLESS": Se não tem foto, usa a cor e o ícone!
                                        <div className="w-full h-full flex flex-col items-center justify-center opacity-90 transition-transform duration-500 group-hover:scale-105" style={{ backgroundColor: item.color || '#f4f4f5' }}>
                                            {getCategoryIcon(item.category, "h-16 w-16 text-white drop-shadow-md mix-blend-overlay")}
                                        </div>
                                    )}
                                    
                                    {/* Overlay Gradiente (Apenas escurece o topo e base se tiver imagem) */}
                                    {item.imageUrl && !isBuildingOutfit && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />}

                                    {/* Botões Flutuantes (Top Right) */}
                                    {!isBuildingOutfit && (
                                        <div className="absolute top-2 right-2 flex flex-col gap-2 z-10 translate-x-10 group-hover:translate-x-0 transition-transform duration-300">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleFavorite(item.id, item.isFavorite); }}
                                                className="p-2 rounded-full bg-background/80 backdrop-blur-md hover:bg-background transition-colors shadow-sm"
                                            >
                                                <Heart className={cn("h-4 w-4 transition-colors", item.isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground")} />
                                            </button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button onClick={(e) => e.stopPropagation()} className="p-2 rounded-full bg-background/80 backdrop-blur-md hover:bg-background transition-colors shadow-sm text-muted-foreground">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditClick(item); }} className="cursor-pointer font-medium text-xs">
                                                        <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                                                    </DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium text-xs">
                                                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="rounded-2xl">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Excluir {item.name}?</AlertDialogTitle>
                                                                <AlertDialogDescription>Esta ação apagará a peça permanentemente do seu acervo.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">Excluir</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}

                                    {/* Status Badge */}
                                    <div className="absolute top-2 left-2 z-10">
                                        <StatusBadge status={item.status} />
                                    </div>
                                </div>

                                {/* --- CONTEÚDO --- */}
                                <CardContent className="p-4 pb-3 flex-1 flex flex-col gap-1">
                                    <h4 className="font-bold text-sm text-foreground line-clamp-1" title={item.name}>{item.name}</h4>
                                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 truncate">
                                        <Tag className="h-3 w-3 opacity-50" /> {item.brand || "Sem marca"}
                                    </p>

                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <div className="bg-muted/30 p-2 rounded-lg border border-border/40">
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">Usos</p>
                                            <p className="text-xs font-bold text-foreground">{item.wearCount}x</p>
                                        </div>
                                        <div className="bg-muted/30 p-2 rounded-lg border border-border/40">
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">CPW</p>
                                            <p className={cn("text-xs font-bold", (item.wearCount || 0) > 10 ? "text-emerald-600" : "text-foreground")}>
                                                {costPerWear ? `R$ ${costPerWear}` : "-"}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>

                                {/* --- AÇÃO PRINCIPAL --- */}
                                {!isBuildingOutfit && (
                                    <CardFooter className="p-4 pt-0">
                                        <Button 
                                            variant="secondary" 
                                            onClick={(e) => { e.stopPropagation(); handleWear(item.id); }}
                                            className="w-full h-9 text-xs font-bold rounded-lg shadow-sm hover:bg-primary hover:text-primary-foreground transition-all group/btn"
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-1.5 opacity-50 group-hover/btn:opacity-100 transition-opacity" /> Usei Hoje
                                        </Button>
                                    </CardFooter>
                                )}
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Modal de Edição */}
            <WardrobeFormDialog 
                mode="edit" 
                open={!!editingItem} 
                onOpenChange={(open) => !open && setEditingItem(null)} 
                initialData={editingItem || undefined} 
            />
        </div>
    );
}