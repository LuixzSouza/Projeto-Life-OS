"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, CalendarClock, Trash2, AlertCircle, DollarSign } from "lucide-react";
import { createRecurring, updateRecurring, deleteRecurring } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { useCallback } from "react";

export interface RecurringItemData { id: string; title: string; amount: number; dayOfMonth: number; category: string; }
interface RecurringDialogProps { trigger?: React.ReactNode; item?: RecurringItemData; }

export function RecurringDialog({ trigger, item }: RecurringDialogProps) {
    const [open, setOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

    // --- amount: armazenamos centavos como string ("100" => R$1,00)
    const [amountDigits, setAmountDigits] = useState<string>(() => {
        if (item?.amount === undefined || item?.amount === null) return "";
        const cents = Math.round(Number(item.amount) * 100);
        return String(cents);
    });

    const rawAmount: string = amountDigits ? (Number(amountDigits) / 100).toFixed(2) : "";
    const formattedAmount: string = amountDigits
        ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(rawAmount))
        : "";

    const amountRef = useRef<HTMLInputElement | null>(null);

    // Mantém cursor no final após formatação (melhora UX)
    useEffect(() => {
        const el = amountRef.current;
        if (!el) return;
        const t = window.setTimeout(() => {
            const len = el.value.length;
            el.setSelectionRange(len, len);
        }, 0);
        return () => clearTimeout(t);
    }, [formattedAmount]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const onlyDigits = e.target.value.replace(/\D/g, "");
        setAmountDigits(onlyDigits.slice(0, 12)); // limite opcional
    };

    const handleAmountPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData("text");
        const onlyDigits = text.replace(/\D/g, "");
        if (!onlyDigits) {
            e.preventDefault();
            return;
        }
        e.preventDefault();
        setAmountDigits(onlyDigits.slice(0, 12));
    };

    const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const allowed = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"];
        if (allowed.includes(e.key)) return;
        if (/^\d$/.test(e.key)) return;
        if (e.key === "." || e.key === ",") { e.preventDefault(); return; }
        e.preventDefault();
    };

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            // setamos o amount transformado (ponto decimal) para o backend
            formData.set("amount", rawAmount);
            if (item) {
                formData.append("id", item.id);
                await updateRecurring(formData);
                toast.success("Custo fixo atualizado!");
            } else {
                await createRecurring(formData);
                toast.success("Custo fixo adicionado!");
            }
            setOpen(false);
        } catch (err) {
            console.error(err);
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
        } catch (err) {
            console.error(err);
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

                {/* REMOVIDO overflow-hidden para evitar cortar dropdowns */}
                <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 shadow-2xl border-border/40">
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

                    <form action={handleSubmit} className="space-y-5 p-6 bg-background" noValidate>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome da Despesa</Label>
                            <Input name="title" placeholder="Ex: Netflix, Internet, Aluguel..." defaultValue={item?.title} required className="h-12 rounded-xl bg-muted/20 font-medium" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Valor Mensal</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                                    {/* Input VISÍVEL: formatado (pt-BR). */}
                                    <Input
                                        ref={amountRef}
                                        type="text"
                                        placeholder="0,00"
                                        value={formattedAmount}
                                        onChange={handleAmountChange}
                                        onPaste={handleAmountPaste}
                                        onKeyDown={handleAmountKeyDown}
                                        className="pl-11 h-12 rounded-xl bg-muted/20 font-mono font-bold"
                                        inputMode="decimal"
                                    />
                                    {/* Hidden: valor real enviado ao servidor */}
                                    <input type="hidden" name="amount" value={rawAmount} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Dia do Vencimento</Label>
                                <Input name="dayOfMonth" type="number" min="1" max="31" placeholder="Dia (1-31)" defaultValue={item?.dayOfMonth} required className="h-12 rounded-xl bg-muted/20 font-mono font-bold" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Categoria</Label>
                            {/* Forçamos z para garantir que o Select abra acima do Dialog */}
                            <Select name="category" defaultValue={item?.category || "Assinaturas"}>
                                <SelectTrigger className="h-12 rounded-xl bg-muted/20 font-medium"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl z-[9999]">
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