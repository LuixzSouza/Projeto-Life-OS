"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogBody } from "@/components/ui/dialog";
import { Loader2, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { getMarketHistory } from "@/app/(dashboard)/finance/actions";
import type { MarketItem, HistoryPoint } from "@/lib/market-service";

interface ChartTipProps {
  active?: boolean;
  payload?: { payload: HistoryPoint }[];
  formatMoney?: (n: number) => string;
}

function ChartTip({ active, payload, formatMoney }: ChartTipProps) {
  if (!active || !payload?.length || !formatMoney) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-border/60 bg-popover px-3 py-2 shadow-lg">
      <p className="text-[11px] text-muted-foreground">{new Date(`${p.date}T12:00:00`).toLocaleDateString("pt-BR")}</p>
      <p className="font-mono text-sm font-bold text-foreground">{formatMoney(p.close)}</p>
    </div>
  );
}

export function MarketDetailModal({ item, onClose }: { item: MarketItem | null; onClose: () => void }) {
  const formatMoney = useFormatCurrency();
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!item) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setHistory([]);
      const h = await getMarketHistory(item.ticker, item.type);
      if (active) { setHistory(h); setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [item]);

  const isPositive = (item?.variation ?? 0) >= 0;
  const periodChange = history.length > 1 ? ((history[history.length - 1].close - history[0].close) / history[0].close) * 100 : null;

  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent size="lg">
        {item && (
          <>
            <DialogHeader
              icon={item.logoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={item.logoUrl} alt="" className="h-6 w-6 object-contain" />
                : <Activity className="h-5 w-5" />}
              title={item.ticker}
              description={item.name}
            />
            <DialogBody className="space-y-5">
              {/* Preço + variação do dia */}
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preço atual</p>
                  <p className="font-mono text-3xl font-black tracking-tight text-foreground">{item.displayValue}</p>
                </div>
                <div className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold",
                  isPositive ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400" : "text-rose-600 bg-rose-500/10 dark:text-rose-400",
                )}>
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {isPositive ? "+" : ""}{item.variation.toFixed(2)}% hoje
                </div>
              </div>

              {/* Gráfico histórico (~3 meses) */}
              <div className="h-[260px] w-full rounded-2xl border border-border/40 bg-muted/10 p-3">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : history.length < 2 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
                    <Activity className="h-6 w-6 opacity-40" />
                    Sem histórico disponível para este ativo.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={234} minWidth={0}>
                    <AreaChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="mktArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="currentColor" strokeOpacity={0.06} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false} tickLine={false} minTickGap={40}
                        tickFormatter={(d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      />
                      <YAxis
                        width={56} domain={["auto", "auto"]}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      />
                      <Tooltip content={<ChartTip formatMoney={formatMoney} />} />
                      <Area type="monotone" dataKey="close" stroke={isPositive ? "#10b981" : "#f43f5e"} strokeWidth={2} fill="url(#mktArea)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {periodChange != null && (
                  <Stat label="Variação 3 meses" value={`${periodChange >= 0 ? "+" : ""}${periodChange.toFixed(2)}%`} tone={periodChange >= 0 ? "emerald" : "rose"} />
                )}
                {item.dayLow != null && <Stat label="Mínima (dia)" value={formatMoney(item.dayLow)} />}
                {item.dayHigh != null && <Stat label="Máxima (dia)" value={formatMoney(item.dayHigh)} />}
                {item.volume && <Stat label="Volume" value={item.volume} />}
              </div>
            </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "emerald" | "rose" }) {
  const color = tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : tone === "rose" ? "text-rose-600 dark:text-rose-400" : "text-foreground";
  return (
    <div className="rounded-xl border border-border/40 bg-card p-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
      <p className={cn("mt-1 font-mono font-bold tabular-nums text-sm", color)}>{value}</p>
    </div>
  );
}
