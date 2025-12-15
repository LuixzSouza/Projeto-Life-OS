"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ExternalLink, Target, Pencil, Wallet, Trophy, Check, Calendar, Star } from "lucide-react";
import { addSavings, deleteWishlist } from "@/app/(dashboard)/finance/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { WishlistForm, WishlistData } from "./wishlist-form";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti"; // Opcional: Instalar 'canvas-confetti' para efeito uau

// Grid Principal
export function WishlistGrid({ items }: { items: WishlistData[] }) {
    if (items.length === 0) return (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/30 dark:bg-zinc-900/20">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-5 rounded-full mb-4 ring-8 ring-zinc-50 dark:ring-zinc-900">
                <Target className="h-10 w-10 text-zinc-400" />
            </div>
            <h3 className="font-bold text-xl text-zinc-900 dark:text-zinc-100">Nenhum sonho definido</h3>
            <p className="text-zinc-500 text-sm max-w-xs text-center mt-2 leading-relaxed">
                Transforme desejos em planos. Crie uma meta para começar a guardar dinheiro.
            </p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map(item => <WishlistCard key={item.id} item={item} />)}
        </div>
    );
}

// Sub-componente: Modal de Depósito Otimizado
function DepositDialog({ item }: { item: WishlistData }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleDeposit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            await addSavings(formData);
            toast.success("Dinheiro guardado! Mais um passo. 🚀");
            
            // Efeito de confete se completar
            const amount = Number(formData.get('amount'));
            if (item.saved + amount >= item.price) {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
            
            setOpen(false);
        } catch (error) {
            toast.error("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-md font-semibold h-11">
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Valor
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xs rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Wallet className="h-5 w-5"/></div>
                        Guardar Dinheiro
                    </DialogTitle>
                </DialogHeader>
                <form action={handleDeposit} className="space-y-6 pt-2">
                    <input type="hidden" name="id" value={item.id} />
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Quanto vai guardar?</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">R$</span>
                            <Input 
                                name="amount" 
                                type="number" 
                                step="0.01" 
                                placeholder="0,00" 
                                autoFocus 
                                required 
                                className="pl-12 text-2xl font-black h-14 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-500" 
                            />
                        </div>
                        <p className="text-xs text-center text-zinc-400">Faltam R$ {(item.price - item.saved).toFixed(2)}</p>
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 font-bold text-lg shadow-lg shadow-indigo-500/20">
                        {isLoading ? "Salvando..." : "Confirmar Depósito"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// Card Individual (Design Premium)
function WishlistCard({ item }: { item: WishlistData }) {
    const [isEditOpen, setIsEditOpen] = useState(false);

    const progress = Math.min((item.saved / item.price) * 100, 100);
    const remaining = item.price - item.saved;
    const isCompleted = progress >= 100;
    
    // Prioridade Visual
    const isPriority = item.priority === 'HIGH' || item.priority === 'URGENT'; // Assumindo que você tem esse campo no banco

    const handleDeleteConfirmed = async () => {
        await deleteWishlist(item.id!);
        toast.success("Meta removida.");
    }

    return (
        <Card className={cn(
            "group relative overflow-hidden flex flex-col h-full border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 rounded-2xl",
            isCompleted && "ring-green-500/50 shadow-green-500/10"
        )}>
            
            {/* IMAGEM (Hero) */}
            <div className="relative h-48 w-full bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-8 group-hover:p-6 transition-all duration-500">
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain drop-shadow-xl transition-transform duration-500 group-hover:scale-110" />
                ) : (
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-6 rounded-full">
                        <Target className="h-10 w-10 text-zinc-300" />
                    </div>
                )}
                
                {/* Badges Flutuantes */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                    {isCompleted ? (
                        <div className="bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 animate-in fade-in zoom-in duration-300">
                            <Trophy className="h-3 w-3" /> CONQUISTADO
                        </div>
                    ) : isPriority && (
                        <div className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                            <Star className="h-3 w-3 fill-white" /> PRIORIDADE
                        </div>
                    )}
                </div>
                
                {/* Ações (Aparecem no Hover) */}
                <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-x-2 group-hover:translate-x-0">
                     <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 backdrop-blur shadow-sm hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader><DialogTitle>Editar Meta</DialogTitle></DialogHeader>
                            <WishlistForm item={item} onClose={() => setIsEditOpen(false)} />
                        </DialogContent>
                    </Dialog>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 backdrop-blur shadow-sm hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Desistir da meta?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Você já guardou <strong>R$ {item.saved}</strong> para &quot;{item.name}&quot;. Esse valor voltará para o saldo livre? (Lógica a implementar)
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Manter Sonho</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-red-600 hover:bg-red-700">Desistir</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* CONTEÚDO */}
            <CardContent className="flex-1 p-5 pb-4 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 leading-tight line-clamp-1" title={item.name}>{item.name}</h4>
                        {item.productUrl && (
                            <a href={item.productUrl} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-blue-500 transition-colors">
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        )}
                    </div>
                    {/* Data Alvo (Se existir) */}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-4">
                        <Calendar className="h-3 w-3" /> 
                        <span>Meta: Dezembro/2025</span> 
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Guardado</p>
                            <p className={cn("text-2xl font-black", isCompleted ? "text-green-600" : "text-indigo-600 dark:text-indigo-400")}>
                                {item.saved.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                        </div>
                        <div className="text-right">
                             <span className="text-xs text-zinc-400 font-medium">de {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                    </div>

                    {/* Barra de Progresso Customizada */}
                    <div className="relative h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                        <div 
                            className={cn(
                                "h-full transition-all duration-1000 ease-out rounded-full relative overflow-hidden",
                                isCompleted ? "bg-green-500" : "bg-gradient-to-r from-indigo-500 to-purple-600"
                            )}
                            style={{ width: `${progress}%` }}
                        >
                            {/* Brilho animado na barra */}
                            {!isCompleted && <div className="absolute top-0 bottom-0 left-0 right-0 bg-white/20 animate-pulse"></div>}
                        </div>
                    </div>
                    
                    <div className="flex justify-between text-[10px] font-bold text-zinc-500">
                        <span className={cn(isCompleted && "text-green-600")}>{Math.round(progress)}% Concluído</span>
                        {!isCompleted && <span>Faltam {remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>}
                    </div>
                </div>
            </CardContent>

            {/* RODAPÉ (Ação) */}
            <CardFooter className="p-5 pt-0 mt-2">
                {!isCompleted ? (
                    <DepositDialog item={item} />
                ) : (
                    <Button variant="outline" className="w-full border-green-200 bg-green-50 text-green-700 hover:bg-green-100 cursor-default font-bold">
                        <Check className="h-4 w-4 mr-2" /> Meta Atingida!
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}