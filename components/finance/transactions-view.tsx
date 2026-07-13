"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
    Search, Receipt, ArrowDownRight, ArrowUpRight, CalendarDays,
    Filter, BarChart3, ChevronLeft, ChevronRight, Loader2, Tags, X
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TransactionDialog } from "@/components/finance/transaction-dialog";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";

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
interface MonthlyStat { month: string; income: number; expense: number; timestamp: number; }
interface Filters { period: string; type: string; account: string; category: string; q: string; }

interface TransactionsViewProps {
    transactions: TransactionData[];
    accounts: AccountOption[];
    categories: string[];
    summary: { income: number; expense: number; balance: number };
    monthlyStats: MonthlyStat[];
    totalCount: number;
    page: number;
    totalPages: number;
    filters: Filters;
}

const PERIOD_LABELS: Record<string, string> = {
    "6m": "Últimos 6 meses",
    "12m": "Últimos 12 meses",
    "24m": "Últimos 24 meses",
    "all": "Todo o histórico",
};

/** Datas são salvas em T12:00:00Z — normaliza p/ exibir o dia certo no fuso local. */
function normalizeDate(value: Date): Date {
    const d = new Date(value);
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
    return d;
}

function dayLabel(d: Date): string {
    if (isToday(d)) return "Hoje";
    if (isYesterday(d)) return "Ontem";
    const label = format(d, "EEEE · dd 'de' MMMM", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

interface DayGroup { key: string; label: string; net: number; rows: TransactionData[]; }

// --- COMPONENTE PRINCIPAL ---
export function TransactionsView({
    transactions, accounts, categories, summary, monthlyStats, totalCount, page, totalPages, filters,
}: TransactionsViewProps) {
    const formatMoney = useFormatCurrency();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [searchInput, setSearchInput] = useState(filters.q);

    // Diálogo ÚNICO de edição (fora do .map() — regra do CLAUDE.md).
    // A key remonta o form quando outra transação é selecionada.
    const [dialogTx, setDialogTx] = useState<TransactionData | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const openTransaction = (t: TransactionData) => { setDialogTx(t); setDialogOpen(true); };

    // Atualiza um parâmetro na URL (o servidor re-busca). Filtros resetam a página.
    const updateParam = (key: string, value: string | undefined) => {
        const params = new URLSearchParams(searchParams.toString());
        if (!value || value === "ALL" || value === "") params.delete(key);
        else params.set(key, value);
        if (key !== "page") params.delete("page");
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        });
    };

    const hasActiveFilters =
        filters.period !== "12m" || filters.type !== "ALL" || filters.account !== "ALL" ||
        filters.category !== "ALL" || filters.q !== "";

    const clearFilters = () => {
        setSearchInput("");
        startTransition(() => { router.push(pathname, { scroll: false }); });
    };

    // Busca com debounce — evita um request por tecla.
    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchInput !== filters.q) updateParam("q", searchInput || undefined);
        }, 350);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput]);

    // Mantém o input em sincronia se a URL mudar por fora (ex.: voltar do navegador).
    useEffect(() => { setSearchInput(filters.q); }, [filters.q]);

    // Agrupa a página atual por dia (a lista já vem ordenada por data desc).
    const dayGroups = useMemo<DayGroup[]>(() => {
        const map = new Map<string, DayGroup>();
        for (const t of transactions) {
            const d = normalizeDate(t.date);
            const key = format(d, "yyyy-MM-dd");
            let group = map.get(key);
            if (!group) {
                group = { key, label: dayLabel(d), net: 0, rows: [] };
                map.set(key, group);
            }
            group.net += t.type === "INCOME" ? t.amount : -t.amount;
            group.rows.push(t);
        }
        return [...map.values()];
    }, [transactions]);

    const maxChartValue = Math.max(...monthlyStats.flatMap(m => [m.income, m.expense]), 100);

    return (
        <PageShell>
            <PageHeader
                icon={<Receipt className="h-6 w-6" />}
                title="Transações"
                description="Histórico completo — busque, filtre e edite qualquer lançamento."
                backHref="/finance"
                backLabel="Voltar para Finanças"
                actions={<TransactionDialog accounts={accounts} />}
            />

            <PageContainer className="space-y-6 pb-24">

                {/* ANALYTICS DO FILTRO ATUAL */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* Resumo Dinâmico */}
                    <div className="lg:col-span-1 rounded-2xl border border-border/40 bg-card p-6 shadow-sm flex flex-col justify-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                            <Filter className="h-3.5 w-3.5" /> {PERIOD_LABELS[filters.period] ?? "Período"}
                        </p>

                        <div className="space-y-4">
                            <div className="flex justify-between items-end border-b border-border/40 pb-3">
                                <div className="flex items-center gap-2 text-emerald-600">
                                    <ArrowUpRight className="h-4 w-4" />
                                    <span className="text-sm font-bold">Entradas</span>
                                </div>
                                <span className="font-mono font-black text-lg text-emerald-600 tabular-nums">{formatMoney(summary.income)}</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-border/40 pb-3">
                                <div className="flex items-center gap-2 text-rose-600">
                                    <ArrowDownRight className="h-4 w-4" />
                                    <span className="text-sm font-bold">Saídas</span>
                                </div>
                                <span className="font-mono font-black text-lg text-rose-600 tabular-nums">{formatMoney(summary.expense)}</span>
                            </div>
                            <div className="flex justify-between items-end pt-1">
                                <span className="text-sm font-extrabold uppercase tracking-wider">Balanço</span>
                                <span className={cn("font-mono font-black text-2xl tracking-tighter tabular-nums", summary.balance < 0 ? "text-rose-500" : "text-foreground")}>
                                    {summary.balance > 0 ? "+" : ""}{formatMoney(summary.balance)}
                                </span>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-1">
                                {totalCount} lançamento(s) no filtro atual
                            </p>
                        </div>
                    </div>

                    {/* Gráfico de Barras (últimos 6 meses do filtro) */}
                    <div className="lg:col-span-2 rounded-2xl border border-border/40 bg-card p-6 shadow-sm flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-sm font-extrabold flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-primary" /> Fluxo Mensal
                                </h3>
                                <p className="text-xs text-muted-foreground font-medium mt-1">Receitas × despesas dos últimos 6 meses</p>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /> Receitas</span>
                                <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-rose-500" /> Despesas</span>
                            </div>
                        </div>

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
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                                    + {formatMoney(stat.income)}
                                                </div>
                                            </div>

                                            {/* Barra Rosa (Saída) */}
                                            <div className="w-1/2 bg-rose-500 rounded-t-md transition-all duration-700 ease-out hover:opacity-80 relative" style={{ height: expenseHeight }}>
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                                    − {formatMoney(stat.expense)}
                                                </div>
                                            </div>
                                        </div>

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
                <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm space-y-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input
                            placeholder="Buscar por descrição ou categoria..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="pl-11 h-11 rounded-xl bg-muted/20 border-border/50 focus-visible:ring-primary/30 font-medium"
                        />
                        {isPending && (
                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 animate-spin" />
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                        <Select value={filters.period} onValueChange={(v) => updateParam("period", v)}>
                            <SelectTrigger className="h-10 rounded-xl bg-muted/20 font-semibold border-border/50 sm:w-[180px]">
                                <div className="flex items-center min-w-0">
                                    <CalendarDays className="h-4 w-4 mr-2 shrink-0 text-muted-foreground/70" />
                                    <SelectValue placeholder="Período" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl font-medium">
                                {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={filters.type} onValueChange={(v) => updateParam("type", v)}>
                            <SelectTrigger className="h-10 rounded-xl bg-muted/20 font-semibold border-border/50 sm:w-[150px]">
                                <div className="flex items-center min-w-0">
                                    <Filter className="h-4 w-4 mr-2 shrink-0 text-muted-foreground/70" />
                                    <SelectValue placeholder="Tipo" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl font-medium">
                                <SelectItem value="ALL">Todas</SelectItem>
                                <SelectItem value="INCOME">Receitas</SelectItem>
                                <SelectItem value="EXPENSE">Despesas</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filters.account} onValueChange={(v) => updateParam("account", v)}>
                            <SelectTrigger className="h-10 rounded-xl bg-muted/20 font-semibold border-border/50 sm:w-[170px]">
                                <SelectValue placeholder="Carteira" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl font-medium">
                                <SelectItem value="ALL">Todas as Contas</SelectItem>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {categories.length > 0 && (
                            <Select value={filters.category} onValueChange={(v) => updateParam("category", v)}>
                                <SelectTrigger className="h-10 rounded-xl bg-muted/20 font-semibold border-border/50 sm:w-[180px]">
                                    <div className="flex items-center min-w-0">
                                        <Tags className="h-4 w-4 mr-2 shrink-0 text-muted-foreground/70" />
                                        <SelectValue placeholder="Categoria" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl font-medium max-h-72">
                                    <SelectItem value="ALL">Todas as Categorias</SelectItem>
                                    {categories.map((c) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="col-span-2 h-10 rounded-xl font-semibold text-muted-foreground hover:text-foreground sm:col-span-1 sm:ml-auto"
                            >
                                <X className="h-4 w-4 mr-1.5" /> Limpar filtros
                            </Button>
                        )}
                    </div>
                </div>

                {/* LISTA AGRUPADA POR DIA */}
                <div className={cn("space-y-6 transition-opacity", isPending && "opacity-60")}>
                    {dayGroups.length > 0 ? dayGroups.map((group) => (
                        <section key={group.key}>
                            {/* Cabeçalho do dia: rótulo + saldo do dia */}
                            <div className="flex items-baseline justify-between gap-3 px-2 pb-2">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                    {group.label}
                                </h3>
                                <span className={cn(
                                    "text-xs font-bold font-mono tabular-nums",
                                    group.net > 0 ? "text-emerald-600" : group.net < 0 ? "text-rose-600" : "text-muted-foreground"
                                )}>
                                    {group.net > 0 ? "+" : ""}{formatMoney(group.net)}
                                </span>
                            </div>

                            <div className="overflow-hidden rounded-[1.25rem] border border-border/40 bg-card shadow-sm divide-y divide-border/30">
                                {group.rows.map((t) => {
                                    const isIncome = t.type === "INCOME";
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => openTransaction(t)}
                                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 sm:px-5"
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-3.5">
                                                {/* Ícone de Entrada/Saída */}
                                                <div className={cn(
                                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                                                    isIncome
                                                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                                                        : "border-rose-500/15 bg-rose-500/[0.07] text-rose-600"
                                                )}>
                                                    {isIncome ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                                                </div>

                                                {/* Dados da Transação */}
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-bold text-foreground">
                                                        {t.description}
                                                    </p>
                                                    <div className="mt-0.5 flex items-center gap-1.5">
                                                        {t.category && (
                                                            <Badge variant="secondary" className="max-w-[140px] truncate border-none bg-primary/5 px-1.5 py-0 text-[10px] font-bold text-primary">
                                                                {t.category}
                                                            </Badge>
                                                        )}
                                                        <span className="truncate text-[11px] font-medium text-muted-foreground">
                                                            {t.account?.name || "Carteira"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Valor */}
                                            <p className={cn(
                                                "shrink-0 text-sm font-extrabold font-mono tabular-nums sm:text-base",
                                                isIncome ? "text-emerald-600" : "text-rose-600"
                                            )}>
                                                {isIncome ? "+" : "−"} {formatMoney(t.amount)}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )) : (
                        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 py-20">
                            <EmptyState
                                icon={Receipt}
                                title="Nenhuma transação encontrada"
                                description={hasActiveFilters
                                    ? "Tente ajustar ou limpar os filtros para visualizar o histórico."
                                    : "Registre sua primeira movimentação ou importe um extrato do banco."}
                                className="border-none bg-transparent shadow-none"
                            />
                        </div>
                    )}

                    {/* PAGINAÇÃO */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-border/40 bg-card px-4 py-3 shadow-sm sm:px-5">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Página {page} de {totalPages}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline" size="sm"
                                    className="h-9 rounded-xl font-bold border-border/50"
                                    disabled={page <= 1 || isPending}
                                    onClick={() => updateParam("page", String(page - 1))}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                                </Button>
                                <Button
                                    variant="outline" size="sm"
                                    className="h-9 rounded-xl font-bold border-border/50"
                                    disabled={page >= totalPages || isPending}
                                    onClick={() => updateParam("page", String(page + 1))}
                                >
                                    Próxima <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Diálogo único de edição — montado UMA vez, fora do .map() */}
                <TransactionDialog
                    key={dialogTx?.id ?? "none"}
                    accounts={accounts}
                    transaction={dialogTx}
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                />
            </PageContainer>
        </PageShell>
    );
}
