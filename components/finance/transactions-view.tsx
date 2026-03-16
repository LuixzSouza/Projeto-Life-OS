"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
    Search, ArrowLeft, Receipt, ArrowDownRight, 
    ArrowUpRight, CalendarDays, Filter, Wallet, BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TransactionDialog } from "@/components/finance/transaction-dialog";
import { cn } from "@/lib/utils";

// --- TIPAGENS ---
interface AccountOption { id: string; name: string; }
interface TransactionData { 
    id: string; 
    description: string; 
    amount: number; 
    date: Date; 
    type: string; 
    category: string; 
    account?: { name: string }; 
    accountId: string;
}

interface TransactionsViewProps {
    transactions: TransactionData[];
    accounts: AccountOption[];
}

const formatMoney = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

// --- COMPONENTE PRINCIPAL ---
export function TransactionsView({ transactions, accounts }: TransactionsViewProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [accountFilter, setAccountFilter] = useState("ALL");

    // 1. FILTRAGEM DINÂMICA
    const filteredTransactions = useMemo(() => {
        return transactions.filter((t) => {
            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  t.category.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = typeFilter === "ALL" || t.type === typeFilter;
            const matchesAccount = accountFilter === "ALL" || t.accountId === accountFilter;
            
            return matchesSearch && matchesType && matchesAccount;
        });
    }, [transactions, searchTerm, typeFilter, accountFilter]);

    // 2. CÁLCULO DOS RESUMOS (Cards do Topo)
    const summary = useMemo(() => {
        let income = 0;
        let expense = 0;
        filteredTransactions.forEach(t => {
            if (t.type === "INCOME") income += t.amount;
            else expense += t.amount;
        });
        return { income, expense, balance: income - expense };
    }, [filteredTransactions]);

    // 3. AGRUPAMENTO POR MÊS PARA O GRÁFICO (Últimos 6 meses visíveis)
    const monthlyStats = useMemo(() => {
        const stats: Record<string, { month: string, income: number, expense: number, timestamp: number }> = {};
        
        filteredTransactions.forEach(t => {
            const date = new Date(t.date);
            date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
            
            // Ex: "fev/26"
            const monthStr = format(date, "MMM/yy", { locale: ptBR }).replace('.', ''); 
            
            if (!stats[monthStr]) {
                stats[monthStr] = { month: monthStr, income: 0, expense: 0, timestamp: date.getTime() };
            }

            if (t.type === "INCOME") stats[monthStr].income += t.amount;
            else stats[monthStr].expense += t.amount;
        });

        // Ordena do mais antigo pro mais novo e pega os últimos 6
        return Object.values(stats)
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-6); 
    }, [filteredTransactions]);

    // Calcula o teto do gráfico para escalonar as barras perfeitamente
    const maxChartValue = Math.max(...monthlyStats.flatMap(m => [m.income, m.expense]), 100);

    return (
        <div className="min-h-screen bg-background relative overflow-hidden animate-in fade-in duration-700 pb-24">
            
            {/* Background Glows (Premium Feel) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

            <div className="max-w-[1200px] mx-auto px-6 md:px-8 pt-10 space-y-8">
                
                {/* HEADER DA PÁGINA */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Link href="/finance">
                            <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-border/50 hover:bg-muted transition-all active:scale-95 shadow-sm">
                                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                                Inteligência Financeira
                            </h1>
                            <p className="text-muted-foreground text-xs sm:text-sm mt-1 font-bold uppercase tracking-widest">
                                Analise e filtre seu histórico
                            </p>
                        </div>
                    </div>
                    <TransactionDialog accounts={accounts} />
                </div>

                {/* SESSÃO DE ANALYTICS (NOVO) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                    
                    {/* Resumo Dinâmico */}
                    <div className="lg:col-span-1 flex flex-col gap-4">
                        <div className="bg-card rounded-[2rem] p-6 border border-border/40 shadow-sm flex-1 flex flex-col justify-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                                <Filter className="h-3.5 w-3.5" /> Visão do Filtro Atual
                            </p>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-border/40 pb-3">
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <ArrowUpRight className="h-4 w-4" />
                                        <span className="text-sm font-bold">Entradas</span>
                                    </div>
                                    <span className="font-mono font-black text-lg text-emerald-600">{formatMoney(summary.income)}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-border/40 pb-3">
                                    <div className="flex items-center gap-2 text-foreground/70">
                                        <ArrowDownRight className="h-4 w-4" />
                                        <span className="text-sm font-bold">Saídas</span>
                                    </div>
                                    <span className="font-mono font-black text-lg text-foreground">{formatMoney(summary.expense)}</span>
                                </div>
                                <div className="flex justify-between items-end pt-1">
                                    <span className="text-sm font-extrabold uppercase tracking-wider">Balanço</span>
                                    <span className={cn("font-mono font-black text-2xl tracking-tighter", summary.balance < 0 ? "text-rose-500" : "text-foreground")}>
                                        {summary.balance > 0 ? "+" : ""}{formatMoney(summary.balance)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gráfico de Barras Customizado */}
                    <div className="lg:col-span-2 bg-card rounded-[2rem] p-6 border border-border/40 shadow-sm flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-sm font-extrabold flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-primary" /> Fluxo Mensal
                                </h3>
                                <p className="text-xs text-muted-foreground font-medium mt-1">Comparativo de receitas e despesas</p>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /> Receitas</span>
                                <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-foreground" /> Despesas</span>
                            </div>
                        </div>

                        {/* A Mágica do Gráfico Flexbox */}
                        <div className="flex-1 flex items-end justify-between gap-2 sm:gap-6 min-h-[160px] relative">
                            {/* Linhas de grade de fundo */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                                <div className="w-full h-px bg-foreground" />
                                <div className="w-full h-px bg-foreground" />
                                <div className="w-full h-px bg-foreground" />
                                <div className="w-full h-px bg-foreground" />
                            </div>

                            {monthlyStats.length > 0 ? monthlyStats.map((stat, i) => {
                                const incomeHeight = `${(stat.income / maxChartValue) * 100}%`;
                                const expenseHeight = `${(stat.expense / maxChartValue) * 100}%`;

                                return (
                                    <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 group relative z-10 h-full">
                                        <div className="w-full max-w-[40px] flex items-end justify-center gap-1 sm:gap-2 h-full">
                                            
                                            {/* Barra Verde (Entrada) */}
                                            <div className="w-1/2 bg-emerald-500 rounded-t-md transition-all duration-700 ease-out hover:opacity-80 relative" style={{ height: incomeHeight }}>
                                                {/* Tooltip ao passar o mouse */}
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                                    + {formatMoney(stat.income)}
                                                </div>
                                            </div>
                                            
                                            {/* Barra Escura (Saída) */}
                                            <div className="w-1/2 bg-foreground rounded-t-md transition-all duration-700 ease-out hover:opacity-80 relative" style={{ height: expenseHeight }}>
                                                {/* Tooltip ao passar o mouse */}
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                                    - {formatMoney(stat.expense)}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Rótulo do Mês */}
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-2">
                                            {stat.month}
                                        </span>
                                    </div>
                                )
                            }) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-sm font-bold text-muted-foreground">Sem dados para exibir.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* BARRA DE FILTROS E BUSCA */}
                <div className="bg-card p-4 sm:p-5 rounded-[2rem] border border-border/40 shadow-sm flex flex-col sm:flex-row gap-4 relative z-10">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                        <Input 
                            placeholder="Buscar transação ou categoria..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-12 rounded-xl bg-muted/20 border-border/50 focus-visible:ring-primary/30 font-medium text-base shadow-inner"
                        />
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="h-12 rounded-xl bg-muted/20 font-bold border-border/50 w-full sm:w-[160px] shadow-sm">
                                <div className="flex items-center">
                                    <Filter className="h-4 w-4 mr-2 text-muted-foreground/70" />
                                    <SelectValue placeholder="Tipo" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl font-medium">
                                <SelectItem value="ALL">Todas</SelectItem>
                                <SelectItem value="INCOME">Receitas</SelectItem>
                                <SelectItem value="EXPENSE">Despesas</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={accountFilter} onValueChange={setAccountFilter}>
                            <SelectTrigger className="h-12 rounded-xl bg-muted/20 font-bold border-border/50 w-full sm:w-[180px] shadow-sm">
                                <SelectValue placeholder="Carteira" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl font-medium">
                                <SelectItem value="ALL">Todas as Contas</SelectItem>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* LISTA DE TRANSAÇÕES */}
                <div className="bg-card rounded-[2rem] border border-border/40 shadow-sm overflow-hidden relative z-10">
                    <div className="p-6 border-b border-border/40 bg-muted/10 flex items-center justify-between">
                        <h3 className="font-extrabold text-lg text-foreground flex items-center gap-3">
                            <div className="p-2 bg-background rounded-lg shadow-sm border border-border/50">
                                <Receipt className="h-5 w-5 text-primary" />
                            </div>
                            Lista Detalhada
                        </h3>
                        <Badge variant="secondary" className="rounded-lg font-black tracking-widest uppercase bg-background shadow-sm border-border/50 text-muted-foreground px-3 py-1.5">
                            {filteredTransactions.length} registros
                        </Badge>
                    </div>

                    <div className="p-3 sm:p-5 bg-background">
                        {filteredTransactions.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {filteredTransactions.map((t) => {
                                    const isIncome = t.type === "INCOME";
                                    const date = new Date(t.date);
                                    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());

                                    return (
                                        <TransactionDialog 
                                            key={t.id}
                                            transaction={t} 
                                            accounts={accounts} 
                                            trigger={
                                                <div className="flex items-center justify-between p-3.5 sm:px-5 rounded-2xl hover:bg-muted/40 transition-all duration-200 cursor-pointer group border border-border/10 hover:border-border/50 active:scale-[0.98]">
                                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                                        
                                                        {/* Ícone de Entrada/Saída */}
                                                        <div className={cn(
                                                            "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border",
                                                            isIncome ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-muted border-border/60 text-muted-foreground"
                                                        )}>
                                                            {isIncome ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6 opacity-70" />}
                                                        </div>
                                                        
                                                        {/* Dados da Transação */}
                                                        <div className="space-y-1 min-w-0 flex-1 pr-2">
                                                            <p className="text-sm sm:text-base font-extrabold text-foreground truncate leading-none group-hover:text-primary transition-colors">
                                                                {t.description}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/50 shrink-0">
                                                                    <CalendarDays className="h-3 w-3" /> 
                                                                    {format(date, "dd MMM yyyy", { locale: ptBR })}
                                                                </span>
                                                                {t.category && (
                                                                    <Badge variant="secondary" className="text-[9px] px-2 py-0.5 uppercase tracking-widest font-black bg-primary/5 text-primary border-none truncate max-w-[120px]">
                                                                        {t.category}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Valor e Carteira */}
                                                    <div className="text-right shrink-0 pl-3">
                                                        <p className={cn(
                                                            "text-base sm:text-lg font-black font-mono tracking-tighter",
                                                            isIncome ? "text-emerald-600" : "text-foreground"
                                                        )}>
                                                            {isIncome ? "+" : "-"} {formatMoney(t.amount)}
                                                        </p>
                                                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5 truncate max-w-[100px] ml-auto">
                                                            {t.account?.name || "Carteira"}
                                                        </p>
                                                    </div>
                                                </div>
                                            }
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-24 flex flex-col items-center justify-center">
                                <EmptyState 
                                    icon={Receipt} 
                                    title="Nenhuma transação encontrada" 
                                    description="Tente ajustar os filtros de busca ou limpe-os para visualizar o histórico." 
                                    className="border-none bg-transparent shadow-none"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}