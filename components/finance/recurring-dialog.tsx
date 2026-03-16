"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, CalendarClock, Trash2, AlertCircle } from "lucide-react";
import { createRecurring, updateRecurring, deleteRecurring } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";

export interface RecurringItemData { id: string; title: string; amount: number; dayOfMonth: number; category: string; }
interface RecurringDialogProps { trigger?: React.ReactNode; item?: RecurringItemData; }

export function RecurringDialog({ trigger, item }: RecurringDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        try {
            if (item) {
                formData.append("id", item.id);
                await updateRecurring(formData);
                toast.success("Custo fixo atualizado!");
            } else {
                await createRecurring(formData);
                toast.success("Custo fixo adicionado!");
            }
            setOpen(false);
        } catch {
            toast.error("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    }

    const handleDelete = async () => {
        if (!item) return;
        setIsLoading(true);
        try {
            await deleteRecurring(item.id);
            toast.success("Custo recorrente removido.");
            setIsDeleteDialogOpen(false);
            setOpen(false);
        } catch {
            toast.error("Erro ao excluir.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {trigger ? trigger : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg transition-colors">
                            <Plus className="h-5 w-5" />
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden shadow-2xl border-border/40">
                    <div className="bg-muted/10 p-6 border-b border-border/40">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 text-xl font-extrabold">
                                <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500 shadow-sm">
                                    <CalendarClock className="h-5 w-5" />
                                </div>
                                {item ? "Editar Custo Fixo" : "Novo Custo Recorrente"}
                            </DialogTitle>
                            <DialogDescription>Assinaturas mensais e contas obrigatórias.</DialogDescription>
                        </DialogHeader>
                    </div>

                    <form action={handleSubmit} className="space-y-5 p-6 bg-background">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome da Despesa</Label>
                            <Input name="title" placeholder="Ex: Netflix, Internet, Aluguel..." defaultValue={item?.title} required className="h-12 rounded-xl bg-muted/20 font-medium" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Valor Mensal</Label>
                                <Input name="amount" type="number" step="0.01" placeholder="0.00" defaultValue={item?.amount} required className="h-12 rounded-xl bg-muted/20 font-mono font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Dia do Vencimento</Label>
                                <Input name="dayOfMonth" type="number" min="1" max="31" placeholder="Dia (1-31)" defaultValue={item?.dayOfMonth} required className="h-12 rounded-xl bg-muted/20 font-mono font-bold" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Categoria</Label>
                            <Select name="category" defaultValue={item?.category || "Assinaturas"}>
                                <SelectTrigger className="h-12 rounded-xl bg-muted/20 font-medium"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="Moradia">🏠 Moradia</SelectItem>
                                    <SelectItem value="Assinaturas">📺 Assinaturas</SelectItem>
                                    <SelectItem value="Serviços">💡 Serviços Essenciais</SelectItem>
                                    <SelectItem value="Educação">📚 Educação</SelectItem>
                                    <SelectItem value="Outros">📦 Outros</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-4 border-t border-border/40 flex justify-between w-full items-center">
                            {item ? (
                                <Button type="button" variant="ghost" className="text-rose-600 hover:bg-rose-500/10 rounded-xl font-bold px-4" onClick={() => setIsDeleteDialogOpen(true)} disabled={isLoading}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                </Button>
                            ) : <div />}
                            
                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" className="rounded-xl font-bold" onClick={() => setOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 min-w-[120px]">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (item ? "Salvar" : "Adicionar")}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Seguro de Exclusão */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-[2rem] border-destructive/20 shadow-2xl">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 text-destructive mb-2">
                            <div className="p-3 rounded-2xl bg-destructive/10"><AlertCircle className="h-6 w-6" /></div>
                            <AlertDialogTitle className="text-xl font-bold">Remover Custo Fixo?</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-base text-muted-foreground">
                            Você deixará de acompanhar esta despesa mensalmente no seu fluxo de caixa livre.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl h-12 font-bold px-8 shadow-lg shadow-destructive/20">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, Remover"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}