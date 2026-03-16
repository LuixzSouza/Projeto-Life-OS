"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { createWishlist, updateWishlist } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { 
    Loader2, 
    Image as ImageIcon, 
    DollarSign, 
    Tag, 
    PiggyBank,
    Flame,
    Scale,
    Snowflake,
    ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface WishlistData {
    id?: string;
    name: string;
    price: number;
    saved: number;
    imageUrl?: string | null;
    productUrl?: string | null;
    priority: string;
}

export function WishlistForm({ item, onClose }: { item?: WishlistData, onClose: () => void }) {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [previewUrl, setPreviewUrl] = useState<string>(item?.imageUrl || "");
    const [price, setPrice] = useState<number>(item?.price ?? 0);
    const [saved, setSaved] = useState<number>(item?.saved ?? 0);
    const [priority, setPriority] = useState<string>(item?.priority || "MEDIUM");

    const priceRef = useRef<HTMLInputElement | null>(null);
    const savedRef = useRef<HTMLInputElement | null>(null);

    // Mantém o cursor no final somente se o input suportar setSelectionRange
    useEffect(() => {
        const el = priceRef.current;
        if (!el) return;

        const t = window.setTimeout(() => {
            try {
                // setSelectionRange não é suportado por inputs type=number — verificamos antes
                if (typeof el.setSelectionRange === "function" && el.type !== "number") {
                    const len = el.value.length;
                    el.setSelectionRange(len, len);
                }
            } catch (err) {
                // silenciosamente ignoramos qualquer erro — não queremos quebrar a UI por aqui
                // eslint-disable-next-line no-console
                console.debug("Não foi possível ajustar cursor do price input:", err);
            }
        }, 0);
        return () => clearTimeout(t);
    }, [price]);

    useEffect(() => {
        const el = savedRef.current;
        if (!el) return;

        const t = window.setTimeout(() => {
            try {
                if (typeof el.setSelectionRange === "function" && el.type !== "number") {
                    const len = el.value.length;
                    el.setSelectionRange(len, len);
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.debug("Não foi possível ajustar cursor do saved input:", err);
            }
        }, 0);
        return () => clearTimeout(t);
    }, [saved]);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        formData.set("priority", priority);

        try {
            if (item) {
                formData.set("id", item.id || "");
                await updateWishlist(formData);
                toast.success("Meta atualizada com sucesso!");
            } else {
                await createWishlist(formData);
                toast.success("Nova meta criada! 🚀");
            }
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar meta.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form action={handleSubmit} className="space-y-6" noValidate>
            {item && <input type="hidden" name="id" value={item.id} />}

            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                {/* COLUNA 1: PREVIEW DA IMAGEM */}
                <div className="w-full md:w-[240px] flex flex-col gap-4 shrink-0 mx-auto">
                    <div className="aspect-square w-full md:max-w-[240px] max-w-[200px] mx-auto rounded-[2rem] border border-border/50 bg-muted/10 flex items-center justify-center overflow-hidden relative group transition-all hover:bg-muted/20 shadow-sm">
                        {previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={() => setPreviewUrl("")} />
                        ) : (
                            <div className="flex flex-col items-center text-muted-foreground/50 gap-3">
                                <ImageIcon className="h-12 w-12 opacity-50" />
                                <span className="text-[10px] uppercase font-black tracking-widest text-center px-4">URL da Imagem</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-2 w-full md:max-w-[240px] max-w-[200px] mx-auto">
                        <div className="relative">
                            <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            <Input 
                                name="imageUrl" 
                                value={previewUrl} 
                                onChange={(e) => setPreviewUrl(e.target.value)} 
                                placeholder="Cole o link da foto..." 
                                className="h-12 pl-10 text-sm bg-muted/20 border-border/50 rounded-xl focus-visible:ring-primary/30 font-medium"
                                autoComplete="off"
                            />
                        </div>
                    </div>
                </div>

                {/* COLUNA 2: DADOS DO PRODUTO */}
                <div className="flex-1 space-y-5 min-w-0">
                    {/* Nome */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">O que você deseja conquistar? *</Label>
                        <div className="relative">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            <Input 
                                name="name" 
                                defaultValue={item?.name} 
                                placeholder="Ex: MacBook Pro M3, Viagem para Paris..." 
                                required 
                                autoFocus={!item}
                                className="pl-11 h-12 rounded-xl bg-muted/20 font-bold text-base border-border/50 focus-visible:ring-primary/30" 
                            />
                        </div>
                    </div>

                    {/* Valores */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Valor Total (R$) *</Label>
                            <div className="relative group">
                                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                                <Input 
                                    ref={priceRef}
                                    name="price" 
                                    type="number" 
                                    step="0.01" 
                                    value={price || ""} 
                                    onChange={(e) => setPrice(Number(e.target.value))} 
                                    required 
                                    className="h-12 pl-10 font-mono text-lg font-bold bg-muted/20 border-border/50 rounded-xl focus-visible:ring-primary/30"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Já Guardado (R$)</Label>
                            <div className="relative group">
                                <PiggyBank className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500/50 group-focus-within:text-emerald-500 transition-colors" />
                                <Input 
                                    ref={savedRef}
                                    name="saved" 
                                    type="number" 
                                    step="0.01" 
                                    value={saved || ""} 
                                    onChange={(e) => setSaved(Number(e.target.value))} 
                                    className="h-12 pl-10 font-mono text-lg font-bold text-emerald-600 bg-emerald-500/5 border-emerald-500/20 rounded-xl focus-visible:ring-emerald-500/30"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Prioridade */}
                    <div className="space-y-2 pt-1">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Qual o grau de urgência?</Label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setPriority("HIGH")}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 h-14 rounded-xl border text-xs font-bold transition-all active:scale-95",
                                    priority === "HIGH" ? "bg-rose-500/10 border-rose-500/30 text-rose-600 shadow-sm" : "bg-muted/10 border-border/50 text-muted-foreground hover:bg-muted/30"
                                )}
                            >
                                <Flame className={cn("h-4 w-4", priority === "HIGH" && "fill-rose-600/20")} /> Alta
                            </button>
                            <button
                                type="button"
                                onClick={() => setPriority("MEDIUM")}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 h-14 rounded-xl border text-xs font-bold transition-all active:scale-95",
                                    priority === "MEDIUM" ? "bg-amber-500/10 border-amber-500/30 text-amber-600 shadow-sm" : "bg-muted/10 border-border/50 text-muted-foreground hover:bg-muted/30"
                                )}
                            >
                                <Scale className="h-4 w-4" /> Média
                            </button>
                            <button
                                type="button"
                                onClick={() => setPriority("LOW")}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 h-14 rounded-xl border text-xs font-bold transition-all active:scale-95",
                                    priority === "LOW" ? "bg-blue-500/10 border-blue-500/30 text-blue-600 shadow-sm" : "bg-muted/10 border-border/50 text-muted-foreground hover:bg-muted/30"
                                )}
                            >
                                <Snowflake className="h-4 w-4" /> Baixa
                            </button>
                        </div>
                    </div>

                    {/* Link da Loja */}
                    <div className="space-y-2 pt-1">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Link da Loja (Opcional)</Label>
                        <div className="relative">
                            <ArrowUpRight className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            <Input 
                                name="productUrl" 
                                defaultValue={item?.productUrl || ""} 
                                placeholder="https://mercadolivre.com.br/..." 
                                className="h-12 pl-10 text-sm font-medium bg-muted/20 border-border/50 rounded-xl focus-visible:ring-primary/30" 
                                autoComplete="off"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <DialogFooter className="border-t border-border/40 pt-6 mt-4">
                <div className="flex w-full justify-between sm:justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading} className="h-12 px-6 rounded-xl font-bold">
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading} className="h-12 px-8 rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90 shadow-lg shadow-foreground/10 transition-all active:scale-95 w-full sm:w-auto">
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                        {item ? "Salvar Alterações" : "Criar Meta"}
                    </Button>
                </div>
            </DialogFooter>
        </form>
    );
}