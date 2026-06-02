// Tipos e constantes de design do formulário de guarda-roupa.
import { Shirt, Layers, Footprints, Gem } from "lucide-react";

export type WardrobeStatus = "IN_CLOSET" | "LAUNDRY" | "LENT" | "REPAIR" | "DONATED";

export type WardrobeItemData = {
    id?: string;
    name?: string;
    category?: string;
    brand?: string | null;
    size?: string | null;
    color?: string | null;
    price?: number | null;
    season?: string | null;
    imageUrl?: string | null;
    status?: WardrobeStatus;
};

export interface WardrobeFormDialogProps {
    mode?: "create" | "edit";
    initialData?: WardrobeItemData;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export const CATEGORY_OPTIONS = [
    { value: "TOP", label: "Cima", icon: Shirt },
    { value: "BOTTOM", label: "Baixo", icon: Layers },
    { value: "SHOES", label: "Calçados", icon: Footprints },
    { value: "ACCESSORY", label: "Acessórios", icon: Gem },
];

export const COLOR_PALETTE = [
    { name: "Preto", hex: "#18181b", class: "bg-zinc-900 border-transparent" },
    { name: "Branco", hex: "#ffffff", class: "bg-white border-border/50" },
    { name: "Cinza", hex: "#71717a", class: "bg-zinc-500 border-transparent" },
    { name: "Azul Marinho", hex: "#1e3a8a", class: "bg-blue-900 border-transparent" },
    { name: "Azul Claro", hex: "#3b82f6", class: "bg-blue-500 border-transparent" },
    { name: "Vermelho", hex: "#dc2626", class: "bg-red-600 border-transparent" },
    { name: "Vinho", hex: "#831843", class: "bg-fuchsia-900 border-transparent" },
    { name: "Verde Oliva", hex: "#4d7c0f", class: "bg-green-700 border-transparent" },
    { name: "Bege / Nude", hex: "#f5f5dc", class: "bg-[#f5f5dc] border-border/40" },
    { name: "Amarelo", hex: "#eab308", class: "bg-yellow-500 border-transparent" },
    { name: "Rosa", hex: "#db2777", class: "bg-pink-600 border-transparent" },
];

