"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { createWishlist, updateWishlist } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { 
    Loader2, 
    Image as ImageIcon, 
    Link as LinkIcon, 
    DollarSign, 
    Tag, 
    PiggyBank,
    Flame,
    Scale,
    Snowflake,
    ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// Interface compatível com o banco
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
    const [isLoading, setIsLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(item?.imageUrl || "");
    const [price, setPrice] = useState(item?.price || 0);
    const [saved, setSaved] = useState(item?.saved || 0);
    const [priority, setPriority] = useState(item?.priority || "MEDIUM");

    // Cálculo visual de progresso
    const progress = price > 0 ? Math.min((saved / price) * 100, 100) : 0;

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        formData.set("priority", priority);
        
        try {
            if (item) {
                await updateWishlist(formData);
                toast.success("Meta atualizada!");
            } else {
                await createWishlist(formData);
                toast.success("Nova meta criada! 🚀");
            }
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar meta.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form action={handleSubmit} className="space-y-6">
            {item && <input type="hidden" name="id" value={item.id} />}
            
            <div className="flex flex-col sm:flex-row gap-6">
                
                {/* COLUNA 1: PREVIEW DA IMAGEM */}
                <div className="w-full sm:w-[180px] flex flex-col gap-3 shrink-0">
                    <div className="aspect-square w-full rounded-2xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden relative group transition-colors hover:border-primary/50">
                        {previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" onError={() => setPreviewUrl("")} />
                        ) : (
                            <div className="flex flex-col items-center text-muted-foreground gap-2">
                                <ImageIcon className="h-8 w-8 opacity-50" />
                                <span className="text-[10px] text-center px-2 font-medium">Link da Imagem</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="relative">
                        <LinkIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input 
                            name="imageUrl" 
                            value={previewUrl} 
                            onChange={(e) => setPreviewUrl(e.target.value)} 
                            placeholder="URL da imagem..." 
                            className="h-8 pl-8 text-xs bg-muted/30 border-border"
                        />
                    </div>
                </div>

                {/* COLUNA 2: DADOS DO PRODUTO */}
                <div className="flex-1 space-y-5">
                    
                    {/* Nome */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Tag className="h-3.5 w-3.5" /> Nome do Item
                        </Label>
                        <Input 
                            name="name" 
                            defaultValue={item?.name} 
                            placeholder="Ex: MacBook Pro M3, Viagem..." 
                            required 
                            autoFocus 
                            className="font-semibold h-10 border-border bg-background focus-visible:ring-primary" 
                        />
                    </div>

                    {/* Valores */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Valor Total</Label>
                            <div className="relative group">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input 
                                    name="price" 
                                    type="number" 
                                    step="0.01" 
                                    value={price} 
                                    onChange={(e) => setPrice(Number(e.target.value))}
                                    required 
                                    className="pl-9 font-mono bg-muted/30 border-border"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Já Guardado</Label>
                            <div className="relative group">
                                <PiggyBank className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                                <Input 
                                    name="saved" 
                                    type="number" 
                                    step="0.01" 
                                    value={saved}
                                    onChange={(e) => setSaved(Number(e.target.value))}
                                    className="pl-9 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-emerald-500/20 focus-visible:ring-emerald-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="space-y-1.5 bg-muted/30 p-3 rounded-lg border border-border">
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <span>Progresso</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                             <div 
                                className={cn("h-full transition-all duration-500", progress >= 100 ? 'bg-emerald-500' : 'bg-primary')} 
                                style={{ width: `${progress}%` }} 
                             />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-right pt-0.5 font-mono">
                            Faltam R$ {Math.max(0, price - saved).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    {/* Prioridade */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Prioridade</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setPriority("HIGH")}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all",
                                    priority === "HIGH" 
                                        ? "bg-red-500/10 border-red-500/50 text-red-600 ring-1 ring-red-500" 
                                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <Flame className="h-4 w-4" /> Alta
                            </button>
                            <button
                                type="button"
                                onClick={() => setPriority("MEDIUM")}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all",
                                    priority === "MEDIUM" 
                                        ? "bg-amber-500/10 border-amber-500/50 text-amber-600 ring-1 ring-amber-500" 
                                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <Scale className="h-4 w-4" /> Média
                            </button>
                            <button
                                type="button"
                                onClick={() => setPriority("LOW")}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all",
                                    priority === "LOW" 
                                        ? "bg-blue-500/10 border-blue-500/50 text-blue-600 ring-1 ring-blue-500" 
                                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <Snowflake className="h-4 w-4" /> Baixa
                            </button>
                        </div>
                    </div>

                    {/* Link da Loja */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Link da Loja</Label>
                        <div className="relative">
                            <ArrowUpRight className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input name="productUrl" defaultValue={item?.productUrl || ""} placeholder="https://amazon.com.br/..." className="h-9 pl-9 text-xs bg-muted/30 border-border" />
                        </div>
                    </div>
                </div>
            </div>

            <DialogFooter className="border-t border-border pt-4">
                <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[140px] shadow-sm" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (item ? "Salvar Alterações" : "Criar Meta")}
                </Button>
            </DialogFooter>
        </form>
    );
}