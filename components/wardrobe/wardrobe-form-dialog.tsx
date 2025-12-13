"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Shirt, Tag, DollarSign, Ruler, UploadCloud, 
    Camera, X, Loader2, Layers, Check, Footprints, Watch,
    Palette, Link as LinkIcon, Search, Globe, Image as ImageIcon, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { createWardrobeItem, updateWardrobeItem } from "@/app/(dashboard)/wardrobe/actions";
import { cn } from "@/lib/utils";

// --- TIPAGEM ESTRITA ---
type WardrobeStatus = "IN_CLOSET" | "LAUNDRY" | "LENT" | "REPAIR" | "DONATED";

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

type SearchResultItem = {
    name: string;
    img: string;
    cat: string;
    brand: string;
};

interface WardrobeFormDialogProps {
    mode?: "create" | "edit";
    initialData?: WardrobeItemData;
    trigger?: React.ReactNode; 
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

// Opções de Configuração
const CATEGORY_OPTIONS = [
    { value: "TOP", label: "Parte de Cima", icon: Shirt },
    { value: "BOTTOM", label: "Parte de Baixo", icon: Layers },
    { value: "SHOES", label: "Calçados", icon: Footprints },
    { value: "ACCESSORY", label: "Acessórios", icon: Watch },
];

const COLOR_PALETTE = [
    { name: "Preto", hex: "#000000", border: "border-zinc-500" },
    { name: "Branco", hex: "#FFFFFF", border: "border-zinc-300" },
    { name: "Cinza", hex: "#808080", border: "border-zinc-500" },
    { name: "Azul", hex: "#2563eb", border: "border-blue-600" },
    { name: "Vermelho", hex: "#dc2626", border: "border-red-600" },
    { name: "Verde", hex: "#16a34a", border: "border-green-600" },
    { name: "Beige", hex: "#F5F5DC", border: "border-yellow-200" },
    { name: "Roxo", hex: "#7c3aed", border: "border-violet-600" },
];

const MOCK_CLOTHING_API: { term: string; items: SearchResultItem[] }[] = [
    { term: "nike", items: [
        { name: "Nike Air Force 1", img: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80", cat: "SHOES", brand: "Nike" },
        { name: "Nike Hoodie", img: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&q=80", cat: "TOP", brand: "Nike" }
    ]},
    { term: "camisa", items: [
        { name: "Camisa Social Branca", img: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500&q=80", cat: "TOP", brand: "Generic" },
        { name: "Camisa Xadrez", img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&q=80", cat: "TOP", brand: "H&M" }
    ]},
    { term: "vestido", items: [
        { name: "Vestido de Verão", img: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&q=80", cat: "TOP", brand: "Zara" },
        { name: "Vestido Preto", img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80", cat: "TOP", brand: "Gucci" }
    ]}
];

export function WardrobeFormDialog({ mode = "create", initialData, trigger, open, onOpenChange }: WardrobeFormDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = open !== undefined ? open : internalOpen;
    const setIsOpen = onOpenChange || setInternalOpen;
    const formKey = isOpen ? (initialData?.id || 'new-item') : 'closed-item';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-lg h-10 px-6 rounded-lg font-medium transition-all">
                        <Shirt className="h-4 w-4" /> Adicionar Peça
                    </Button>
                )}
            </DialogTrigger>
            
            {/* MODAL GIGANTE (ESTÚDIO) */}
            <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
                <DialogTitle className="sr-only">Editor de Guarda-Roupa</DialogTitle>
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
    
    // Form States
    const [name, setName] = useState(initialData?.name || "");
    const [category, setCategory] = useState(initialData?.category || "TOP");
    const [brand, setBrand] = useState(initialData?.brand || "");
    const [size, setSize] = useState(initialData?.size || "");
    const [color, setColor] = useState(initialData?.color || "");
    const [price, setPrice] = useState(initialData?.price ? initialData.price.toString() : "");
    const [status, setStatus] = useState<WardrobeStatus>(initialData?.status || "IN_CLOSET");
    
    // Image States
    const [previewImage, setPreviewImage] = useState(initialData?.imageUrl || ""); 
    const [searchQuery, setSearchQuery] = useState("");
    const [imageUrlInput, setImageUrlInput] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Image Handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 4 * 1024 * 1024) { toast.error("Máximo 4MB."); return; }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image(); 
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                
                // Compressão
                const maxSize = 1000; 
                let width = img.width; let height = img.height;
                if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } 
                else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
                
                canvas.width = width; canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                setPreviewImage(canvas.toDataURL("image/jpeg", 0.85));
            };
        };
        reader.readAsDataURL(file);
    };

