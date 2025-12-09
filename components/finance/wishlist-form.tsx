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
    BarChart3, 
    PiggyBank,
    Flame,
    Scale,
    Snowflake
} from "lucide-react";
import { cn } from "@/lib/utils";

// Interface
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

    // Cálculo visual de progresso em tempo real
    const progress = price > 0 ? Math.min((saved / price) * 100, 100) : 0;

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        // Injeta a prioridade manual se o form não pegar o valor do botão
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
        <form action={handleSubmit} className="space-y-6 pt-2">
            {item && <input type="hidden" name="id" value={item.id} />}
            
            <div className="flex flex-col sm:flex-row gap-6">
                
                {/* COLUNA 1: PREVIEW DA IMAGEM & URL */}
                <div className="w-full sm:w-1/3 flex flex-col gap-3">
                    <div className="aspect-square w-full rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center overflow-hidden relative group transition-colors hover:border-purple-300">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-2" onError={() => setPreviewUrl("")} />
                        ) : (
                            <div className="flex flex-col items-center text-zinc-400 gap-2">
                                <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                                    <ImageIcon className="h-6 w-6" />
                                </div>
                                <span className="text-[10px] text-center px-4 font-medium">Cole o link da imagem</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Imagem (URL)</Label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                            <Input 
                                name="imageUrl" 
                                value={previewUrl} 
                                onChange={(e) => setPreviewUrl(e.target.value)} 
                                placeholder="https://..." 
                                className="h-9 pl-9 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                            />
                        </div>
                    </div>
                </div>

                {/* COLUNA 2: DADOS DO PRODUTO */}
                <div className="flex-1 space-y-5">
                    
                    {/* Nome */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <Tag className="h-3 w-3" /> O que vamos comprar?
                        </Label>
                        <Input 
                            name="name" 
                            defaultValue={item?.name} 
                            placeholder="Ex: MacBook Pro M3" 
                            required 
                            autoFocus 
                            className="text-lg font-semibold h-11 border-zinc-200 dark:border-zinc-800 focus-visible:ring-purple-500" 
                        />
                    </div>

                    {/* Preços e Economia */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Valor Total</Label>
                            <div className="relative group">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 group-focus-within:text-purple-500 transition-colors" />
                                <Input 
                                    name="price" 
                                    type="number" 
                                    step="0.01" 
                                    value={price} 
                                    onChange={(e) => setPrice(Number(e.target.value))}
                                    required 
                                    className="pl-9 font-mono font-medium"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Já tenho</Label>
                            <div className="relative group">
                                <PiggyBank className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 group-focus-within:text-green-500 transition-colors" />
                                <Input 
                                    name="saved" 
                                    type="number" 
                                    step="0.01" 
                                    value={saved}
                                    onChange={(e) => setSaved(Number(e.target.value))}
                                    className="pl-9 font-mono font-medium text-green-600 dark:text-green-400"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Barra de Progresso Visual no Modal */}
                    <div className="space-y-1.5 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            <span>Progresso Atual</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                             <div 
                                className={`h-full transition-all duration-500 ${progress >= 100 ? 'bg-green-500' : 'bg-purple-600'}`} 
                                style={{ width: `${progress}%` }} 
                             />
                        </div>
                        <p className="text-[10px] text-zinc-400 text-right pt-0.5">
                            Faltam R$ {Math.max(0, price - saved).toFixed(2)}
                        </p>
                    </div>

                    {/* Seletor de Prioridade Visual (Botões em vez de Select) */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <BarChart3 className="h-3 w-3" /> Prioridade
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setPriority("HIGH")}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all",
                                    priority === "HIGH" 
                                        ? "bg-red-50 border-red-200 text-red-600 ring-1 ring-red-500 dark:bg-red-900/20 dark:border-red-800" 
                                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50"
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
                                        ? "bg-yellow-50 border-yellow-200 text-yellow-600 ring-1 ring-yellow-500 dark:bg-yellow-900/20 dark:border-yellow-800" 
                                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50"
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
                                        ? "bg-blue-50 border-blue-200 text-blue-600 ring-1 ring-blue-500 dark:bg-blue-900/20 dark:border-blue-800" 
                                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50"
                                )}
                            >
                                <Snowflake className="h-4 w-4" /> Baixa
                            </button>
                        </div>
                    </div>

                    {/* Link do Produto */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Link da Loja</Label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                            <Input name="productUrl" defaultValue={item?.productUrl || ""} placeholder="https://amazon.com.br/..." className="h-9 pl-9 text-xs" />
                        </div>
                    </div>
                </div>
            </div>

            <DialogFooter className="border-t pt-4">
                <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white min-w-[140px] shadow-md shadow-purple-900/20" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (item ? "Salvar Alterações" : "Criar Meta")}
                </Button>
            </DialogFooter>
        </form>
    );
}