"use client";

import { useState } from "react";
import { Shirt } from "lucide-react";
import { toast } from "sonner";
import { deleteWardrobeItem, toggleFavoriteItem, wearItem } from "@/app/(dashboard)/wardrobe/actions";
import { WardrobeFormDialog, WardrobeItemData } from "./wardrobe-form-dialog";
import type { WardrobeItem } from "./wardrobe-list-types";
import { OutfitBuilderBar } from "./outfit-builder-bar";
import { WardrobeListToolbar } from "./wardrobe-list-toolbar";
import { WardrobeItemCard } from "./wardrobe-item-card";

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
                <OutfitBuilderBar
                    outfitBuilder={outfitBuilder}
                    onToggleItem={toggleOutfitItem}
                    onCancel={() => { setIsBuildingOutfit(false); setOutfitBuilder([]); }}
                    onWear={handleWearOutfit}
                />
            )}

            {/* --- TOOLBAR DE FILTROS --- */}
            <WardrobeListToolbar
                search={search}
                onSearchChange={setSearch}
                isBuildingOutfit={isBuildingOutfit}
                onToggleOutfitMode={() => setIsBuildingOutfit(!isBuildingOutfit)}
                filterStatus={filterStatus}
                onToggleLaundry={() => setFilterStatus(filterStatus === "LAUNDRY" ? null : "LAUNDRY")}
                filterCategory={filterCategory}
                onCategoryChange={setFilterCategory}
            />

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
                    {filteredItems.map((item) => (
                        <WardrobeItemCard
                            key={item.id}
                            item={item}
                            isBuildingOutfit={isBuildingOutfit}
                            isSelectedForOutfit={outfitBuilder.some(i => i.id === item.id)}
                            onToggleOutfit={toggleOutfitItem}
                            onFavorite={handleFavorite}
                            onEdit={handleEditClick}
                            onDelete={handleDelete}
                            onWear={handleWear}
                        />
                    ))}
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
