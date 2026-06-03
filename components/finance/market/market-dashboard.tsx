"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MarketItem } from "@/lib/market-service";
import { getMarketSnapshot, searchTickers, setWatchlist } from "@/app/(dashboard)/finance/actions";
import type { TickerSuggestion } from "@/lib/ticker-utils";
import { MARKET_POOL, pickRandom } from "@/lib/market-pool";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    TrendingUp, TrendingDown, Search, Activity, BarChart3, HelpCircle, RefreshCw, Star, Plus, Shuffle, Loader2, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MarketDetailModal } from "./market-detail-modal";

const REFRESH_MS = 45000; // atualização automática a cada 45s

export function MarketDashboard({ data: initialData, initialFavorites = [] }: { data: MarketItem[]; initialFavorites?: string[] }) {
    const [data, setData] = useState<MarketItem[]>(initialData);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<MarketItem | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // Favoritos (acompanhamento pessoal) — sincronizados no perfil (banco).
    const [favorites, setFavorites] = useState<string[]>(initialFavorites);
    const [favData, setFavData] = useState<MarketItem[]>([]);

    // Painel de busca para acompanhar qualquer ativo.
    const [addOpen, setAddOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Tickers da B3 atualmente exibidos (para o snapshot ao vivo manter a lista).
    const stockTickers = useRef<string[]>(
        initialData.filter((i) => ["STOCK", "FII", "ETF"].includes(i.type)).map((i) => i.ticker),
    );

    const refresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const fresh = await getMarketSnapshot(stockTickers.current);
            if (fresh.length) { setData(fresh); setLastUpdated(new Date()); }
        } finally {
            setRefreshing(false);
        }
    }, []);

    // Re-sorteia a lista de descoberta.
    const discoverOthers = useCallback(async () => {
        setRefreshing(true);
        try {
            const subset = pickRandom(MARKET_POOL, 18);
            stockTickers.current = subset;
            const fresh = await getMarketSnapshot(subset);
            if (fresh.length) { setData(fresh); setLastUpdated(new Date()); }
        } finally {
            setRefreshing(false);
        }
    }, []);

    // Favoritos são carregados do perfil (banco) via `initialFavorites` (props do servidor).
    // Não usamos localStorage para manter sincronia entre dispositivos.

    // Busca cotações dos favoritos.
    useEffect(() => {
        if (favorites.length === 0) { setFavData([]); return; }
        let active = true;
        const load = async () => {
            const fresh = await getMarketSnapshot(favorites);
            if (active) setFavData(fresh.filter((i) => favorites.includes(i.ticker)));
        };
        void load();
        return () => { active = false; };
    }, [favorites]);

    // Polling automático enquanto a aba está visível.
    useEffect(() => {
        const id = setInterval(() => { if (!document.hidden) void refresh(); }, REFRESH_MS);
        return () => clearInterval(id);
    }, [refresh]);

    // Busca com debounce para o painel "acompanhar ativo".
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const q = query.trim();
        if (q.length < 1) { setSuggestions([]); setSearching(false); return; }
        setSearching(true);
        debounceRef.current = setTimeout(async () => {
            const res = await searchTickers(q);
            setSuggestions(res);
            setSearching(false);
        }, 350);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query]);

    const toggleFavorite = useCallback((ticker: string) => {
        setFavorites((prev) => {
            const next = prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker];
            // Persiste no perfil (banco) — `setWatchlist` é idempotente (dedup + upsert).
            void setWatchlist(next).catch(() => { /* falha silenciosa: estado local já refletiu */ });
            return next;
        });
    }, []);

    const favSet = useMemo(() => new Set(favorites), [favorites]);

    // Lista final = favoritos primeiro, depois descoberta (sem duplicar).
    const merged = useMemo(() => {
        const favItems = favData.filter((i) => favSet.has(i.ticker));
        const rest = data.filter((d) => !favSet.has(d.ticker));
        return [...favItems, ...rest];
    }, [favData, data, favSet]);

    const filteredData = merged.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) || 
        item.ticker.toLowerCase().includes(search.toLowerCase())
    );

    const getFilteredByType = (type: string) => {
        if (type === 'ALL') return filteredData;
        if (type === 'STOCKS') return filteredData.filter(i => i.type === 'STOCK' || i.type === 'ETF');
        if (type === 'FIIS') return filteredData.filter(i => i.type === 'FII');
        if (type === 'MACRO') return filteredData.filter(i => ['CURRENCY', 'CRYPTO', 'INDEX'].includes(i.type));
        return [];
    }

    return (
        <TooltipProvider>
            <div className="space-y-8 animate-in fade-in duration-500">
                
                {/* Destaques do Topo */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {data.filter(i => ['USD', 'BTC', 'CDI', 'IBOV'].includes(i.ticker) || i.ticker === 'IVVB11').slice(0, 4).map(item => (
                        <MarketHighlightCard key={item.ticker} item={item} onSelect={setSelected} isFav={favSet.has(item.ticker)} onToggleFav={toggleFavorite} />
                    ))}
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                                    <BarChart3 className="h-6 w-6 text-primary" /> Cotações em Tempo Real
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Acompanhe o valor atualizado de ações, fundos e moedas.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar ativo (ex: PETR4)..."
                                        className="pl-9 bg-card border-border/60 h-10 transition-all focus-visible:ring-primary/20"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={() => void refresh()}
                                    disabled={refreshing}
                                    title="Atualizar agora"
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-primary hover:border-primary/30 disabled:opacity-50"
                                >
                                    <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 -mt-2">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                </span>
                                Ao vivo · {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · auto 45s
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => void discoverOthers()}
                                    disabled={refreshing}
                                    className="flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                                >
                                    <Shuffle className="h-3.5 w-3.5" /> Descobrir outras
                                </button>
                                <button
                                    onClick={() => setAddOpen((v) => !v)}
                                    className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                                        addOpen ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20")}
                                >
                                    <Plus className="h-3.5 w-3.5" /> Acompanhar ativo
                                </button>
                            </div>
                        </div>

                        {/* Painel de busca para favoritar qualquer ativo */}
                        {addOpen && (
                            <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                    <Input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Busque por nome ou código: Petrobras, PETR, Magalu, BTC…"
                                        autoFocus
                                        className="pl-9 rounded-xl"
                                    />
                                    {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground/50" />}
                                </div>
                                {suggestions.length > 0 && (
                                    <div className="max-h-[220px] overflow-y-auto rounded-xl border border-border/40 divide-y divide-border/30">
                                        {suggestions.map((s) => {
                                            const fav = favSet.has(s.ticker);
                                            return (
                                                <div key={s.ticker} className="flex items-center gap-3 px-3 py-2.5">
                                                    <div className="h-8 w-8 shrink-0 rounded-lg bg-muted/50 border border-border/40 flex items-center justify-center overflow-hidden">
                                                        {s.logo
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            ? <img src={s.logo} alt="" className="h-full w-full object-contain" />
                                                            : <span className="text-[10px] font-black text-muted-foreground">{s.ticker.slice(0, 2)}</span>}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-sm text-foreground">{s.ticker}</p>
                                                        <p className="text-[11px] text-muted-foreground truncate">{s.name}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleFavorite(s.ticker)}
                                                        className={cn("flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors",
                                                            fav ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary hover:bg-primary/20")}
                                                    >
                                                        <Star className={cn("h-3.5 w-3.5", fav && "fill-current")} /> {fav ? "Seguindo" : "Seguir"}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {favorites.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1 self-center">Seguindo:</span>
                                        {favorites.map((t) => (
                                            <button key={t} onClick={() => toggleFavorite(t)} className="flex items-center gap-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 text-xs font-bold hover:bg-amber-500/20 transition-colors">
                                                {t} <X className="h-3 w-3" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <Tabs defaultValue="all" className="w-full">
                            <TabsList className="bg-muted/50 p-1 mb-6 rounded-xl border border-border/40 w-full flex justify-start overflow-x-auto">
                                <TabsTrigger value="all" className="rounded-lg flex-1 min-w-[80px]">Todos</TabsTrigger>
                                <TabsTrigger value="stocks" className="rounded-lg flex-1 min-w-[100px]">Ações & ETFs</TabsTrigger>
                                <TabsTrigger value="fiis" className="rounded-lg flex-1 min-w-[80px]">
                                    FIIs
                                    <InfoTooltip text="Fundos de Investimento Imobiliário: Você investe em imóveis e recebe 'aluguéis' (dividendos)." />
                                </TabsTrigger>
                                <TabsTrigger value="macro" className="rounded-lg flex-1 min-w-[120px]">Câmbio & Macro</TabsTrigger>
                            </TabsList>

                            <TabsContent value="all"><MarketGrid items={getFilteredByType('ALL')} onSelect={setSelected} favSet={favSet} onToggleFav={toggleFavorite} /></TabsContent>
                            <TabsContent value="stocks"><MarketGrid items={getFilteredByType('STOCKS')} onSelect={setSelected} favSet={favSet} onToggleFav={toggleFavorite} /></TabsContent>
                            <TabsContent value="fiis"><MarketGrid items={getFilteredByType('FIIS')} onSelect={setSelected} favSet={favSet} onToggleFav={toggleFavorite} /></TabsContent>
                            <TabsContent value="macro"><MarketGrid items={getFilteredByType('MACRO')} onSelect={setSelected} favSet={favSet} onToggleFav={toggleFavorite} /></TabsContent>
                        </Tabs>
                    </div>

                    {/* Sidebar com Top Movers */}
                    <div className="w-full lg:w-80 space-y-6">
                        <TopMoversCard data={data} type="high" title="Maiores Altas" description="Ativos que mais valorizaram hoje." onSelect={setSelected} />
                        <TopMoversCard data={data} type="low" title="Maiores Baixas" description="Ativos que mais desvalorizaram hoje." onSelect={setSelected} />
                    </div>
                </div>

                <MarketDetailModal item={selected} onClose={() => setSelected(null)} />
            </div>
        </TooltipProvider>
    );
}

// --- SUB-COMPONENTES AUXILIARES ---

function InfoTooltip({ text }: { text: string }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 ml-1.5 text-muted-foreground/70 hover:text-primary cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px] text-xs">
                <p>{text}</p>
            </TooltipContent>
        </Tooltip>
    );
}

// --- COMPONENTES VISUAIS RICOS ---

function FavStar({ active, onClick }: { active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            title={active ? "Deixar de seguir" : "Seguir este ativo"}
            className={cn("rounded-lg p-1.5 transition-colors", active ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-500")}
        >
            <Star className={cn("h-4 w-4", active && "fill-current")} />
        </button>
    );
}

function MarketHighlightCard({ item, onSelect, isFav, onToggleFav }: { item: MarketItem; onSelect: (i: MarketItem) => void; isFav: boolean; onToggleFav: (t: string) => void }) {
    return (
        <Card onClick={() => onSelect(item)} className="border-border/60 shadow-sm hover:border-primary/30 transition-all bg-gradient-to-br from-card to-muted/20 group cursor-pointer">
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                            {item.logoUrl ? (
                                <img src={item.logoUrl} alt={item.ticker} className="w-full h-full object-cover" />
                            ) : (
                                <Activity className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{item.ticker}</p>
                            <p className="text-sm font-semibold text-foreground truncate max-w-[100px]" title={item.name}>{item.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {["STOCK", "FII", "ETF"].includes(item.type) && <FavStar active={isFav} onClick={() => onToggleFav(item.ticker)} />}
                        <BadgeVariation value={item.variation} />
                    </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-2xl font-mono font-bold tracking-tight text-foreground">{item.displayValue}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">Valor Atual</span>
                </div>
            </CardContent>
        </Card>
    )
}

function MarketGrid({ items, onSelect, favSet, onToggleFav }: { items: MarketItem[]; onSelect: (i: MarketItem) => void; favSet: Set<string>; onToggleFav: (t: string) => void }) {
    if (items.length === 0) return (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
            <Search className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">Nenhum ativo encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">Tente buscar por outro nome ou código (ticker).</p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map(item => (
                <div key={item.ticker} onClick={() => onSelect(item)} className="group relative flex flex-col p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/30 hover:shadow-md hover:border-primary/20 transition-all duration-300 cursor-pointer">
                    
                    {/* Header do Card */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-900 border border-border/50 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                {item.logoUrl ? (
                                    <img src={item.logoUrl} alt={item.ticker} className="w-full h-full object-contain" />
                                ) : (
                                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs rounded-md">
                                        {item.ticker.slice(0,2)}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-foreground">{item.ticker}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[140px]" title={item.name}>{item.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {["STOCK", "FII", "ETF"].includes(item.type) && <FavStar active={favSet.has(item.ticker)} onClick={() => onToggleFav(item.ticker)} />}
                            <BadgeVariation value={item.variation} size="sm" />
                        </div>
                    </div>

                    {/* Preço Principal */}
                    <div className="flex items-baseline justify-between mb-3">
                        <div>
                            <span className="text-xl font-mono font-bold text-foreground">{item.displayValue}</span>
                            <p className="text-[10px] text-muted-foreground font-medium">Preço Atual</p>
                        </div>
                        {item.volume && (
                            <div className="text-right">
                                <span className="text-xs font-mono font-medium text-foreground">{item.volume}</span>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase">Volume (24h)</p>
                            </div>
                        )}
                    </div>

                    {/* Barra de Range do Dia (Visual de Trading) */}
                    {item.dayHigh && item.dayLow && (
                        <div className="space-y-1.5 pt-2 border-t border-border/40">
                            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                <span className="flex items-center gap-1" title="Mínima do dia"><TrendingDown className="h-3 w-3 text-red-400" /> {item.dayLow.toFixed(2)}</span>
                                <span className="flex items-center gap-1" title="Máxima do dia"><TrendingUp className="h-3 w-3 text-emerald-400" /> {item.dayHigh.toFixed(2)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden relative">
                                <div 
                                    className="h-full bg-primary/50 absolute rounded-full transition-all duration-1000 ease-out"
                                    style={{
                                        left: `${Math.max(0, Math.min(100, ((item.value - item.dayLow) / (item.dayHigh - item.dayLow)) * 100))}%`,
                                        width: '20%', 
                                        transform: 'translateX(-50%)'
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

function TopMoversCard({ data, type, title, description, onSelect }: { data: MarketItem[], type: "high" | "low", title: string, description: string, onSelect: (i: MarketItem) => void }) {
    const sorted = data
        .filter(i => i.type !== 'INDEX' && i.variation !== 0)
        .sort((a, b) => type === "high" ? b.variation - a.variation : a.variation - b.variation)
        .slice(0, 5);

    if (sorted.length === 0) return null;

    return (
        <Card className={cn("border border-border/60 shadow-sm overflow-hidden", type === "high" ? "bg-emerald-500/5 border-emerald-500/10" : "bg-red-500/5 border-red-500/10")}>
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                <div className="flex items-center justify-between">
                    <CardTitle className={cn("text-xs uppercase font-bold tracking-wider flex items-center gap-2", type === "high" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                        {type === "high" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {title}
                    </CardTitle>
                    <InfoTooltip text={description} />
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="divide-y divide-border/30">
                    {sorted.map(item => (
                        <div key={item.ticker} onClick={() => onSelect(item)} className="flex items-center justify-between py-3 text-sm group hover:bg-white/50 dark:hover:bg-black/20 px-4 -mx-4 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                {item.logoUrl ? (
                                    <img src={item.logoUrl} className="w-5 h-5 rounded-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold">{item.ticker[0]}</div>
                                )}
                                <div>
                                    <span className="font-semibold text-foreground block leading-none">{item.ticker}</span>
                                    <span className="text-[10px] text-muted-foreground hidden sm:block truncate max-w-[80px]">{item.name}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="font-mono text-xs text-foreground block">{item.displayValue}</span>
                                <span className={cn("text-[10px] font-bold block", item.variation >= 0 ? "text-emerald-600" : "text-red-600")}>
                                    {item.variation > 0 ? '+' : ''}{item.variation.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function BadgeVariation({ value, size = "md" }: { value: number, size?: "sm" | "md" }) {
    const isPositive = value >= 0;
    return (
        <div className={cn(
            "flex items-center justify-center font-bold rounded-md px-2 py-0.5 shadow-sm border",
            size === "sm" ? "text-[10px] h-5" : "text-xs h-6",
            isPositive 
                ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" 
                : "text-red-700 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
        )}>
            {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {Math.abs(value).toFixed(2)}%
        </div>
    )
}