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
    Shirt, CheckCircle2, RotateCcw, Droplets, X, Tag, ShoppingBag, AlertTriangle 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteWardrobeItem, toggleFavoriteItem, wearItem } from "@/app/(dashboard)/wardrobe/actions";
import { WardrobeFormDialog, WardrobeItemData } from "./wardrobe-form-dialog";

// --- TIPAGEM ESTRITA (Zero Any) ---
interface WardrobeItem {
    id: string;
    name: string;
    category: string;
    brand: string | null;
    size: string | null;
    color: string | null;
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

// --- HELPERS VISUAIS ---
const getCostPerWear = (price: number | null, count: number) => {
    if (!price) return null;
    if (count === 0) return price.toFixed(2);
    return (price / count).toFixed(2);
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case "LAUNDRY": 
            return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20 gap-1"><Droplets className="w-3 h-3" /> Lavando</Badge>;
        case "LENT": 
            return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20 gap-1"><RotateCcw className="w-3 h-3" /> Emprestado</Badge>;
        case "REPAIR": 
            return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 gap-1"><AlertTriangle className="w-3 h-3" /> Conserto</Badge>;
        case "DONATED": 
            return <Badge variant="outline" className="text-muted-foreground bg-muted/50 gap-1"><ShoppingBag className="w-3 h-3" /> Doado</Badge>;
        default: 
            return null; // "IN_CLOSET" não precisa de badge para manter o visual limpo
    }
};

