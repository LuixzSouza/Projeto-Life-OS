"use client";

import { useState } from "react";
import {
    ArrowDownRight,
    ArrowUpRight,
    CalendarDays,
    CreditCard,
    MoreHorizontal,
    Receipt,
    CalendarClock,
    Wallet,
    Check,
    Undo2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionDialog } from "./transaction-dialog";
import { RecurringDialog, RecurringItemData } from "./recurring-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { useSmartView } from "@/components/finance/smart-view-context";
import { asFrequency, nextOccurrence, FREQUENCY_LABEL } from "@/lib/recurrence";
import { payRecurringExpense, undoRecurringExpensePayment } from "@/app/(dashboard)/finance/actions";

// Conta de destino para lançar o pagamento de um custo fixo.
export interface PayAccountOption { id: string; name: string; color: string | null; isConnected: boolean; }

// --- INTERFACES PARA TRANSAÇÕES ---
export interface AccountOption { 
    id: string; 
    name: string; 
}

export interface TransactionItemData {
    id: string;
    description: string;
    amount: number;
    type: string;
    category: string;
    date: Date | string;
    account?: { name: string };
    accountId: string; 
}

// --- HELPER DE MARCAS ---
const getBrandIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('spotify')) return "https://www.google.com/s2/favicons?domain=spotify.com&sz=64";
    if (n.includes('netflix')) return "https://www.google.com/s2/favicons?domain=netflix.com&sz=64";
    if (n.includes('amazon') || n.includes('prime')) return "https://www.google.com/s2/favicons?domain=amazon.com&sz=64";
    if (n.includes('youtube')) return "https://www.google.com/s2/favicons?domain=youtube.com&sz=64";
    if (n.includes('adobe')) return "https://www.google.com/s2/favicons?domain=adobe.com&sz=64";
    if (n.includes('uber')) return "https://www.google.com/s2/favicons?domain=uber.com&sz=64";
    if (n.includes('ifood')) return "https://www.google.com/s2/favicons?domain=ifood.com.br&sz=64";
    if (n.includes('apple')) return "https://www.google.com/s2/favicons?domain=apple.com&sz=64";
    if (n.includes('chatgpt') || n.includes('openai')) return "https://www.google.com/s2/favicons?domain=openai.com&sz=64";
    return null;
}

// --- LISTA DE TRANSAÇÕES ---

// Compensa o fuso para agrupar/exibir no dia correto (mesmo critério do item)
function localDate(raw: Date | string) {
    const d = new Date(raw);
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
    return d;
}

