"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    Shirt, Tag, DollarSign, Ruler, UploadCloud, 
    Camera, X, Loader2, Layers, Check, Footprints, Watch,
    Palette
} from "lucide-react";
import { toast } from "sonner";
import { createWardrobeItem, updateWardrobeItem } from "@/app/(dashboard)/wardrobe/actions";
import { cn } from "@/lib/utils";

// Tipagem
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
    status?: "IN_CLOSET" | "LAUNDRY" | "LENT" | "REPAIR" | "DONATED";
};

interface WardrobeFormDialogProps {
    mode?: "create" | "edit";
    initialData?: WardrobeItemData;
    trigger?: React.ReactNode; 
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const CATEGORY_OPTIONS = [
    { value: "TOP", label: "Parte de Cima", icon: Shirt },
    { value: "BOTTOM", label: "Parte de Baixo", icon: Layers },
    { value: "SHOES", label: "Calçados", icon: Footprints },
    { value: "ACCESSORY", label: "Acessórios", icon: Watch },
];

const COLOR_PALETTE = [
    { name: "Preto", hex: "#000000" },
    { name: "Branco", hex: "#FFFFFF" },
    { name: "Cinza", hex: "#808080" },
    { name: "Azul", hex: "#0000FF" },
    { name: "Vermelho", hex: "#FF0000" },
    { name: "Verde", hex: "#008000" },
    { name: "Beige", hex: "#F5F5DC" },
];

export function WardrobeFormDialog({ 
    mode = "create", 
    initialData, 
    trigger, 
    open: controlledOpen, 
    onOpenChange 
}: WardrobeFormDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setIsOpen = onOpenChange || setInternalOpen;

    const formKey = isOpen ? (initialData?.id || 'new-item') : 'closed-item';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-lg h-11 px-6 rounded-xl font-semibold transition-transform active:scale-95">
                        <Shirt className="h-5 w-5" /> Adicionar Peça
                    </Button>
                )}
            </DialogTrigger>
            
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-zinc-50 dark:bg-zinc-950 border-0 rounded-3xl">
                {isOpen && (
                    <WardrobeFormInner 
                        key={formKey} 
                        mode={mode} 
                        initialData={initialData} 
                        onSuccess={() => setIsOpen(false)}
                        onCancel={() => setIsOpen(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function WardrobeFormInner({ mode, initialData, onSuccess, onCancel }: { mode: string, initialData?: WardrobeItemData, onSuccess: () => void, onCancel: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    
    // States
    const [name, setName] = useState(initialData?.name || "");
    const [category, setCategory] = useState(initialData?.category || "TOP");
    const [brand, setBrand] = useState(initialData?.brand || "");
    const [size, setSize] = useState(initialData?.size || "");
    const [color, setColor] = useState(initialData?.color || "");
    const [price, setPrice] = useState(initialData?.price ? initialData.price.toString() : "");
    // Correção do 'any': Tipando explicitamente o estado
    const [status, setStatus] = useState<"IN_CLOSET" | "LAUNDRY" | "LENT" | "REPAIR" | "DONATED">(initialData?.status || "IN_CLOSET");
    
    const [previewImage, setPreviewImage] = useState(initialData?.imageUrl || ""); 
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error("Máximo 2MB."); return; }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                const maxSize = 400; 
                let width = img.width; let height = img.height;
                if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } 
                else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
                canvas.width = width; canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);
                setPreviewImage(canvas.toDataURL("image/jpeg", 0.85));
                toast.success("Foto carregada!");
            };
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!name.trim()) { toast.error("Nome obrigatório."); return; }

        setIsLoading(true);
        const formData = new FormData();
        formData.append("name", name);
        formData.append("category", category);
        formData.append("brand", brand);
        formData.append("size", size);
        formData.append("color", color);
        formData.append("price", price);
        formData.append("status", status);

        if (previewImage.startsWith("data:")) formData.set('imageUrl', previewImage);
        else if (!previewImage) formData.delete('imageUrl');

        let result;
        if (mode === "edit" && initialData?.id) {
            formData.append("id", initialData.id);
            result = await updateWardrobeItem(formData);
        } else {
            result = await createWardrobeItem(formData);
        }

        if (result.success) {
            toast.success(result.message);
            onSuccess();
        } else {
            toast.error(result.message);
        }
        setIsLoading(false);
    };

    return (
        <>
            <div className="bg-violet-950 p-8 pt-10 text-white relative overflow-hidden text-center shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex flex-col items-center gap-4">
                    <div 
                        className="relative group cursor-pointer bg-white/10 rounded-2xl p-1 border-2 border-white/20 shadow-xl transition-transform hover:scale-105" 
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Avatar className="h-32 w-32 rounded-xl bg-violet-900">
                            <AvatarImage src={previewImage || undefined} className="object-cover" />
                            <AvatarFallback className="bg-violet-900 text-violet-200"><Camera className="h-10 w-10 opacity-50" /></AvatarFallback>
                        </Avatar>
                        {previewImage && <button type="button" onClick={(e) => { e.stopPropagation(); setPreviewImage(""); }} className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600 shadow-md transition-all z-20"><X className="h-3 w-3" /></button>}
                        <div className="absolute inset-0 bg-black/40 rounded-xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                            <UploadCloud className="h-8 w-8 text-white mb-1" /><span className="text-[10px] font-bold uppercase tracking-wider">Foto</span>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-bold">{mode === "create" ? "Nova Peça" : "Editar Peça"}</DialogTitle>
                        <DialogDescription className="text-violet-200/70 mt-1">Adicione ao seu guarda-roupa digital.</DialogDescription>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                
                {/* 1. SELEÇÃO DE CATEGORIA VISUAL */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase">Categoria</Label>
                    <div className="grid grid-cols-4 gap-2">
                        {CATEGORY_OPTIONS.map((cat) => (
                            <div 
                                key={cat.value} 
                                onClick={() => setCategory(cat.value)}
                                className={cn(
                                    "cursor-pointer flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all hover:bg-white dark:hover:bg-zinc-800",
                                    category === cat.value 
                                        ? "border-violet-600 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300" 
                                        : "border-transparent bg-zinc-100 dark:bg-zinc-900 text-zinc-500"
                                )}
                            >
                                <cat.icon className="h-6 w-6 mb-1" />
                                <span className="text-[9px] font-bold uppercase text-center leading-tight">{cat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase">Nome da Peça</Label>
                    <Input 
                        value={name} onChange={(e) => setName(e.target.value)} 
                        placeholder="Ex: Jaqueta Jeans Vintage" 
                        className="h-11 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" required
                    />
                </div>

                {/* 2. DETALHES RICOS */}
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                        <Tag className="h-4 w-4 text-violet-500" />
                        <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Especificações</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-500">Marca</Label>
                            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: Zara" className="bg-zinc-50 dark:bg-zinc-950" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-500 flex items-center gap-1"><Ruler className="h-3 w-3" /> Tamanho</Label>
                            <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="M / 42" className="bg-zinc-50 dark:bg-zinc-950" />
                        </div>
                    </div>

                    {/* Paleta de Cores Rápida */}
                    <div className="space-y-2">
                        <Label className="text-xs text-zinc-500 flex items-center gap-1"><Palette className="h-3 w-3" /> Cor Principal</Label>
                        <div className="flex flex-wrap gap-2">
                            {COLOR_PALETTE.map((c) => (
                                <div 
                                    key={c.hex} 
                                    onClick={() => setColor(c.hex)}
                                    className={cn(
                                        "h-8 w-8 rounded-full border border-zinc-200 cursor-pointer flex items-center justify-center transition-transform hover:scale-110",
                                        color === c.hex ? "ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-black" : ""
                                    )}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.name}
                                >
                                    {color === c.hex && <Check className={cn("h-4 w-4", c.hex === "#FFFFFF" ? "text-black" : "text-white")} />}
                                </div>
                            ))}
                            {/* Input Manual para cores exóticas */}
                            <Input 
                                value={color} 
                                onChange={(e) => setColor(e.target.value)} 
                                placeholder="Outra..." 
                                className="h-8 w-24 text-xs bg-zinc-50 dark:bg-zinc-950"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. STATUS E PREÇO */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1"><DollarSign className="h-3 w-3" /> Preço Pago</Label>
                        <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="h-11 font-mono font-bold text-zinc-700 dark:text-zinc-300" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1"><Layers className="h-3 w-3" /> Onde está?</Label>
                        <Select value={status} onValueChange={(val: "IN_CLOSET" | "LAUNDRY" | "LENT" | "REPAIR" | "DONATED") => setStatus(val)}>
                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="IN_CLOSET">🟢 No Armário</SelectItem>
                                <SelectItem value="LAUNDRY">🔵 Lavando</SelectItem>
                                <SelectItem value="LENT">🟡 Emprestado</SelectItem>
                                <SelectItem value="REPAIR">🔴 Costureira</SelectItem>
                                <SelectItem value="DONATED">⚪ Doado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <Button type="button" variant="ghost" onClick={onCancel} className="h-11">Cancelar</Button>
                    <Button type="submit" disabled={isLoading} className="bg-violet-600 hover:bg-violet-700 text-white h-11 px-8 rounded-xl font-bold w-full sm:w-auto">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (mode === "create" ? "Guardar no Closet" : "Salvar Alterações")}
                    </Button>
                </DialogFooter>
            </form>
        </>
    );
}