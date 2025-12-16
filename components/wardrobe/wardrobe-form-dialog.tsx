"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Shirt, Tag, Layers, Check, Footprints, Watch,
    Search, Image as ImageIcon, Sparkles, UploadCloud, X, Loader2, Link as LinkIcon
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

// --- CONSTANTES ---
const CATEGORY_OPTIONS = [
    { value: "TOP", label: "Parte de Cima", icon: Shirt },
    { value: "BOTTOM", label: "Parte de Baixo", icon: Layers },
    { value: "SHOES", label: "Calçados", icon: Footprints },
    { value: "ACCESSORY", label: "Acessórios", icon: Watch },
];

const COLOR_PALETTE = [
    { name: "Preto", hex: "#000000", class: "bg-black border-border" },
    { name: "Branco", hex: "#FFFFFF", class: "bg-white border-border" },
    { name: "Cinza", hex: "#808080", class: "bg-gray-500 border-transparent" },
    { name: "Azul", hex: "#2563eb", class: "bg-blue-600 border-transparent" },
    { name: "Vermelho", hex: "#dc2626", class: "bg-red-600 border-transparent" },
    { name: "Verde", hex: "#16a34a", class: "bg-green-600 border-transparent" },
    { name: "Beige", hex: "#F5F5DC", class: "bg-[#F5F5DC] border-yellow-200" },
    { name: "Roxo", hex: "#7c3aed", class: "bg-violet-600 border-transparent" },
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

// --- COMPONENTE PRINCIPAL ---
export function WardrobeFormDialog({ mode = "create", initialData, trigger, open, onOpenChange }: WardrobeFormDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = open !== undefined ? open : internalOpen;
    const setIsOpen = onOpenChange || setInternalOpen;
    const formKey = isOpen ? (initialData?.id || 'new-item') : 'closed-item';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            
            {/* ✅ CORREÇÃO: Condição para renderizar o gatilho.
                Só mostra o botão padrão se NÃO tiver trigger customizado E estiver no modo 'create'.
            */}
            {(trigger || mode === "create") && (
                <DialogTrigger asChild>
                    {trigger || (
                        <Button className="gap-2 shadow-lg shadow-primary/20 font-semibold transition-all active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground" size="lg">
                            <Shirt className="h-4 w-4" /> Adicionar Peça
                        </Button>
                    )}
                </DialogTrigger>
            )}
            
            <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 bg-background border-border/50 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
                {/* Header acessível oculto */}
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

// --- SUBCOMPONENTE LÓGICO ---
function WardrobeFormInner({ mode, initialData, onSuccess, onCancel }: { mode: string, initialData?: WardrobeItemData, onSuccess: () => void, onCancel: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    
    // States
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

    // Handlers
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
            <div className="w-full md:w-1/2 bg-muted/20 border-b md:border-b-0 md:border-r border-border/60 flex flex-col relative h-full">
                
                {/* Abas de Origem da Imagem */}
                <div className="absolute top-6 left-6 right-6 z-10">
                    <Tabs defaultValue="upload" className="w-full">
                        <TabsList className="w-full grid grid-cols-3 bg-background/80 backdrop-blur-md shadow-sm border border-border/50">
                            <TabsTrigger value="upload" className="text-xs font-medium">Upload</TabsTrigger>
                            <TabsTrigger value="web" className="text-xs font-medium">Buscar Web</TabsTrigger>
                            <TabsTrigger value="url" className="text-xs font-medium">Link URL</TabsTrigger>
                        </TabsList>

                        <TabsContent value="upload" className="mt-0 hidden" /> 
                        
                        <TabsContent value="web" className="mt-3 bg-background/95 backdrop-blur-xl p-4 rounded-xl shadow-xl border border-border animate-in slide-in-from-top-2">
                            <div className="flex gap-2 mb-3">
                                <Input 
                                    placeholder="Ex: Nike, Vestido..." 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="h-9 text-sm bg-muted/30"
                                />
                                <Button size="sm" onClick={handleSearch} className="h-9 w-9 p-0 bg-primary hover:bg-primary/90"><Search className="h-4 w-4" /></Button>
                            </div>
                            <ScrollArea className="h-56">
                                <div className="grid grid-cols-3 gap-2 pr-3">
                                    {searchResults.map((item, idx) => (
                                        <div key={idx} onClick={() => selectSearchResult(item)} className="aspect-square relative rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                    {searchResults.length === 0 && <p className="col-span-3 text-center text-xs text-muted-foreground py-8">Digite para buscar referências</p>}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="url" className="mt-3 bg-background/95 backdrop-blur-xl p-4 rounded-xl shadow-xl border border-border animate-in slide-in-from-top-2">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="https://..." value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} className="h-9 text-sm pl-9 bg-muted/30" />
                                </div>
                                <Button size="sm" onClick={() => setPreviewImage(imageUrlInput)} className="h-9">Ok</Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Área Principal de Imagem */}
                <div className="flex-1 flex items-center justify-center relative group bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat opacity-90">
                    {previewImage ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewImage} alt="Preview" className="w-full h-full object-contain p-8 md:p-12 transition-transform duration-500 group-hover:scale-105" />
                            <Button 
                                variant="destructive" 
                                size="icon" 
                                className="absolute bottom-8 right-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                                onClick={() => setPreviewImage("")}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <div 
                            className="flex flex-col items-center justify-center p-12 cursor-pointer transition-all hover:scale-105 opacity-60 hover:opacity-100"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-24 h-24 bg-background border-2 border-dashed border-border rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:border-primary/50 group-hover:bg-primary/5 transition-colors">
                                <UploadCloud className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
                            </div>
                            <h3 className="font-semibold text-foreground">Adicionar Foto</h3>
                            <p className="text-xs text-muted-foreground mt-1">Upload ou arraste aqui</p>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
            </div>

            {/* --- LADO DIREITO: DADOS DO ITEM (50%) --- */}
            <div className="w-full md:w-1/2 bg-background flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
                    
                    {/* Header do Form */}
                    <div className="flex items-center justify-between pb-6 border-b border-border/40">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                {mode === "create" ? "Nova Peça" : "Editar Detalhes"}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">Adicione informações para catalogar seu item.</p>
                        </div>
                        <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary ring-1 ring-primary/20">
                            <Tag className="h-6 w-6" />
                        </div>
                    </div>

                    <form id="wardrobe-form" onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* 1. Nome & Categorias */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nome do Item</Label>
                                <Input 
                                    value={name} onChange={(e) => setName(e.target.value)} 
                                    placeholder="Ex: Jaqueta Jeans Vintage" 
                                    className="h-12 text-lg bg-muted/20 border-border/50 focus:bg-background transition-colors"
                                    required
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Categoria</Label>
                                <div className="grid grid-cols-4 gap-3">
                                    {CATEGORY_OPTIONS.map((cat) => (
                                        <div 
                                            key={cat.value} 
                                            onClick={() => setCategory(cat.value)}
                                            className={cn(
                                                "cursor-pointer flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200",
                                                category === cat.value 
                                                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20" 
                                                    : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:border-border/80"
                                            )}
                                        >
                                            <cat.icon className="h-5 w-5 mb-1.5" />
                                            <span className="text-[9px] font-bold uppercase">{cat.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 2. Detalhes Específicos */}
                        <div className="space-y-4 pt-2">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                                <Sparkles className="h-4 w-4 text-primary" /> Detalhes Técnicos
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Marca</Label>
                                    <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: Zara" className="bg-muted/20" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Tamanho</Label>
                                    <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="M / 42" className="bg-muted/20" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Preço (R$)</Label>
                                    <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="bg-muted/20" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Estado Atual</Label>
                                    <Select value={status} onValueChange={(val) => setStatus(val as WardrobeStatus)}>
                                        <SelectTrigger className="bg-muted/20 border-border/50"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="IN_CLOSET"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"/>Disponível</span></SelectItem>
                                            <SelectItem value="LAUNDRY"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"/>Lavando</span></SelectItem>
                                            <SelectItem value="LENT"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"/>Emprestado</span></SelectItem>
                                            <SelectItem value="REPAIR"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"/>Conserto</span></SelectItem>
                                            <SelectItem value="DONATED"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-zinc-400"/>Doado</span></SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* 3. Cor */}
                        <div className="space-y-3 pt-2">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cor Principal</Label>
                            <div className="flex flex-wrap gap-3 items-center">
                                {COLOR_PALETTE.map((c) => (
                                    <div 
                                        key={c.hex} 
                                        onClick={() => setColor(c.hex)}
                                        className={cn(
                                            "h-9 w-9 rounded-full cursor-pointer flex items-center justify-center transition-all hover:scale-110 shadow-sm border",
                                            c.class,
                                            color === c.hex ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "opacity-80 hover:opacity-100"
                                        )}
                                        title={c.name}
                                    >
                                        {color === c.hex && <Check className={cn("h-4 w-4", c.hex === "#FFFFFF" ? "text-black" : "text-white")} />}
                                    </div>
                                ))}
                                <div className="flex-1 min-w-[100px] ml-2">
                                    <Input 
                                        value={color} 
                                        onChange={(e) => setColor(e.target.value)} 
                                        placeholder="#HEX..." 
                                        className="h-9 text-xs font-mono bg-muted/20 uppercase"
                                    />
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer Fixo */}
                <div className="p-6 border-t border-border/40 bg-muted/10 flex justify-between items-center shrink-0 backdrop-blur-sm">
                    <Button type="button" variant="ghost" onClick={onCancel} className="hover:bg-muted">Cancelar</Button>
                    <Button form="wardrobe-form" type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[160px] h-11 rounded-xl font-semibold shadow-lg shadow-primary/20">
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (mode === 'create' ? "Salvar no Closet" : "Salvar Alterações")}
                    </Button>
                </div>
            </div>
        </>
    );
}