"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, CalendarClock, Trash2, DollarSign } from "lucide-react";
import { createRecurring, updateRecurring, deleteRecurring } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { FREQUENCIES, FREQUENCY_LABEL, asFrequency } from "@/lib/recurrence";
import { cn } from "@/lib/utils";

export interface RecurringItemData {
    id: string;
    title: string;
    amount: number;
    dayOfMonth: number;
    category: string;
    frequency?: string;
    startDate?: string | null;
    endDate?: string | null;
    createdAt?: string;
    installments?: number | null;
    paidInstallments?: number;
    currentDueDate?: string | null;
    currentPaid?: boolean;
}
interface RecurringDialogProps { trigger?: React.ReactNode; item?: RecurringItemData; }

const toDateInput = (v: string | null | undefined): string => (v ? new Date(v).toISOString().slice(0, 10) : "");
const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function RecurringDialog({ trigger, item }: RecurringDialogProps) {
    const [open, setOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
    const [frequency, setFrequency] = useState<string>(asFrequency(item?.frequency));

    // Modo: recorrente (sem fim) × parcelado (N parcelas, fim calculado).
    const [installmentMode, setInstallmentMode] = useState<boolean>(!!item?.installments);
    const [installments, setInstallments] = useState<string>(item?.installments ? String(item.installments) : "10");
    const [paid, setPaid] = useState<string>(item?.paidInstallments ? String(item.paidInstallments) : "0");

    // --- amount: centavos como string. No modo parcelado é o VALOR TOTAL.
    const [amountDigits, setAmountDigits] = useState<string>(() => {
        if (item?.amount === undefined || item?.amount === null) return "";
        const base = item.installments ? Number(item.amount) * item.installments : Number(item.amount);
        return String(Math.round(base * 100));
    });

    const rawAmount: string = amountDigits ? (Number(amountDigits) / 100).toFixed(2) : "";
    const installmentsNum = Math.max(1, parseInt(installments || "0", 10) || 0);
    const perInstallment = installmentMode && installmentsNum > 0 ? Number(rawAmount) / installmentsNum : null;
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
            // No modo parcelado o usuário digita o TOTAL; gravamos o valor por parcela.
            if (installmentMode && installmentsNum > 0) {
                formData.set("amount", (Number(rawAmount) / installmentsNum).toFixed(2));
                formData.set("installments", String(installmentsNum));
                formData.set("paidInstallments", String(Math.max(0, parseInt(paid || "0", 10) || 0)));
            } else {
                formData.set("amount", rawAmount);
                formData.delete("installments");
                formData.delete("paidInstallments");
            }
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
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {trigger ? trigger : (
                        <Button variant="ghost" size="icon" aria-label="Nova despesa recorrente" className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg transition-colors">
                            <Plus className="h-5 w-5" />
                        </Button>
                    )}
                </DialogTrigger>

                <DialogContent size="md">
                    <DialogHeader
                        icon={<CalendarClock />}
                        iconClassName="bg-amber-500/10 text-amber-600 border-amber-500/20"
                        title={item ? "Editar Custo Fixo" : "Novo Custo Recorrente"}
                        description="Assinaturas mensais e contas obrigatórias."
                    />

                    <form action={handleSubmit} className="flex flex-col flex-1 min-h-0" noValidate>
                        <DialogBody className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome da Despesa</Label>
                            <Input name="title" placeholder="Ex: Netflix, Internet, Aluguel..." defaultValue={item?.title} required className="h-12 rounded-xl bg-muted/20 font-medium" />
                        </div>

                        {/* Modo: recorrente (sem fim) × parcelado (Nx, fim calculado) */}
                        <div className="flex gap-1 p-1 bg-muted/40 rounded-xl border border-border/50">
                            <button type="button" onClick={() => setInstallmentMode(false)} className={cn("flex-1 h-9 rounded-lg text-xs font-bold transition-all", !installmentMode ? "bg-background shadow-sm text-amber-600" : "text-muted-foreground hover:text-foreground")}>Recorrente</button>
                            <button type="button" onClick={() => setInstallmentMode(true)} className={cn("flex-1 h-9 rounded-lg text-xs font-bold transition-all", installmentMode ? "bg-background shadow-sm text-amber-600" : "text-muted-foreground hover:text-foreground")}>Parcelado</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{installmentMode ? "Valor total" : "Valor"}</Label>
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
                                {installmentMode && perInstallment !== null && installmentsNum > 0 && (
                                    <p className="text-[11px] text-muted-foreground px-1">{installmentsNum}× de <span className="font-bold text-amber-600">{fmtBRL(perInstallment)}</span></p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Frequência</Label>
                                <Select name="frequency" value={frequency} onValueChange={setFrequency}>
                                    <SelectTrigger className="h-12 rounded-xl bg-muted/20 font-medium"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl z-[9999]">
                                        {FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{FREQUENCY_LABEL[f]}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {installmentMode ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nº de parcelas</Label>
                                        <Input type="number" min="2" max="360" value={installments} onChange={(e) => setInstallments(e.target.value.replace(/\D/g, ""))} required className="h-12 rounded-xl bg-muted/20 font-mono font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Parcelas já pagas</Label>
                                        <Input type="number" min="0" max={String(Math.max(0, installmentsNum - 1))} value={paid} onChange={(e) => setPaid(e.target.value.replace(/\D/g, ""))} className="h-12 rounded-xl bg-muted/20 font-mono font-bold" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                        Próximo vencimento (parcela {Math.min((parseInt(paid || "0", 10) || 0) + 1, installmentsNum)}/{installmentsNum})
                                    </Label>
                                    <Input name="startDate" type="date" defaultValue={toDateInput(item?.startDate)} required className="h-12 rounded-xl bg-muted/20 font-medium" />
                                    <p className="text-[11px] text-muted-foreground px-1">
                                        O encerramento é calculado automaticamente — {Math.max(0, installmentsNum - (parseInt(paid || "0", 10) || 0))} parcela(s) restante(s).
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {frequency === "MONTHLY" ? (
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Dia do Vencimento</Label>
                                        <Input name="dayOfMonth" type="number" min="1" max="31" placeholder="Dia (1-31)" defaultValue={item?.dayOfMonth} required className="h-12 rounded-xl bg-muted/20 font-mono font-bold" />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">1º Vencimento</Label>
                                        <Input name="startDate" type="date" defaultValue={toDateInput(item?.startDate)} required className="h-12 rounded-xl bg-muted/20 font-medium" />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Encerra em (opcional)</Label>
                                    <Input name="endDate" type="date" defaultValue={toDateInput(item?.endDate)} className="h-12 rounded-xl bg-muted/20 font-medium" />
                                </div>
                            </div>
                        )}

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

                        </DialogBody>

                        {/* Confirmação de exclusão INLINE (sem 2º modal — modais Radix
                            sobrepostos travam os cliques). Um modal só = sempre clicável. */}
                        {isDeleteDialogOpen ? (
                            <DialogFooter className="!flex-row justify-between items-center gap-3">
                                <p className="text-sm font-bold text-rose-600 leading-tight">Remover este custo fixo?</p>
                                <div className="flex gap-2 shrink-0">
                                    <Button type="button" variant="ghost" className="rounded-xl font-bold" onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>Não</Button>
                                    <Button type="button" onClick={handleDelete} disabled={isLoading} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold px-6 min-w-[120px]">
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sim, remover"}
                                    </Button>
                                </div>
                            </DialogFooter>
                        ) : (
                            <DialogFooter className="!flex-row justify-between items-center">
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
                        )}
                    </form>
                </DialogContent>
            </Dialog>
    );
}