// --- COMPONENTE PRINCIPAL ---
export function WardrobeList({ initialData }: { initialData: WardrobeItem[] }) {
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("ALL");
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<WardrobeItemData | null>(null);

    // --- FILTRAGEM ---
    const filteredItems = initialData.filter(item => {
        const searchLower = search.toLowerCase();
        const matchesSearch = (item.name?.toLowerCase() || "").includes(searchLower) || 
                              (item.brand?.toLowerCase() || "").includes(searchLower);
        
        const matchesCategory = filterCategory === "ALL" ? true : item.category === filterCategory;
        const matchesStatus = filterStatus ? item.status === filterStatus : true;

        return matchesSearch && matchesCategory && matchesStatus;
    });

    // --- ACTIONS ---
    const handleWear = async (id: string) => {
        const res = await wearItem(id);
        if (res.success) toast.success("Look registrado! +1 uso");
        else toast.error("Erro ao registrar.");
    };

    const handleFavorite = async (id: string, current: boolean) => {
        // Optimistic UI update could be implemented here via React Query or similar, 
        // but for now we rely on Server Action + Toast
        await toggleFavoriteItem(id, current);
        toast.success(current ? "Removido dos favoritos" : "Adicionado aos favoritos ❤️");
    };

    const handleDelete = async (id: string) => {
        const res = await deleteWardrobeItem(id);
        if (res.success) toast.success(res.message);
        else toast.error("Erro ao excluir.");
    };

    // Mapper para edição
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

    return (
        <div className="space-y-8">
            
            {/* --- TOOLBAR DE FILTROS --- */}
            <div className="flex flex-col gap-4 bg-card/50 backdrop-blur-sm p-2 rounded-2xl border border-border/60 shadow-sm">
                <div className="flex flex-col md:flex-row gap-3 p-2">
                    {/* Busca */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por nome, marca ou cor..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                            className="pl-10 h-10 bg-background border-border/50 focus:border-primary/50 transition-all"
                        />
                    </div>
                    
                    {/* Filtro de Status (Toggle) */}
                    <div className="flex gap-2">
                        <Button 
                            variant={filterStatus === "LAUNDRY" ? "default" : "outline"} 
                            size="sm"
                            onClick={() => setFilterStatus(filterStatus === "LAUNDRY" ? null : "LAUNDRY")}
                            className={cn(
                                "h-10 border-dashed transition-all", 
                                filterStatus === "LAUNDRY" ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Droplets className="h-4 w-4 mr-2" /> Lavanderia
                        </Button>
                        {filterStatus && (
                             <Button variant="ghost" size="icon" onClick={() => setFilterStatus(null)} className="h-10 w-10 text-destructive hover:bg-destructive/10">
                                <X className="h-4 w-4" />
                             </Button>
                        )}
                    </div>
                </div>

                {/* Categorias (Tabs Visuais) */}
                <div className="flex gap-2 overflow-x-auto pb-2 px-2 scrollbar-hide">
                    {[
                        { key: "ALL", label: "Tudo" },
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
                                "rounded-lg px-4 font-medium text-xs h-8 transition-all border",
                                filterCategory === cat.key 
                                    ? "bg-secondary text-secondary-foreground border-primary/20 shadow-sm" 
                                    : "border-transparent text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {cat.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* --- GRID DE RESULTADOS --- */}
            {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-3xl bg-muted/20">
                    <div className="bg-background p-4 rounded-full mb-3 shadow-sm ring-1 ring-border">
                        <Shirt className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Nenhuma peça encontrada</h3>
                    <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros ou adicione novas roupas ao seu closet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredItems.map((item) => {
                        const costPerWear = getCostPerWear(item.price, item.wearCount);
                        
                        return (
                            <Card key={item.id} className="group relative overflow-hidden border-border/60 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 bg-card rounded-2xl flex flex-col">
                                
                                {/* --- ZONA DE IMAGEM --- */}
                                <div className="aspect-[3/4] relative bg-muted/30 flex items-center justify-center overflow-hidden">
                                    {item.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    ) : (
                                        <Shirt className="h-12 w-12 text-muted-foreground/20" />
                                    )}
                                    
                                    {/* Overlay Gradiente (Hover) */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    {/* Botões Flutuantes (Top Right) */}
                                    <div className="absolute top-2 right-2 flex flex-col gap-2 z-10 translate-x-10 group-hover:translate-x-0 transition-transform duration-300">
                                        <button 
                                            onClick={() => handleFavorite(item.id, item.isFavorite)}
                                            className="p-2 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 transition-colors shadow-lg"
                                        >
                                            <Heart className={cn("h-4 w-4 transition-colors", item.isFavorite ? "fill-red-500 text-red-500" : "text-white")} />
                                        </button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-2 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 transition-colors shadow-lg text-white">
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEditClick(item)}>
                                                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                                                </DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Excluir {item.name}?</AlertDialogTitle>
                                                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Status Badge (Top Left) */}
                                    <div className="absolute top-2 left-2 z-10">
                                        <StatusBadge status={item.status} />
                                    </div>
                                </div>

                                {/* --- CONTEÚDO --- */}
                                <CardContent className="p-4 pb-0 flex-1 flex flex-col gap-1">
                                    <h4 className="font-bold text-sm text-foreground line-clamp-1" title={item.name}>{item.name}</h4>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Tag className="h-3 w-3" /> {item.brand || "Sem marca"}
                                    </p>

                                    {/* Métricas Compactas */}
                                    <div className="grid grid-cols-2 gap-2 mt-3 mb-1">
                                        <div className="bg-secondary/40 p-1.5 rounded-md text-center border border-border/50">
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Usos</p>
                                            <p className="text-xs font-bold text-foreground">{item.wearCount}</p>
                                        </div>
                                        <div className="bg-secondary/40 p-1.5 rounded-md text-center border border-border/50">
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">CPW</p>
                                            <p className={cn("text-xs font-bold", (item.wearCount || 0) > 10 ? "text-emerald-600 dark:text-emerald-400" : "text-primary")}>
                                                {costPerWear ? `R$ ${costPerWear}` : "-"}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>

                                {/* --- AÇÃO PRINCIPAL --- */}
                                <CardFooter className="p-3 pt-2">
                                    <Button 
                                        variant="default" 
                                        size="sm" 
                                        onClick={() => handleWear(item.id)}
                                        className="w-full h-9 text-xs font-semibold rounded-lg shadow-md shadow-primary/10 active:scale-95 transition-all bg-gradient-to-r from-primary to-primary/90 hover:to-primary"
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Usei Hoje
                                    </Button>
                                </CardFooter>
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