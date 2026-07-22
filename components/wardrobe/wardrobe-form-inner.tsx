"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Sparkles, Loader2, Palette } from "lucide-react";
import { toast } from "sonner";
import { createWardrobeItem, updateWardrobeItem } from "@/app/(dashboard)/wardrobe/actions";
import { cn } from "@/lib/utils";
import {
    CATEGORY_OPTIONS, COLOR_PALETTE,
    type WardrobeItemData, type WardrobeStatus,
} from "./wardrobe-form-constants";
import { WardrobeImagePicker } from "./wardrobe-image-picker";

export function WardrobeFormInner({ mode, initialData, onSuccess, onCancel }: { mode: string, initialData?: WardrobeItemData, onSuccess: () => void, onCancel: () => void }) {
    const [isLoading, setIsLoading] = useState(false);

    // States do Formulário
    const [name, setName] = useState(initialData?.name || "");
    const [category, setCategory] = useState(initialData?.category || "TOP");
    const [brand, setBrand] = useState(initialData?.brand || "");
    const [size, setSize] = useState(initialData?.size || "");
    const [color, setColor] = useState(initialData?.color || "#18181b"); // Preto padrão
    const [price, setPrice] = useState(initialData?.price ? initialData.price.toString() : "");
    const [status, setStatus] = useState<WardrobeStatus>(initialData?.status || "IN_CLOSET");

    const [previewImage, setPreviewImage] = useState(initialData?.imageUrl || "");

    const colorInputRef = useRef<HTMLInputElement>(null);

    // Aplica dados vindos da importação por link de loja (foto + nome + marca).
    // Só preenche campos vazios para não sobrescrever o que o usuário já digitou.
    const applyProduct = (data: { img: string; name?: string | null; brand?: string | null }) => {
        if (data.img) setPreviewImage(data.img);
        if (data.name && !name) setName(data.name);
        if (data.brand && !brand) setBrand(data.brand);
        toast.success("Produto importado!");
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
        } catch {
            toast.error("Erro inesperado ao salvar a peça.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* LADO ESQUERDO: PREVIEW VISUAL (Dinâmico) */}
            <WardrobeImagePicker
                previewImage={previewImage}
                color={color}
                category={category}
                onPreviewChange={setPreviewImage}
                onApplyProduct={applyProduct}
            />

            {/* LADO DIREITO: FORMULÁRIO DE DADOS */}
            <div className="w-full md:flex-1 bg-background flex flex-col flex-1 min-h-0">
                <ScrollArea className="flex-1 min-h-0">
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