function dayLabel(d: Date) {
    if (isToday(d)) return "Hoje";
    if (isYesterday(d)) return "Ontem";
    const label = format(d, "EEEE, dd 'de' MMMM", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

// ✅ Agrupa as transações por dia, com cabeçalho e saldo do dia
export function TransactionList({ transactions, accounts = [] }: { transactions: TransactionItemData[], accounts?: AccountOption[] }) {
    const { smartView } = useSmartView();
    const moneyShort = useFormatCurrency();
    if (transactions.length === 0) return null;

    const groups: { key: string; label: string; net: number; items: TransactionItemData[] }[] = [];
    const byKey = new Map<string, (typeof groups)[number]>();

    for (const t of transactions) {
        const d = localDate(t.date);
        const key = d.toDateString();
        let g = byKey.get(key);
        if (!g) {
            g = { key, label: dayLabel(d), net: 0, items: [] };
            byKey.set(key, g);
            groups.push(g);
        }
        g.items.push(t);
        g.net += t.type === "INCOME" ? t.amount : -t.amount;
    }

    return (
        <ScrollArea className="h-full">
            <div className="flex flex-col p-2">
                {groups.map((g) => (
                    <div key={g.key} className="mb-1">
                        {/* Cabeçalho do dia */}
                        <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 bg-card/95 backdrop-blur-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                {g.label}
                            </span>
                            <span
                                className={cn(
                                    "text-[10px] font-black font-mono tracking-tight tabular-nums",
                                    g.net > 0 ? "text-emerald-600" : g.net < 0 ? "text-rose-500" : "text-muted-foreground",
                                    smartView && "blur-sm select-none"
                                )}
                            >
                                {g.net > 0 ? "+" : g.net < 0 ? "−" : ""}{moneyShort(Math.abs(g.net))}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            {g.items.map((t) => (
                                <TransactionItemWrapper key={t.id} transaction={t} accounts={accounts} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}

// ✅ CORREÇÃO: O Wrapper agora aceita as contas e envia para o Dialog
function TransactionItemWrapper({ transaction, accounts }: { transaction: TransactionItemData, accounts: AccountOption[] }) {
    const { smartView } = useSmartView();
    const moneyShort = useFormatCurrency();
    const isIncome = transaction.type === "INCOME";
    const date = new Date(transaction.date);
    // Compensa o fuso se necessário
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());

    return (
        <TransactionDialog 
            transaction={{...transaction, accountId: transaction.accountId, date: new Date(transaction.date)}} 
            accounts={accounts} // ✅ CORREÇÃO APLICADA AQUI!
            trigger={
                <div className="flex items-center justify-between p-3 sm:px-4 rounded-xl hover:bg-muted/50 transition-all cursor-pointer group border border-transparent hover:border-border/50">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        
                        {/* ÍCONE DE ENTRADA/SAÍDA */}
                        <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border",
                            isIncome 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" 
                                : "bg-background border-border/60 text-foreground/70"
                        )}>
                            {isIncome ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6 opacity-70" />}
                        </div>
                        
                        {/* DADOS DA TRANSAÇÃO */}
                        <div className="space-y-1 min-w-0 flex-1 pr-2">
                            <p className="text-sm sm:text-base font-bold text-foreground truncate leading-none">
                                {transaction.description}
                            </p>
                            
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/50 shrink-0">
                                    <CalendarDays className="h-3 w-3" /> 
                                    {format(date, "dd MMM", { locale: ptBR })}
                                </span>
                                
                                {transaction.category && (
                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 uppercase tracking-wider font-bold bg-primary/5 text-primary border-none truncate max-w-[100px]">
                                        {transaction.category}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* VALOR E CARTEIRA */}
                    <div className="text-right shrink-0 pl-2">
                        <p className={cn(
                            "text-sm sm:text-base font-bold font-mono tracking-tight",
                            isIncome ? "text-emerald-600" : "text-foreground",
                            smartView && "blur-sm select-none"
                        )}>
                            {isIncome ? "+" : "-"} {moneyShort(transaction.amount)}
                        </p>
                        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 truncate max-w-[90px] ml-auto">
                            {transaction.account?.name || "Carteira"}
                        </p>
                    </div>
                </div>
            }
        />
    );
}

// --- CARD DE CUSTOS FIXOS ---

export function RecurringCard({ total, items, accounts = [] }: { total: number, items: RecurringItemData[], accounts?: PayAccountOption[] }) {
    const { smartView } = useSmartView();
    const moneyShort = useFormatCurrency();
    const [payTarget, setPayTarget] = useState<RecurringItemData | null>(null);
    return (
        <div className="bg-card rounded-[1.5rem] border border-border/60 shadow-sm flex flex-col h-[500px] overflow-hidden transition-all hover:shadow-md">
            
            {/* Header do Card */}
            <div className="p-6 border-b border-border/40 flex justify-between items-start bg-gradient-to-br from-muted/30 to-background relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-5 pointer-events-none translate-x-1/4 -translate-y-1/4">
                    <Receipt className="w-32 h-32" />
                </div>

                <div className="relative z-10">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">
                        Custo Mensal Fixo
                    </p>
                    <h3 className={cn("text-3xl font-black text-foreground tracking-tighter", smartView && "blur-md select-none")}>
                        {moneyShort(total)}
                    </h3>
                    <p className="text-[11px] font-bold text-muted-foreground mt-1">
                        ≈ <span className={cn(smartView && "blur-sm select-none")}>{moneyShort(total * 12)}</span> por ano · {items.length} {items.length === 1 ? "assinatura" : "assinaturas"}
                    </p>
                </div>
                
                {/* Botão de Ação / Opções */}
                <div className="relative z-10">
                    <RecurringDialog 
                        trigger={
                            <Button size="icon" variant="ghost" aria-label="Custos fixos" className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors">
                                <MoreHorizontal className="h-5 w-5" />
                            </Button>
                        } 
                    />
                </div>
            </div>

            {/* Lista de Assinaturas/Contas com Scroll */}
            <ScrollArea className="flex-1 p-3">
                <div className="space-y-1.5">
                    {items.map((item) => (
                        <RecurringItemWrapper key={item.id} item={item} onPay={setPayTarget} />
                    ))}
                </div>
            </ScrollArea>

            {/* Modal único de pagamento (nunca dentro do .map) */}
            <RecurringPayModal key={payTarget?.id ?? "none"} item={payTarget} accounts={accounts} onClose={() => setPayTarget(null)} />
        </div>
    );
}

function RecurringItemWrapper({ item, onPay }: { item: RecurringItemData, onPay: (item: RecurringItemData) => void }) {
    const { smartView } = useSmartView();
    const moneyShort = useFormatCurrency();
    const logo = getBrandIcon(item.title);

    const freq = asFrequency(item.frequency);
    const next = nextOccurrence(item);
    const ended = next === null;
    const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
    const days = next ? Math.floor((next.getTime() - todayMid.getTime()) / 86_400_000) : null;
    const dueLabel = ended ? "Encerrada" : days === 0 ? "Hoje" : days === 1 ? "Amanhã" : `em ${days}d`;
    const isSoon = !ended && days !== null && days <= 3;

    const showPay = !ended && !!item.currentDueDate;
    const isPaid = !!item.currentPaid;

    async function handleUndo() {
        const fd = new FormData();
        fd.set("recurringExpenseId", item.id);
        fd.set("dueDate", item.currentDueDate || "");
        const res = await undoRecurringExpensePayment(fd);
        if (res.success) toast.success(res.message); else toast.error(res.message);
    }

    return (
        <div className={cn("rounded-xl transition-all", ended && "opacity-60")}>
        <RecurringDialog
            item={item}
            trigger={
                <div className="flex items-center justify-between p-3 hover:bg-muted/40 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-border/50">

                    <div className="flex items-center gap-3.5 min-w-0">
                        {/* Ícone da Marca ou Ícone Genérico */}
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-background border border-border/60 shadow-sm flex items-center justify-center text-muted-foreground group-hover:border-primary/30 transition-colors shrink-0 overflow-hidden p-2">
                            {logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={logo} className="w-full h-full object-contain" alt="icon" />
                            ) : (
                                <CreditCard className="h-5 w-5 opacity-50" />
                            )}
                        </div>

                        {/* Detalhes da Conta */}
                        <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-bold text-foreground truncate pr-2 group-hover:text-primary transition-colors">
                                {item.title}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground font-medium">
                                <span className="flex items-center gap-1 text-orange-500/80">
                                    <CalendarClock className="h-3 w-3" /> {item.installments ? `${item.installments}x` : FREQUENCY_LABEL[freq]}
                                </span>
                                <span className="text-border">•</span>
                                <span className="truncate">{item.category}</span>
                            </div>
                        </div>
                    </div>

                    {/* Valor + próxima ocorrência */}
                    <div className="flex flex-col items-end shrink-0 pl-3 gap-1">
                        <span className={cn("text-sm sm:text-base font-bold font-mono tracking-tight text-foreground", smartView && "blur-sm select-none")}>
                            {moneyShort(item.amount)}
                        </span>
                        <span
                            className={cn(
                                "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border",
                                ended
                                    ? "bg-muted text-muted-foreground border-border/50"
                                    : isSoon
                                        ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                                        : "bg-muted/50 text-muted-foreground border-border/50"
                            )}
                        >
                            {dueLabel}
                        </span>
                    </div>
                </div>
            }
        />

        {/* Ação de pagamento da ocorrência atual (espelho do "Recebi" das faturas) */}
        {showPay && (
            <div className="px-3 pb-2 -mt-0.5 flex justify-end">
                {isPaid ? (
                    <button
                        type="button"
                        onClick={handleUndo}
                        className="group/undo inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors"
                    >
                        <Check className="h-3 w-3 group-hover/undo:hidden" />
                        <Undo2 className="h-3 w-3 hidden group-hover/undo:block" />
                        <span className="group-hover/undo:hidden">Pago este mês</span>
                        <span className="hidden group-hover/undo:block">Desfazer</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => onPay(item)}
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 border border-orange-500/20 hover:bg-orange-500/15 active:scale-95 transition-all"
                    >
                        <Wallet className="h-3 w-3" /> Paguei
                    </button>
                )}
            </div>
        )}
        </div>
    );
}

// --- MODAL DE PAGAMENTO DE CUSTO FIXO (lança a despesa real na conta escolhida) ---

function RecurringPayModal({ item, accounts, onClose }: { item: RecurringItemData | null; accounts: PayAccountOption[]; onClose: () => void }) {
    const formatCurrency = useFormatCurrency();
    // Pré-seleciona a primeira conta não automática (Pluggy sincroniza sozinho).
    const [accountId, setAccountId] = useState<string>(
        () => (accounts.find((a) => !a.isConnected) || accounts[0])?.id || ""
    );
    const hasAccounts = accounts.length > 0;

    return (
        <Dialog open={!!item} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent size="md">
                <DialogHeader
                    icon={<Wallet className="h-5 w-5" />}
                    iconClassName="bg-orange-500/10 text-orange-600 border-orange-500/20"
                    title="Registrar Pagamento"
                    description={<>A saída de <strong className="text-orange-600">{item ? formatCurrency(item.amount) : ""}</strong> será lançada como despesa na conta escolhida.</>}
                />

                {hasAccounts ? (
                    <form action={async (fd) => {
                        fd.set("recurringExpenseId", item?.id || "");
                        fd.set("accountId", accountId);
                        fd.set("dueDate", item?.currentDueDate || "");
                        const res = await payRecurringExpense(fd);
                        if (res.success) { toast.success(res.message); onClose(); }
                        else toast.error(res.message);
                    }} className="flex flex-col flex-1 min-h-0">
                        <DialogBody className="space-y-5">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Conta de Origem</Label>
                                <Select value={accountId} onValueChange={setAccountId}>
                                    <SelectTrigger className="rounded-xl h-12 bg-muted/20">
                                        <SelectValue placeholder="Selecione a conta..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl z-[100]">
                                        {accounts.map((acc) => (
                                            <SelectItem key={acc.id} value={acc.id}>
                                                <span className="flex items-center gap-2">
                                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: acc.color || "#6366f1" }} />
                                                    {acc.name}{acc.isConnected ? " (automática)" : ""}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </DialogBody>
                        <DialogFooter>
                            <Button type="button" variant="ghost" className="rounded-xl" onClick={onClose}>Cancelar</Button>
                            <SubmitButton className="rounded-xl px-8 font-bold bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20">
                                Confirmar Pagamento
                            </SubmitButton>
                        </DialogFooter>
                    </form>
                ) : (
                    <>
                        <DialogBody>
                            <p className="text-sm text-muted-foreground">
                                Você ainda não tem nenhuma conta cadastrada. Crie uma conta no Financeiro para registrar pagamentos.
                            </p>
                        </DialogBody>
                        <DialogFooter>
                            <Button type="button" variant="ghost" className="rounded-xl" onClick={onClose}>Fechar</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}