    const handleSearch = () => {
        if (!searchQuery) return;
        const term = searchQuery.toLowerCase();
        let results: SearchResultItem[] = [];
        MOCK_CLOTHING_API.forEach(mock => {
            if (term.includes(mock.term) || mock.term.includes(term)) results = [...results, ...mock.items];
        });
        
        if (results.length === 0) {
            // Fallback genérico para demo
            results = [
                { name: "Item Genérico", img: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=500&q=80", cat: "TOP", brand: "Generic" },
                { name: "Peça Exemplo", img: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&q=80", cat: "BOTTOM", brand: "Example" }
            ];
            toast.info("Mostrando exemplos genéricos.");
        }
        setSearchResults(results);
    };

    const selectSearchResult = (item: SearchResultItem) => {
        setPreviewImage(item.img);
        if (!name) setName(item.name);
        if (!brand) setBrand(item.brand);
        setCategory(item.cat);
        toast.success("Imagem aplicada!");
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
        if (previewImage) formData.set('imageUrl', previewImage);
        else formData.delete('imageUrl');

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
            {/* --- LADO ESQUERDO: STUDIO VISUAL (50%) --- */}
            <div className="w-full md:w-1/2 bg-zinc-100 dark:bg-zinc-900 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 flex flex-col relative h-full">
                
                {/* Abas de Origem da Imagem (Flutuante no topo) */}
                <div className="absolute top-4 left-4 right-4 z-10">
                    <Tabs defaultValue="upload" className="w-full">
                        <TabsList className="w-full grid grid-cols-3 bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-sm border border-zinc-200 dark:border-zinc-800">
                            <TabsTrigger value="upload" className="text-xs">Upload</TabsTrigger>
                            <TabsTrigger value="web" className="text-xs">Buscar Web</TabsTrigger>
                            <TabsTrigger value="url" className="text-xs">Link URL</TabsTrigger>
                        </TabsList>

                        <TabsContent value="upload" className="mt-0 hidden" /> {/* Hidden content, handled below */}
                        
                        {/* Conteúdo da Busca Web (Sobreposto) */}
                        <TabsContent value="web" className="mt-2 bg-white dark:bg-zinc-950 p-3 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-2">
                            <div className="flex gap-2 mb-3">
                                <Input 
                                    placeholder="Ex: Nike, Vestido..." 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="h-9 text-sm"
                                />
                                <Button size="sm" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
                            </div>
                            <ScrollArea className="h-48">
                                <div className="grid grid-cols-3 gap-2">
                                    {searchResults.map((item, idx) => (
                                        <div key={idx} onClick={() => selectSearchResult(item)} className="aspect-square relative rounded-md overflow-hidden cursor-pointer hover:ring-2 ring-violet-500">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                    {searchResults.length === 0 && <p className="col-span-3 text-center text-xs text-zinc-400 py-4">Digite para buscar</p>}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="url" className="mt-2 bg-white dark:bg-zinc-950 p-3 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-2">
                            <div className="flex gap-2">
                                <Input placeholder="https://..." value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} className="h-9 text-sm" />
                                <Button size="sm" onClick={() => setPreviewImage(imageUrlInput)}>Ok</Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Área Principal de Imagem */}
                <div className="flex-1 flex items-center justify-center bg-zinc-200 dark:bg-black/50 relative group">
                    {previewImage ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewImage} alt="Preview" className="w-full h-full object-contain p-8 md:p-12" />
                            <Button 
                                variant="destructive" 
                                size="icon" 
                                className="absolute bottom-6 right-6 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setPreviewImage("")}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <div 
                            className="text-center p-10 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-24 h-24 bg-zinc-300 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ImageIcon className="h-10 w-10 text-zinc-500" />
                            </div>
                            <h3 className="font-semibold text-zinc-600 dark:text-zinc-400">Nenhuma imagem</h3>
                            <p className="text-xs text-zinc-500 mt-1">Clique para fazer upload</p>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
            </div>

            {/* --- LADO DIREITO: DADOS DO ITEM (50%) --- */}
            <div className="w-full md:w-1/2 bg-white dark:bg-zinc-950 flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
                    
                    {/* Header do Form */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                                {mode === "create" ? "Nova Peça" : "Editar Detalhes"}
                            </h2>
                            <p className="text-sm text-zinc-500">Adicione informações para catalogar.</p>
                        </div>
                        <div className="h-10 w-10 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center text-violet-600 dark:text-violet-400">
                            <Tag className="h-5 w-5" />
                        </div>
                    </div>

                    <form id="wardrobe-form" onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* 1. Nome & Status */}
                        <div className="grid gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-500 uppercase">Nome do Item</Label>
                                <Input 
                                    value={name} onChange={(e) => setName(e.target.value)} 
                                    placeholder="Ex: Jaqueta Jeans Vintage" 
                                    className="h-12 text-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                                    required
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-500 uppercase">Categoria</Label>
                                <div className="grid grid-cols-4 gap-3">
                                    {CATEGORY_OPTIONS.map((cat) => (
                                        <div 
                                            key={cat.value} 
                                            onClick={() => setCategory(cat.value)}
                                            className={cn(
                                                "cursor-pointer flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900",
                                                category === cat.value 
                                                    ? "border-violet-600 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300" 
                                                    : "border-zinc-100 dark:border-zinc-800 text-zinc-400"
                                            )}
                                        >
                                            <cat.icon className="h-6 w-6 mb-1" />
                                            <span className="text-[10px] font-bold uppercase">{cat.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 2. Detalhes Específicos */}
                        <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                                <Sparkles className="h-4 w-4 text-amber-500" /> Detalhes
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-500">Marca</Label>
                                    <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: Zara" className="bg-zinc-50 dark:bg-zinc-900" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-500">Tamanho</Label>
                                    <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="M / 42" className="bg-zinc-50 dark:bg-zinc-900" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-500">Preço (R$)</Label>
                                    <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="bg-zinc-50 dark:bg-zinc-900" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-500">Estado Atual</Label>
                                    <Select value={status} onValueChange={(val) => setStatus(val as WardrobeStatus)}>
                                        <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="IN_CLOSET">🟢 Disponível</SelectItem>
                                            <SelectItem value="LAUNDRY">🔵 Lavando</SelectItem>
                                            <SelectItem value="LENT">🟡 Emprestado</SelectItem>
                                            <SelectItem value="REPAIR">🔴 Conserto</SelectItem>
                                            <SelectItem value="DONATED">⚪ Doado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* 3. Cor */}
                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Cor Principal</Label>
                            <div className="flex flex-wrap gap-3">
                                {COLOR_PALETTE.map((c) => (
                                    <div 
                                        key={c.hex} 
                                        onClick={() => setColor(c.hex)}
                                        className={cn(
                                            "h-8 w-8 rounded-full cursor-pointer flex items-center justify-center transition-all hover:scale-110 shadow-sm border",
                                            c.border,
                                            color === c.hex ? "ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-zinc-950 scale-110" : ""
                                        )}
                                        style={{ backgroundColor: c.hex }}
                                        title={c.name}
                                    >
                                        {color === c.hex && <Check className={cn("h-4 w-4", c.hex === "#FFFFFF" ? "text-black" : "text-white")} />}
                                    </div>
                                ))}
                                <div className="flex-1 min-w-[100px]">
                                    <Input 
                                        value={color} 
                                        onChange={(e) => setColor(e.target.value)} 
                                        placeholder="Código Hex..." 
                                        className="h-8 text-xs bg-zinc-50 dark:bg-zinc-900"
                                    />
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer Fixo */}
                <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-between items-center shrink-0">
                    <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
                    <Button form="wardrobe-form" type="submit" disabled={isLoading} className="bg-violet-600 hover:bg-violet-700 text-white min-w-[140px] h-11 rounded-xl font-semibold shadow-lg shadow-violet-500/20">
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar no Closet"}
                    </Button>
                </div>
            </div>
        </>
    );
}