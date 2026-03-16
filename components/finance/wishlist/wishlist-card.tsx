"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ExternalLink, Target, Pencil, Wallet, Trophy, Check, Star, AlertCircle, Loader2 } from "lucide-react";
import { addSavings, deleteWishlist } from "@/app/(dashboard)/finance/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { WishlistForm, WishlistData } from "./wishlist-form";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti"; 

const formatMoney = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

export function WishlistGrid({ items }: { items: WishlistData[] }) {
    if (items.length === 0) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-500">
            {items.map(item => <WishlistCard key={item.id} item={item} />)}
        </div>
    );
}

function DepositDialog({ item }: { item: WishlistData }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const remaining = item.price - item.saved;

    const handleDeposit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            await addSavings(formData);
            toast.success("Dinheiro guardado! Mais um passo. 🚀");
            
            const amount = Number(formData.get('amount'));
            if (item.saved + amount >= item.price) {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#10b981', '#3b82f6', '#f59e0b'] });
            }
            setOpen(false);
        } catch {
            toast.error("Erro ao salvar o valor.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full h-12 rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90 shadow-lg transition-all active:scale-95">
                    <Plus className="h-5 w-5 mr-2" /> Guardar Dinheiro
                </Button>
            </DialogTrigger>
            
            <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-[92vw] sm:max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-[2rem] p-0 overflow-hidden shadow-2xl border-border/40">
                <div className="bg-muted/10 p-6 border-b border-border/40">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-xl font-extrabold">
                            <div className="p-2.5 bg-primary/10 text-primary rounded-xl shadow-sm border border-primary/20">
                                <Wallet className="h-5 w-5"/>
                            </div>
                            Aportar Valor
                        </DialogTitle>
                        <DialogDescription className="font-medium text-left">
                            Quanto você deseja guardar hoje para esta meta?
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form action={handleDeposit} className="space-y-6 p-6 bg-background">
                    <input type="hidden" name="id" value={item.id} />
                    <div className="space-y-3">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-xl">R$</span>
                            <Input 
                                name="amount" type="number" step="0.01" placeholder="0.00" autoFocus required 
                                className="pl-14 text-4xl font-black font-mono h-20 rounded-2xl bg-muted/20 border-border/50 focus-visible:ring-primary/30 shadow-inner" 
                            />
                        </div>
                        <div className="flex justify-between items-center px-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                Faltam R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <button type="button" onClick={() => {
                                const input = document.querySelector('input[name="amount"]') as HTMLInputElement;
                                if(input) input.value = remaining.toFixed(2);
                            }} className="text-[10px] font-black uppercase text-primary hover:underline">
                                Completar Meta
                            </button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading} className="w-full h-14 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all active:scale-95">
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar Depósito"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function WishlistCard({ item }: { item: WishlistData }) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const progressRaw = (item.saved / item.price) * 100;
    const progress = Math.min(progressRaw, 100);
    const remaining = item.price - item.saved;
    const isCompleted = progress >= 100;
    const isPriority = item.priority === 'HIGH' || item.priority === 'URGENT';

    const handleDeleteConfirmed = async () => {
        setIsDeleting(true);
        try {
            await deleteWishlist(item.id!);
            toast.success("Meta removida do seu cofre.");
        } catch {
            toast.error("Erro ao remover meta.");
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <Card className={cn(
            "group relative overflow-hidden flex flex-col h-full border-border/40 shadow-sm hover:shadow-xl transition-all duration-500 bg-card rounded-[1.5rem] hover:-translate-y-1",
            isCompleted && "border-emerald-500/30 shadow-emerald-500/10"
        )}>
            
            {/* ÁREA DA IMAGEM */}
            <div className="relative h-48 w-full bg-muted/20 flex items-center justify-center p-8 transition-all duration-500 border-b border-border/30">
                {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain drop-shadow-xl transition-transform duration-500 group-hover:scale-110" />
                ) : (
                    <div className="bg-background p-6 rounded-3xl shadow-sm border border-border/50 transition-transform duration-500 group-hover:scale-110">
                        <Target className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                )}
                
                {/* Badges (Status) */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                    {isCompleted ? (
                        <div className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 tracking-widest uppercase animate-in zoom-in duration-300">
                            <Trophy className="h-3.5 w-3.5" /> Conquistado
                        </div>
                    ) : isPriority && (
                        <div className="bg-amber-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 tracking-widest uppercase">
                            <Star className="h-3.5 w-3.5 fill-white" /> Prioridade
                        </div>
                    )}
                </div>
                
                {/* Ações de Edição/Exclusão */}
                <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0">
                     
                     <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-9 w-9 rounded-xl bg-background/80 backdrop-blur-md shadow-sm border border-border/50 hover:text-primary transition-all">
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        {/* Ajuste Crítico de Responsividade: 
                           w-[95vw] para celular, md:max-w-2xl para desktop, 
                           max-h-[90vh] e overflow-y-auto para garantir o scroll interno se a tela for muito pequena.
                        */}
                        <DialogContent className="fixed left-[50%] top-[50%] z-50 flex w-[95vw] md:max-w-2xl max-h-[90vh] flex-col translate-x-[-50%] translate-y-[-50%] rounded-[2rem] shadow-2xl p-0 overflow-hidden border-border/40 bg-background">
                            <div className="p-6 bg-muted/10 border-b border-border/40 shrink-0">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-3 text-xl font-extrabold">
                                        <div className="p-2.5 bg-primary/10 text-primary rounded-xl shadow-sm border border-primary/20">
                                            <Pencil className="h-5 w-5"/>
                                        </div>
                                        Editar Meta
                                    </DialogTitle>
                                    <DialogDescription className="font-medium text-left">
                                        Ajuste os valores, prioridade ou detalhes do seu sonho.
                                    </DialogDescription>
                                </DialogHeader>
                            </div>
                            {/* Scroll Area interna do form */}
                            <div className="p-6 overflow-y-auto flex-1">
                                <WishlistForm item={item} onClose={() => setIsEditOpen(false)} />
                            </div>
                        </DialogContent>
                    </Dialog>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-9 w-9 rounded-xl bg-background/80 backdrop-blur-md shadow-sm border border-border/50 hover:text-rose-500 transition-all">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="fixed left-[50%] top-[50%] z-50 grid w-[90vw] max-w-[425px] translate-x-[-50%] translate-y-[-50%] p-6 rounded-[2rem] border-destructive/20 shadow-2xl bg-background">
                            <AlertDialogHeader>
                                <div className="flex items-center gap-3 text-destructive mb-2">
                                    <div className="p-3 rounded-2xl bg-destructive/10"><AlertCircle className="h-6 w-6" /></div>
                                    <AlertDialogTitle className="text-xl font-bold">Desistir do Sonho?</AlertDialogTitle>
                                </div>
                                <AlertDialogDescription className="text-base text-muted-foreground text-left">
                                    Você já guardou <strong className="text-foreground">R$ {item.saved.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong> para &quot;{item.name}&quot;. Se você excluir esta meta, o valor voltará para o seu saldo livre.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-6">
                                <AlertDialogCancel className="rounded-xl h-12 font-bold">Manter Sonho</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-12 font-bold px-8 shadow-lg shadow-rose-500/20">
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, Desistir"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* CONTEÚDO DO CARD */}
            <CardContent className="flex-1 p-6 pb-5 flex flex-col justify-between bg-card">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-extrabold text-lg text-foreground leading-tight line-clamp-2" title={item.name}>{item.name}</h4>
                        {item.productUrl && (
                            <a href={item.productUrl} target="_blank" rel="noreferrer" className="p-1.5 bg-muted rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0 ml-2">
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        )}
                    </div>
                </div>

                <div className="space-y-4 mt-6">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Cofre atual</p>
                            <p className={cn("text-3xl font-black font-mono tracking-tighter tabular-nums leading-none", isCompleted ? "text-emerald-500" : "text-foreground")}>
                                {formatMoney(item.saved)}
                            </p>
                        </div>
                        <div className="text-right pb-1">
                             <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">de {formatMoney(item.price)}</span>
                        </div>
                    </div>

                    <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                        <div 
                            className={cn(
                                "h-full transition-all duration-1000 ease-out rounded-full relative",
                                isCompleted ? "bg-emerald-500" : "bg-foreground"
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span className={cn(isCompleted && "text-emerald-600")}>{Math.round(progress)}% Concluído</span>
                        {!isCompleted && <span>Faltam {formatMoney(remaining)}</span>}
                    </div>
                </div>
            </CardContent>

            {/* RODAPÉ E AÇÃO */}
            <div className="px-6 pb-6 mt-auto bg-card">
                {!isCompleted ? (
                    <DepositDialog item={item} />
                ) : (
                    <Button variant="outline" className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 cursor-default font-bold h-12 rounded-xl">
                        <Check className="h-5 w-5 mr-2" /> Meta Atingida!
                    </Button>
                )}
            </div>
        </Card>
    )
}