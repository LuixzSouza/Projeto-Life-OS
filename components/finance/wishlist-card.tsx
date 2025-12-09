"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ExternalLink, Target, Pencil, Wallet, Trophy, Check } from "lucide-react";
import { addSavings, deleteWishlist } from "@/app/(dashboard)/finance/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { WishlistForm, WishlistData } from "./wishlist-form";
import { cn } from "@/lib/utils";

// Grid Principal
export function WishlistGrid({ items }: { items: WishlistData[] }) {
    if (items.length === 0) return (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-full mb-4">
                <Target className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Nenhuma meta definida</h3>
            <p className="text-zinc-500 text-sm max-w-xs text-center mt-1">Crie uma meta para começar a guardar dinheiro para seus sonhos.</p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => <WishlistCard key={item.id} item={item} />)}
        </div>
    );
}

// Sub-componente: Modal de Depósito
function DepositDialog({ item }: { item: WishlistData }) {
    const [open, setOpen] = useState(false);

    const handleDeposit = async (formData: FormData) => {
        await addSavings(formData);
        toast.success("Dinheiro guardado! 💰");
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-sm group-hover:translate-y-0 translate-y-0 transition-transform">
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Valor
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xs">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-indigo-600"/> Guardar Dinheiro
                    </DialogTitle>
                </DialogHeader>
                <form action={handleDeposit} className="space-y-4 pt-2">
                    <input type="hidden" name="id" value={item.id} />
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Valor a depositar</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-zinc-500">R$</span>
                            <Input name="amount" type="number" step="0.01" placeholder="0,00" autoFocus required className="pl-9 text-lg font-bold" />
                        </div>
                    </div>
                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                        Confirmar
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// Card Individual (Redesenhado)
function WishlistCard({ item }: { item: WishlistData }) {
    const [isEditOpen, setIsEditOpen] = useState(false);

    const progress = Math.min((item.saved / item.price) * 100, 100);
    const remaining = item.price - item.saved;
    const isCompleted = progress >= 100;

    const handleDeleteConfirmed = async () => {
        await deleteWishlist(item.id!);
        toast.success("Meta removida.");
    }

    return (
        <Card className="group relative overflow-hidden flex flex-col h-full border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
            
            {/* IMAGEM (Hero) */}
            <div className="relative h-48 w-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-900 transition-colors">
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <Target className="h-12 w-12 text-zinc-300" />
                )}
                
                {/* Badge de Status */}
                {isCompleted && (
                    <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> Conquistado
                    </div>
                )}
                
                {/* Ações Flutuantes (Hover) */}
                <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                     <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 backdrop-blur shadow-sm"><Pencil className="h-3.5 w-3.5" /></Button>
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
                                <AlertDialogTitle>Excluir Meta?</AlertDialogTitle>
                                <AlertDialogDescription>Tem certeza que deseja desistir de &quot;{item.name}&quot;?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-red-600 hover:bg-red-700">Sim, Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* CONTEÚDO */}
            <CardContent className="flex-1 p-5 pb-2">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 leading-tight">{item.name}</h4>
                        {item.productUrl && (
                            <a href={item.productUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                                Ver na loja <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-end">
                        <div>
                            <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Guardado</span>
                            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                R$ {item.saved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="text-right">
                             <span className="text-xs text-zinc-400">Meta</span>
                             <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                             </p>
                        </div>
                    </div>

                    {/* Barra de Progresso Customizada */}
                    <div className="relative h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                            className={cn(
                                "h-full transition-all duration-1000 ease-out rounded-full",
                                isCompleted ? "bg-green-500" : "bg-indigo-600"
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] font-medium text-zinc-500 pt-1">
                        <span>{Math.round(progress)}%</span>
                        {!isCompleted && <span>Faltam R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                    </div>
                </div>
            </CardContent>

            {/* RODAPÉ (Botão de Depósito) */}
            {!isCompleted && (
                <CardFooter className="p-4 pt-0">
                    <DepositDialog item={item} />
                </CardFooter>
            )}
            
            {isCompleted && (
                 <CardFooter className="p-4 pt-0">
                    <Button variant="outline" className="w-full border-green-200 bg-green-50 text-green-700 hover:bg-green-100 cursor-default">
                        <Check className="h-4 w-4 mr-2" /> Objetivo Alcançado!
                    </Button>
                 </CardFooter>
            )}
        </Card>
    )
}