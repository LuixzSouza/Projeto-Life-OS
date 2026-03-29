"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Shirt, Tag, Layers, Check, Footprints, Gem,
    Search, Sparkles, UploadCloud, X, Loader2, Link as LinkIcon,
    Palette,
    Plus
} from "lucide-react";
import { toast } from "sonner";
import { createWardrobeItem, updateWardrobeItem } from "@/app/(dashboard)/wardrobe/actions";
import { cn } from "@/lib/utils";

// --- TIPAGEM ESTRITA ---
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

// --- CONSTANTES DE DESIGN ---
const CATEGORY_OPTIONS = [
    { value: "TOP", label: "Cima", icon: Shirt },
    { value: "BOTTOM", label: "Baixo", icon: Layers },
    { value: "SHOES", label: "Calçados", icon: Footprints },
    { value: "ACCESSORY", label: "Acessórios", icon: Gem },
];

const COLOR_PALETTE = [
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

/* ========================================================================= */
/* COMPONENTE PRINCIPAL (Wrapper do Modal)                                   */
/* ========================================================================= */
export function WardrobeFormDialog({ mode = "create", initialData, trigger, open, onOpenChange }: WardrobeFormDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = open !== undefined ? open : internalOpen;
    const setIsOpen = onOpenChange || setInternalOpen;
    const formKey = isOpen ? (initialData?.id || 'new-item') : 'closed-item';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {(trigger || mode === "create") && (
                <DialogTrigger asChild>
                    {trigger || (
                        <Button className="gap-2 shadow-sm font-semibold h-10 px-4 rounded-lg">
                            <Plus className="h-4 w-4" /> Nova Peça
                        </Button>
                    )}
                </DialogTrigger>
            )}
            
            <DialogContent className="max-w-5xl w-[95vw] h-[90vh] md:h-[80vh] p-0 gap-0 bg-background border-border/40 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
                <DialogHeader className="sr-only">
                    <DialogTitle>Editor de Guarda-Roupa</DialogTitle>
                    <DialogDescription>Adicione ou edite peças do seu armário</DialogDescription>
                </DialogHeader>

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

/* ========================================================================= */
/* SUBCOMPONENTE: MIOLO DO FORMULÁRIO (Lógica e UI)                          */
/* ========================================================================= */
function WardrobeFormInner({ mode, initialData, onSuccess, onCancel }: { mode: string, initialData?: WardrobeItemData, onSuccess: () => void, onCancel: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    
    // States do Formulário
    const [name, setName] = useState(initialData?.name || "");
    const [category, setCategory] = useState(initialData?.category || "TOP");
    const [brand, setBrand] = useState(initialData?.brand || "");
    const [size, setSize] = useState(initialData?.size || "");
    const [color, setColor] = useState(initialData?.color || "#18181b"); // Preto padrão
    const [price, setPrice] = useState(initialData?.price ? initialData.price.toString() : "");
    const [status, setStatus] = useState<WardrobeStatus>(initialData?.status || "IN_CLOSET");
    
    // Image States
    const [previewImage, setPreviewImage] = useState(initialData?.imageUrl || ""); 
    const [searchQuery, setSearchQuery] = useState("");
    const [imageUrlInput, setImageUrlInput] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);

    // Ícone dinâmico baseado na categoria selecionada
    const SelectedCategoryIcon = CATEGORY_OPTIONS.find(c => c.value === category)?.icon || Shirt;

    // --- HANDLERS DE IMAGEM ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 5MB."); return; }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image(); 
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                
                // Redimensiona para max 800px para economizar banco de dados
                const maxSize = 800; 
                let width = img.width; let height = img.height;
                if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } 
                else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
                
                canvas.width = width; canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                setPreviewImage(canvas.toDataURL("image/jpeg", 0.8));
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
            results = [
                { name: "Camiseta Básica", img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80", cat: "TOP", brand: "Básico" },
                { name: "Calça Jeans", img: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80", cat: "BOTTOM", brand: "Jeans" }
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
        toast.success("Imagem e dados aplicados!");
    };

    // --- SUBMIT ---
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!name.trim()) { toast.error("O nome da peça é obrigatório."); return; }

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
        else formData.delete('imageUrl'); // Garante que mande vazio se for usar só cor

        try {
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
        } catch (error) {
            toast.error("Erro inesperado ao salvar a peça.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* ========================================================= */}
            {/* LADO ESQUERDO: PREVIEW VISUAL (Dinâmico)                    */}
            {/* ========================================================= */}
            <div className="w-full md:w-2/5 bg-muted/20 border-b md:border-b-0 md:border-r border-border/40 flex flex-col relative h-64 md:h-full shrink-0">
                
                {/* Abas Superiores Flutuantes (Fontes de Imagem) */}
                <div className="absolute top-4 left-4 right-4 z-20">
                    <Tabs defaultValue="upload" className="w-full">
                        <TabsList className="w-full grid grid-cols-3 bg-background/80 backdrop-blur-xl shadow-sm border border-border/50 rounded-xl h-10">
                            <TabsTrigger value="upload" className="text-[11px] font-semibold rounded-lg">Upload</TabsTrigger>
                            <TabsTrigger value="web" className="text-[11px] font-semibold rounded-lg">Buscar Web</TabsTrigger>
                            <TabsTrigger value="url" className="text-[11px] font-semibold rounded-lg">Link URL</TabsTrigger>
                        </TabsList>

                        <TabsContent value="upload" className="mt-0 hidden" /> 
                        
                        <TabsContent value="web" className="mt-2 bg-background/95 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-border/50 animate-in slide-in-from-top-2">
                            <div className="flex gap-2 mb-3">
                                <Input 
                                    placeholder="Ex: Nike, Vestido..." 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="h-10 text-sm bg-muted/30 rounded-xl"
                                />
                                <Button onClick={handleSearch} className="h-10 w-10 p-0 rounded-xl shadow-sm"><Search className="h-4 w-4" /></Button>
                            </div>
                            <ScrollArea className="h-56">
                                <div className="grid grid-cols-2 gap-2 pr-3">
                                    {searchResults.map((item, idx) => (
                                        <div key={idx} onClick={() => selectSearchResult(item)} className="aspect-[4/5] relative rounded-xl overflow-hidden cursor-pointer border border-transparent hover:border-primary transition-all">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                    {searchResults.length === 0 && <p className="col-span-2 text-center text-xs text-muted-foreground py-10">Busque para ver exemplos</p>}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="url" className="mt-2 bg-background/95 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-border/50 animate-in slide-in-from-top-2">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="https://..." value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} className="h-10 text-sm pl-9 bg-muted/30 rounded-xl" />
                                </div>
                                <Button onClick={() => setPreviewImage(imageUrlInput)} className="h-10 rounded-xl">Aplicar</Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Área de Visualização Principal (Imagem ou Cor Mágica) */}
                <div className="flex-1 flex items-center justify-center relative group overflow-hidden">
                    {previewImage ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewImage} alt="Preview" className="w-full h-full object-cover md:object-contain p-0 md:p-8 transition-transform duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                <Button 
                                    variant="destructive" 
                                    className="rounded-xl shadow-2xl font-bold gap-2"
                                    onClick={() => setPreviewImage("")}
                                >
                                    <X className="h-4 w-4" /> Remover Foto
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div 
                            className="absolute inset-0 flex flex-col items-center justify-center p-8 cursor-pointer transition-all duration-500 opacity-90 hover:opacity-100"
                            style={{ backgroundColor: color || '#f4f4f5' }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {/* Ícone Dinâmico misturado com a cor de fundo */}
                            <SelectedCategoryIcon className="h-32 w-32 md:h-48 md:w-48 text-white mix-blend-overlay drop-shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" />
                            
                            <div className="absolute bottom-8 bg-background/30 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                                <UploadCloud className="h-4 w-4" /> Clicar para Upload
                            </div>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
            </div>

            {/* ========================================================= */}
            {/* LADO DIREITO: FORMULÁRIO DE DADOS                           */}
            {/* ========================================================= */}
            <div className="w-full md:w-3/5 bg-background flex flex-col h-full">
                <ScrollArea className="flex-1">
                    <div className="p-6 md:p-10 space-y-8">
                        
                        {/* Header do Form */}
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                {mode === "create" ? "Detalhes da Peça" : "Editar Peça"}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">Preencha o básico para catalogar no seu acervo.</p>
                        </div>

                        <form id="wardrobe-form" onSubmit={handleSubmit} className="space-y-6">
                            
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground">O que é isso? (Nome) <span className="text-rose-500">*</span></Label>
                                <Input 
                                    value={name} onChange={(e) => setName(e.target.value)} 
                                    placeholder="Ex: Jaqueta Jeans Vintage, Camiseta Preta..." 
                                    className="h-12 bg-muted/20 border-border/50 rounded-xl text-base"
                                    required
                                />
                            </div>
                            
                            <div className="space-y-3">
                                <Label className="text-xs font-semibold text-muted-foreground">Categoria</Label>
                                <div className="grid grid-cols-4 gap-2 md:gap-3">
                                    {CATEGORY_OPTIONS.map((cat) => (
                                        <button 
                                            type="button"
                                            key={cat.value} 
                                            onClick={() => setCategory(cat.value)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200",
                                                category === cat.value 
                                                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20 shadow-sm" 
                                                    : "border-border/60 bg-card text-muted-foreground hover:bg-muted hover:border-border"
                                            )}
                                        >
                                            <cat.icon className="h-5 w-5 mb-1.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 🟢 SELETOR DE CORES OTIMIZADO */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold text-muted-foreground">Cor Predominante</Label>
                                    {!previewImage && <span className="text-[10px] font-medium text-primary/80 flex items-center gap-1"><Sparkles className="h-3 w-3"/> Usado como capa</span>}
                                </div>
                                <div className="flex flex-wrap gap-2 items-center bg-muted/20 p-2 rounded-2xl border border-border/40">
                                    {COLOR_PALETTE.map((c) => (
                                        <button 
                                            type="button"
                                            key={c.hex} 
                                            onClick={() => setColor(c.hex)}
                                            className={cn(
                                                "h-8 w-8 md:h-9 md:w-9 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-sm border",
                                                c.class,
                                                color === c.hex ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "opacity-80 hover:opacity-100"
                                            )}
                                            title={c.name}
                                        >
                                            {color === c.hex && <Check className={cn("h-4 w-4", c.hex === "#ffffff" || c.hex === "#f5f5dc" ? "text-black" : "text-white")} />}
                                        </button>
                                    ))}
                                    
                                    {/* Input Nativo Customizado para outras cores */}
                                    <div className="ml-2 relative h-9 w-9 rounded-full overflow-hidden border border-border shadow-sm flex items-center justify-center bg-background hover:scale-110 transition-transform cursor-pointer group" title="Cor Customizada">
                                        <Palette className="h-4 w-4 text-muted-foreground group-hover:text-foreground z-10 pointer-events-none absolute" />
                                        <input 
                                            type="color" 
                                            ref={colorInputRef}
                                            value={color || "#000000"} 
                                            onChange={(e) => setColor(e.target.value)}
                                            className="absolute inset-[-10px] w-16 h-16 cursor-pointer opacity-0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground">Marca</Label>
                                    <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: Zara, Nike..." className="h-10 bg-muted/20 rounded-lg" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground">Tamanho</Label>
                                    <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="P, M, 42..." className="h-10 bg-muted/20 rounded-lg" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground">Preço Pago (R$)</Label>
                                    <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="h-10 bg-muted/20 rounded-lg" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground">Status Atual</Label>
                                    <Select value={status} onValueChange={(val) => setStatus(val as WardrobeStatus)}>
                                        <SelectTrigger className="h-10 bg-muted/20 rounded-lg border-border/50"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="IN_CLOSET"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"/>Disponível</span></SelectItem>
                                            <SelectItem value="LAUNDRY"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"/>Lavando</span></SelectItem>
                                            <SelectItem value="LENT"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"/>Emprestado</span></SelectItem>
                                            <SelectItem value="REPAIR"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500"/>Conserto</span></SelectItem>
                                            <SelectItem value="DONATED"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-zinc-400"/>Doado</span></SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                        </form>
                    </div>
                </ScrollArea>

                {/* Footer Fixo */}
                <div className="p-4 md:p-6 border-t border-border/40 bg-muted/5 flex justify-end gap-3 shrink-0">
                    <Button type="button" variant="ghost" onClick={onCancel} className="rounded-xl">Cancelar</Button>
                    <Button form="wardrobe-form" type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px] h-10 rounded-xl font-semibold shadow-sm">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {mode === 'create' ? "Salvar Peça" : "Salvar Edição"}
                    </Button>
                </div>
            </div>
        </>
    );
}