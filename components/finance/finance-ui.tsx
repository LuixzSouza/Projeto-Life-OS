"use client";

import { 
    ArrowDownRight, 
    ArrowUpRight, 
    CalendarDays, 
    CreditCard, 
    MoreHorizontal, 
    Receipt, 
    CalendarClock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionDialog } from "./transaction-dialog";
import { RecurringDialog, RecurringItemData } from "./recurring-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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

// ✅ CORREÇÃO: Agora a lista recebe as contas (accounts)
export function TransactionList({ transactions, accounts = [] }: { transactions: TransactionItemData[], accounts?: AccountOption[] }) {
    if (transactions.length === 0) return null;

    return (
        <ScrollArea className="h-full">
            <div className="flex flex-col p-2 gap-1">
                {transactions.map((t) => (
                    // ✅ CORREÇÃO: Repassando as contas para cada item
                    <TransactionItemWrapper key={t.id} transaction={t} accounts={accounts} />
                ))}
            </div>
        </ScrollArea>
    );
}

// ✅ CORREÇÃO: O Wrapper agora aceita as contas e envia para o Dialog
function TransactionItemWrapper({ transaction, accounts }: { transaction: TransactionItemData, accounts: AccountOption[] }) {
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
                            isIncome ? "text-emerald-600" : "text-foreground"
                        )}>
                            {isIncome ? "+" : "-"} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
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

export function RecurringCard({ total, items }: { total: number, items: RecurringItemData[] }) {
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
                    <h3 className="text-3xl font-black text-foreground tracking-tighter">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                    </h3>
                </div>
                
                {/* Botão de Ação / Opções */}
                <div className="relative z-10">
                    <RecurringDialog 
                        trigger={
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors">
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
                                    <CalendarClock className="h-3 w-3" /> Dia {item.dayOfMonth.toString().padStart(2, '0')}
                                </span>
                                <span className="text-border">•</span>
                                <span className="truncate">{item.category}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Valor Mensal */}
                    <span className="text-sm sm:text-base font-bold font-mono tracking-tight text-foreground shrink-0 pl-3">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                    </span>
                </div>
            }
        />
    );
}