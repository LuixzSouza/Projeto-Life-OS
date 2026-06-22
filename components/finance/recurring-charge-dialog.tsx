"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, HandCoins, Trash2, AlertCircle, DollarSign } from "lucide-react";
import Link from "next/link";
import { createRecurringCharge, updateRecurringCharge, deleteRecurringCharge } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { FREQUENCIES, FREQUENCY_LABEL, asFrequency } from "@/lib/recurrence";
import { cn } from "@/lib/utils";

export interface RecurringChargeData {
    id: string;
    title: string;
    amount: number;
    dayOfMonth: number;
    category: string;
    clientId: string | null;
    clientName: string | null;
    frequency?: string;
    startDate?: string | null;
    endDate?: string | null;
    installments?: number | null;
    paidInstallments?: number;
}

export interface ClientOption { id: string; name: string; company: string | null; }

interface RecurringChargeDialogProps {
    trigger?: React.ReactNode;
    item?: RecurringChargeData;
    clients: ClientOption[];
}

const toDateInput = (v: string | null | undefined): string => (v ? new Date(v).toISOString().slice(0, 10) : "");
const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function RecurringChargeDialog({ trigger, item, clients }: RecurringChargeDialogProps) {
    const [open, setOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
    const [frequency, setFrequency] = useState<string>(asFrequency(item?.frequency));

    // Modo: recorrente (sem fim) × parcelado (N parcelas, fim calculado).
    const [installmentMode, setInstallmentMode] = useState<boolean>(!!item?.installments);
    const [installments, setInstallments] = useState<string>(item?.installments ? String(item.installments) : "10");
    const [paid, setPaid] = useState<string>(item?.paidInstallments ? String(item.paidInstallments) : "0");

    // --- amount: centavos como string ("100" => R$1,00). No modo parcelado é o VALOR TOTAL.
    const [amountDigits, setAmountDigits] = useState<string>(() => {
        if (item?.amount === undefined || item?.amount === null) return "";
        const base = item.installments ? Number(item.amount) * item.installments : Number(item.amount);
        return String(Math.round(base * 100));
    });

    const rawAmount: string = amountDigits ? (Number(amountDigits) / 100).toFixed(2) : "";
    // Valor por parcela (preview) quando parcelado.
    const installmentsNum = Math.max(1, parseInt(installments || "0", 10) || 0);
    const perInstallment = installmentMode && installmentsNum > 0 ? Number(rawAmount) / installmentsNum : null;
    const formattedAmount: string = amountDigits
        ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(rawAmount))
        : "";

    const amountRef = useRef<HTMLInputElement | null>(null);

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
        setAmountDigits(onlyDigits.slice(0, 12));
    };

    const handleAmountPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData("text");
        const onlyDigits = text.replace(/\D/g, "");
        if (!onlyDigits) { e.preventDefault(); return; }
        e.preventDefault();
        setAmountDigits(onlyDigits.slice(0, 12));
    };

    const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"];
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
                await updateRecurringCharge(formData);
                toast.success("Cobrança atualizada!");
            } else {
                await createRecurringCharge(formData);
                toast.success("Cobrança recorrente criada!");
            }
            setOpen(false);
        } catch (err) {
            console.error(err);
            toast.error("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!item) return;
        setIsLoading(true);
        try {
            await deleteRecurringCharge(item.id);
            toast.success("Cobrança removida.");
            setIsDeleteDialogOpen(false);
            setOpen(false);
        } catch (err) {
            console.error(err);
            toast.error("Erro ao excluir.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {trigger ? trigger : (
                        <Button variant="ghost" size="icon" aria-label="Nova cobrança recorrente" className="h-8 w-8 text-muted-foreground hover:text-emerald-600 rounded-lg transition-colors">
                            <Plus className="h-5 w-5" />
                        </Button>
                    )}
                </DialogTrigger>

                <DialogContent size="md">
                    <DialogHeader
                        icon={<HandCoins />}
                        iconClassName="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        title={item ? "Editar Cobrança" : "Nova Cobrança Recorrente"}
                        description="Receitas a receber todo mês (ex.: mensalidade de cliente)."
                    />

                    <form action={handleSubmit} className="flex flex-col flex-1 min-h-0" noValidate>
                        <DialogBody className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">O que será cobrado</Label>
                                <Input name="title" placeholder="Ex: Mensalidade do site, Consultoria..." defaultValue={item?.title} required className="h-12 rounded-xl bg-muted/20 font-medium" />
                            </div>

                            {/* Modo: recorrente (sem fim) × parcelado (Nx, fim calculado) */}
                            <div className="flex gap-1 p-1 bg-muted/40 rounded-xl border border-border/50">
                                <button type="button" onClick={() => setInstallmentMode(false)} className={cn("flex-1 h-9 rounded-lg text-xs font-bold transition-all", !installmentMode ? "bg-background shadow-sm text-emerald-600" : "text-muted-foreground hover:text-foreground")}>Recorrente</button>
                                <button type="button" onClick={() => setInstallmentMode(true)} className={cn("flex-1 h-9 rounded-lg text-xs font-bold transition-all", installmentMode ? "bg-background shadow-sm text-emerald-600" : "text-muted-foreground hover:text-foreground")}>Parcelado</button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{installmentMode ? "Valor total" : "Valor"}</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
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
                                        <input type="hidden" name="amount" value={rawAmount} />
                                    </div>
                                    {installmentMode && perInstallment !== null && installmentsNum > 0 && (
                                        <p className="text-[11px] text-muted-foreground px-1">{installmentsNum}× de <span className="font-bold text-emerald-600">{fmtBRL(perInstallment)}</span></p>
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
                                            Próxima cobrança (parcela {Math.min((parseInt(paid || "0", 10) || 0) + 1, installmentsNum)}/{installmentsNum})
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
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Dia da Cobrança</Label>
                                            <Input name="dayOfMonth" type="number" min="1" max="31" placeholder="Dia (1-31)" defaultValue={item?.dayOfMonth} required className="h-12 rounded-xl bg-muted/20 font-mono font-bold" />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">1ª Cobrança</Label>
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
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cliente (Negócios)</Label>
                                {clients.length > 0 ? (
                                    <Select name="clientId" defaultValue={item?.clientId ?? "none"}>
                                        <SelectTrigger className="h-12 rounded-xl bg-muted/20 font-medium"><SelectValue placeholder="Sem cliente (avulso)" /></SelectTrigger>
                                        <SelectContent className="rounded-xl z-[9999]">
                                            <SelectItem value="none">Sem cliente (avulso)</SelectItem>
                                            {clients.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name}{c.company ? ` · ${c.company}` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-xs text-muted-foreground px-1 py-2">
                                        Nenhum cliente cadastrado. Crie em{" "}
                                        <Link href="/business" className="text-primary underline font-medium">Negócios</Link>{" "}
                                        para vincular e gerar faturas.
                                    </p>
                                )}
                                <p className="text-[11px] text-muted-foreground/80 px-1">
                                    Vincular um cliente conecta a cobrança às suas Conexões e gera a fatura no Negócios ao vencer.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Categoria</Label>
                                <Select name="category" defaultValue={item?.category || "Cobrança"}>
                                    <SelectTrigger className="h-12 rounded-xl bg-muted/20 font-medium"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl z-[9999]">
                                        <SelectItem value="Cobrança">💰 Cobrança</SelectItem>
                                        <SelectItem value="Mensalidade">🔁 Mensalidade</SelectItem>
                                        <SelectItem value="Serviço">🛠️ Serviço</SelectItem>
                                        <SelectItem value="Aluguel">🏠 Aluguel</SelectItem>
                                        <SelectItem value="Outros">📦 Outros</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </DialogBody>

                        <DialogFooter className="!flex-row justify-between items-center">
                            {item ? (
                                <Button type="button" variant="ghost" className="text-rose-600 hover:bg-rose-500/10 rounded-xl font-bold px-4" onClick={() => setIsDeleteDialogOpen(true)} disabled={isLoading}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                </Button>
                            ) : <div />}

                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" className="rounded-xl font-bold" onClick={() => setOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 min-w-[120px]">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (item ? "Salvar" : "Criar")}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-[2rem] border-destructive/20 shadow-2xl">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 text-destructive mb-2">
                            <div className="p-3 rounded-2xl bg-destructive/10"><AlertCircle className="h-6 w-6" /></div>
                            <AlertDialogTitle className="text-xl font-bold">Remover Cobrança?</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-base text-muted-foreground">
                            Você deixará de ser lembrado desta cobrança mensal.
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
