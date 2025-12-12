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
    Shirt, CheckCircle2, RotateCcw, Droplets, Filter, X 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteWardrobeItem, toggleFavoriteItem, wearItem } from "@/app/(dashboard)/wardrobe/actions";
import { WardrobeFormDialog, WardrobeItemData } from "./wardrobe-form-dialog";

// Definindo a interface exata do que vem do banco de dados (Prisma)
// Isso substitui o uso de 'any' e satisfaz o ESLint
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
    // Status deve ser restrito aos valores do Enum
    status: "IN_CLOSET" | "LAUNDRY" | "LENT" | "REPAIR" | "DONATED";
    createdAt: string;
    updatedAt: string;
}

export function WardrobeList({ initialData }: { initialData: WardrobeItem[] }) {
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("ALL");
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<WardrobeItemData | null>(null);

    // --- FILTRAGEM ---
    const filteredItems = initialData.filter(item => {
        const matchesSearch = (item.name?.toLowerCase() || "").includes(search.toLowerCase()) || 
                              (item.brand?.toLowerCase() || "").includes(search.toLowerCase());
        
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
        await toggleFavoriteItem(id, current);
        toast.success(current ? "Removido dos favoritos" : "Adicionado aos favoritos ❤️");
    };

    const handleDelete = async (id: string) => {
        const res = await deleteWardrobeItem(id);
        if (res.success) toast.success(res.message);
        else toast.error("Erro ao excluir.");
    };

    // Converter para formato de edição
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

    // --- HELPERS VISUAIS ---
    const getCostPerWear = (price: number | null, count: number) => {
        if (!price) return null;
        if (count === 0) return price.toFixed(2);
        return (price / count).toFixed(2);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "LAUNDRY": return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0 shadow-sm"><Droplets className="w-3 h-3 mr-1" /> Lavando</Badge>;
            case "LENT": return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0 shadow-sm"><RotateCcw className="w-3 h-3 mr-1" /> Emprestado</Badge>;
            case "REPAIR": return <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200 border-0 shadow-sm">Conserto</Badge>;
            case "DONATED": return <Badge variant="outline" className="text-zinc-400 border-zinc-200 bg-zinc-50">Doado</Badge>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            
            {/* Barra de Controle */}
            <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input 
                            placeholder="Buscar peça, marca ou cor..." 
                            value={search} onChange={(e) => setSearch(e.target.value)} 
                            className="pl-9 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                        />
                    </div>
                    {/* Filtro Rápido de Status */}
                    <div className="flex gap-2">
                        <Button 
                            variant={filterStatus === "LAUNDRY" ? "default" : "outline"} 
                            size="sm"
                            onClick={() => setFilterStatus(filterStatus === "LAUNDRY" ? null : "LAUNDRY")}
                            className={cn("h-10 border-dashed", filterStatus === "LAUNDRY" && "bg-blue-600 border-blue-600 text-white")}
                        >
                            <Droplets className="h-4 w-4 mr-1" /> Lavando
                        </Button>
                        {filterStatus && (
                             <Button variant="ghost" size="icon" onClick={() => setFilterStatus(null)} className="h-10 w-10 text-red-500 hover:bg-red-50"><X className="h-4 w-4" /></Button>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                        { key: "ALL", label: "Tudo" },
                        { key: "TOP", label: "Parte de Cima" },
                        { key: "BOTTOM", label: "Parte de Baixo" },
                        { key: "SHOES", label: "Sapatos" },
                        { key: "ACCESSORY", label: "Acessórios" }
                    ].map((cat) => (
                        <Button 
                            key={cat.key}
                            variant={filterCategory === cat.key ? "default" : "outline"} 
                            size="sm" 
                            onClick={() => setFilterCategory(cat.key)}
                            className={cn(
                                "rounded-xl px-4 font-medium transition-all text-xs h-9",
                                filterCategory === cat.key ? "bg-violet-600 hover:bg-violet-700 text-white border-violet-600" : "text-zinc-600 border-zinc-200 bg-white hover:bg-zinc-50"
                            )}
                        >
                            {cat.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Grid de Roupas */}
            {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50">
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-full mb-3">
                        <Shirt className="h-8 w-8 text-zinc-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Nenhuma peça encontrada</h3>
                    <p className="text-sm text-zinc-500">Tente ajustar os filtros ou adicione novas roupas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredItems.map((item) => {
                        const costPerWear = getCostPerWear(item.price, item.wearCount);
                        
                        return (
                            <Card key={item.id} className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 rounded-2xl flex flex-col">
                                
                                {/* IMAGEM */}
                                <div className="aspect-[4/5] relative bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center overflow-hidden">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name || "Roupa"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    ) : (
                                        <Shirt className="h-12 w-12 text-zinc-300" />
                                    )}
                                    
                                    {/* Overlay Gradiente */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    {/* Botão Favoritar */}
                                    <button 
                                        onClick={() => handleFavorite(item.id, item.isFavorite)}
                                        className="absolute top-2 right-2 p-2 rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 transition-all z-10 active:scale-90"
                                    >
                                        <Heart className={cn("h-4 w-4 transition-colors", item.isFavorite ? "fill-red-500 text-red-500" : "text-white")} />
                                    </button>

                                    {/* Status Badge */}
                                    <div className="absolute top-2 left-2 z-10">
                                        {getStatusBadge(item.status)}
                                    </div>
                                </div>

                                {/* CONTEÚDO */}
                                <CardContent className="p-3 pb-0 flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="min-w-0 pr-2">
                                            <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1 truncate" title={item.name}>{item.name}</h4>
                                            <p className="text-xs text-zinc-500 line-clamp-1 truncate">{item.brand || "Sem marca"}</p>
                                        </div>
                                        
                                        {/* Menu de Ações */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 -mr-2 text-zinc-400 hover:text-zinc-900 shrink-0"><MoreVertical className="h-3.5 w-3.5" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEditClick(item)}>
                                                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                                                </DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                                                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Excluir peça?</AlertDialogTitle>
                                                            <AlertDialogDescription>Isso não pode ser desfeito.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Métricas Financeiras Compactas */}
                                    <div className="grid grid-cols-2 gap-2 mt-3 mb-2">
                                        <div className="bg-zinc-50 dark:bg-zinc-950 p-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800 text-center">
                                            <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Usos</p>
                                            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{item.wearCount}</p>
                                        </div>
                                        <div className="bg-zinc-50 dark:bg-zinc-950 p-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800 text-center">
                                            <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">CPW</p>
                                            <p className={cn("text-xs font-bold", (item.wearCount || 0) > 10 ? "text-emerald-600" : "text-violet-600")}>
                                                {costPerWear ? `R$ ${costPerWear}` : "-"}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>

                                {/* AÇÃO RÁPIDA: "USEI HOJE" */}
                                <CardFooter className="p-3 pt-2">
                                    <Button 
                                        variant="default" 
                                        size="sm" 
                                        onClick={() => handleWear(item.id)}
                                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 h-9 text-xs font-semibold rounded-xl shadow-sm active:scale-95 transition-all"
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