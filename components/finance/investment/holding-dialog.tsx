"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, TrendingUp, Search, X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { addHolding, updateHolding, searchTickers } from "@/app/(dashboard)/finance/actions";
import type { TickerSuggestion } from "@/lib/ticker-utils";
import type { HoldingInput } from "@/lib/portfolio-compute";

const TYPE_LABEL: Record<string, string> = { STOCK: "Ação", FII: "Fundo Imobiliário", ETF: "ETF", CRYPTO: "Cripto" };

// Atalhos para quem não sabe o ticker — 1 clique já busca o ativo.
const POPULAR: { group: string; items: string[] }[] = [
  { group: "Ações", items: ["PETR4", "VALE3", "ITUB4", "BBAS3", "WEGE3", "MGLU3", "ABEV3", "B3SA3"] },
  { group: "Fundos Imobiliários", items: ["MXRF11", "HGLG11", "KNRI11", "XPML11", "VISC11"] },
  { group: "ETFs", items: ["BOVA11", "IVVB11", "SMAL11"] },
  { group: "Cripto", items: ["BTC", "ETH"] },
];

function clientInferType(ticker: string): string {
  const t = ticker.toUpperCase();
  if (["BTC", "ETH", "SOL", "ADA", "BNB", "XRP", "DOGE"].includes(t)) return "CRYPTO";
  if (["BOVA11", "IVVB11", "SMAL11"].includes(t)) return "ETF";
  if (/11$/.test(t)) return "FII";
  return "STOCK";
}

interface HoldingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holding?: HoldingInput | null; // presente = edição
}

export function HoldingDialog({ open, onOpenChange, holding }: HoldingDialogProps) {
  const router = useRouter();
  const formatMoney = useFormatCurrency();
  const isEdit = !!holding;

  const [ticker, setTicker] = useState("");
  const [type, setType] = useState("STOCK");
  const [selName, setSelName] = useState<string>("");
  const [selLogo, setSelLogo] = useState<string | undefined>();
  const [currentPrice, setCurrentPrice] = useState<number | undefined>();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // (Re)inicializa quando abre / muda o item em edição.
  useEffect(() => {
    if (!open) return;
    if (holding) {
      setTicker(holding.ticker); setType(holding.type);
      setSelName(holding.ticker); setSelLogo(undefined); setCurrentPrice(undefined);
      setQuantity(String(holding.quantity)); setAvgPrice(String(holding.avgPrice)); setNote(holding.note ?? "");
    } else {
      setTicker(""); setType("STOCK"); setSelName(""); setSelLogo(undefined); setCurrentPrice(undefined);
      setQuantity(""); setAvgPrice(""); setNote("");
    }
    setQuery(""); setSuggestions([]);
  }, [open, holding]);

  // Busca com debounce.
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

  const select = (s: TickerSuggestion) => {
    setTicker(s.ticker);
    setType(s.type);
    setSelName(s.name);
    setSelLogo(s.logo);
    setCurrentPrice(s.price);
    if (s.price && !avgPrice) setAvgPrice(String(s.price));
    setQuery(""); setSuggestions([]);
  };

  // Clique num "popular": busca o ativo e seleciona o melhor resultado.
  const pickPopular = async (tk: string) => {
    setSearching(true);
    const res = await searchTickers(tk);
    setSearching(false);
    const match = res.find((r) => r.ticker.toUpperCase() === tk.toUpperCase()) || res[0];
    if (match) select(match);
    else { setTicker(tk); setType(clientInferType(tk)); setSelName(tk); } // fallback se a API não responder
  };

  const clearSelection = () => {
    setTicker(""); setSelName(""); setSelLogo(undefined); setCurrentPrice(undefined);
    setQuery(""); setSuggestions([]);
  };

  const submit = async () => {
    if (!ticker) { toast.error("Escolha um ativo."); return; }
    if (!quantity || Number(quantity) <= 0) { toast.error("Informe a quantidade."); return; }
    if (!avgPrice || Number(avgPrice) <= 0) { toast.error("Informe o preço de compra."); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      if (isEdit) fd.set("id", holding!.id);
      fd.set("ticker", ticker);
      fd.set("type", type);
      fd.set("quantity", quantity);
      fd.set("avgPrice", avgPrice);
      fd.set("note", note);
      const res = isEdit ? await updateHolding(fd) : await addHolding(fd);
      if (res.success) { toast.success(res.message); onOpenChange(false); router.refresh(); }
      else toast.error(res.message);
    } catch {
      toast.error("Erro ao salvar o ativo.");
    } finally {
      setLoading(false);
    }
  };

  const hasSelection = !!ticker;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader
          icon={<TrendingUp />}
          title={isEdit ? "Editar ativo" : "Adicionar ativo"}
          description={isEdit ? "Ajuste a posição na sua carteira." : "Busque pelo nome ou escolha um popular. Você não precisa decorar o código."}
        />
        <DialogBody className="space-y-4">
          {/* PASSO 1: escolher o ativo */}
          {!hasSelection ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Busque: PETR, Petrobras, Magalu, BTC…"
                  autoFocus
                  className="pl-9 rounded-xl"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground/50" />}
              </div>

              {/* Resultados da busca */}
              {suggestions.length > 0 && (
                <div className="max-h-[220px] overflow-y-auto rounded-xl border border-border/40 divide-y divide-border/30 custom-scrollbar">
                  {suggestions.map((s) => (
                    <button
                      key={s.ticker}
                      onClick={() => select(s)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                    >
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
                      {s.price != null && <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatMoney(s.price)}</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Populares */}
              {query.trim().length === 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Populares · 1 clique</p>
                  {POPULAR.map((grp) => (
                    <div key={grp.group} className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground/60">{grp.group}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {grp.items.map((tk) => (
                          <button
                            key={tk}
                            onClick={() => pickPopular(tk)}
                            className="rounded-lg bg-primary/10 text-primary px-2.5 py-1 text-xs font-bold hover:bg-primary/20 transition-colors"
                          >
                            {tk}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* PASSO 2: confirmar quantidade e preço */
            <>
              <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 p-3">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-background border border-border/40 flex items-center justify-center overflow-hidden">
                  {selLogo
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={selLogo} alt="" className="h-full w-full object-contain" />
                    : <span className="text-xs font-black text-muted-foreground">{ticker.slice(0, 2)}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground">{ticker}</p>
                    <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground">{TYPE_LABEL[type] ?? type}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {selName || ticker}{currentPrice != null && ` · agora ${formatMoney(currentPrice)}`}
                  </p>
                </div>
                {!isEdit && (
                  <button onClick={clearSelection} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label="Trocar ativo">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quantidade</label>
                  <Input type="number" step="any" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="10" autoFocus className="rounded-xl font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preço de compra</label>
                  <Input type="number" step="0.01" min="0" value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} placeholder="32.50" className="rounded-xl font-mono" />
                </div>
              </div>
              {currentPrice != null && (
                <button
                  type="button"
                  onClick={() => setAvgPrice(String(currentPrice))}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  Usar preço atual ({formatMoney(currentPrice)})
                </button>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nota (opcional)</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: corretora, estratégia…" className="rounded-xl" />
              </div>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={submit} disabled={loading || !hasSelection} className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : isEdit ? "Salvar" : (
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Adicionar à carteira</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
