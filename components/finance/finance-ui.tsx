"use client";

import { ArrowDownCircle, ArrowUpCircle, Calendar, CreditCard, MoreHorizontal, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionDialog } from "./transaction-dialog";
import { RecurringDialog, RecurringItemData } from "./recurring-dialog"; // Importando a tipagem correta
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- INTERFACES PARA TRANSAÇÕES ---
// Definimos aqui ou importamos de dashboard se quiser compartilhar
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
    return null;
}

// --- LISTA DE TRANSAÇÕES ---

export function TransactionList({ transactions }: { transactions: TransactionItemData[] }) {
    if (transactions.length === 0) return null;

    return (
        <ScrollArea className="h-full">
            <div className="divide-y divide-border">
                {transactions.map((t) => (
                    <TransactionItemWrapper key={t.id} transaction={t} />
                ))}
            </div>
        </ScrollArea>
    );
}

function TransactionItemWrapper({ transaction }: { transaction: TransactionItemData }) {
    const isIncome = transaction.type === "INCOME";
    const date = new Date(transaction.date);

    return (
        <TransactionDialog 
            transaction={{...transaction, accountId: transaction.accountId, date: new Date(transaction.date)}} 
            accounts={[]} 
            trigger={
                <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center shrink-0 border",
                            isIncome 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" 
                                : "bg-red-500/10 border-red-500/20 text-red-600"
                        )}>
                            {isIncome ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                        </div>
                        
                        <div className="space-y-0.5 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate pr-2">{transaction.description}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1 shrink-0">
                                    <Calendar className="h-3 w-3" /> {format(date, "dd MMM", { locale: ptBR })}
                                </span>
                                {transaction.category && (
                                    <>
                                        <span className="text-border">•</span>
                                        <span className="px-1.5 py-0.5 rounded-md bg-muted border border-border truncate max-w-[100px]">
                                            {transaction.category}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                        <p className={cn(
                            "text-sm font-bold",
                            isIncome ? "text-emerald-600" : "text-foreground"
                        )}>
                            {isIncome ? "+" : "-"} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[80px] ml-auto">
                            {transaction.account?.name || "Carteira"}
                        </p>
                    </div>
                </div>
            }
        />
    );
}


// --- CARD DE CUSTOS FIXOS ---

export function RecurringCard({ total, items }: { total: number, items: RecurringItemData[] }) {
    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col h-[500px]">
            {/* Header */}
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/10 rounded-t-2xl">
                <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Mensalidade Total</p>
                    <h3 className="text-2xl font-bold text-destructive">
                        -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                    </h3>
                </div>
                {/* Botão de Adicionar Rápido */}
                <RecurringDialog 
                    trigger={
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <MoreHorizontal className="h-5 w-5" />
                        </Button>
                    } 
                />
            </div>

            {/* Lista com Scroll */}
            <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                    {items.map((item) => (
                        <RecurringItemWrapper key={item.id} item={item} />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

function RecurringItemWrapper({ item }: { item: RecurringItemData }) {
    const logo = getBrandIcon(item.title);

    return (
        <RecurringDialog 
            item={item} 
            trigger={
                <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-xl transition-colors cursor-pointer group border border-transparent hover:border-border">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                            {logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={logo} className="w-6 h-6 object-contain" alt="icon" />
                            ) : (
                                <CreditCard className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate pr-2">{item.title}</p>
                            <p className="text-xs text-muted-foreground">Dia {item.dayOfMonth} • {item.category}</p>
                        </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground shrink-0 pl-2">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                    </span>
                </div>
            }
        />
    );
}