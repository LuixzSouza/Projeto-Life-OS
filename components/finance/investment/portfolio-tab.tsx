"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Wallet, TrendingUp, TrendingDown, PieChart as PieIcon, Pencil, Trash2,
  Loader2, AlertCircle, Info, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { useSmartView } from "@/components/finance/smart-view-context";
import { removeHolding } from "@/app/(dashboard)/finance/actions";
import type { Position, PortfolioTotals, HoldingInput } from "@/lib/portfolio-compute";
import { HoldingDialog } from "./holding-dialog";
import { PortfolioAllocationChart } from "./portfolio-allocation-chart";

const TYPE_LABEL: Record<string, string> = { STOCK: "Ação", FII: "FII", ETF: "ETF", CRYPTO: "Cripto" };

interface PortfolioTabProps {
  positions: Position[];
  totals: PortfolioTotals;
}

export function PortfolioTab({ positions, totals }: PortfolioTabProps) {
  const router = useRouter();
  const formatMoney = useFormatCurrency();
  const { smartView } = useSmartView();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HoldingInput | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: Position) => { setEditing(p); setDialogOpen(true); };

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await removeHolding(deleteTarget.id);
      if (res.success) { toast.success(res.message); setDeleteTarget(null); router.refresh(); }
      else toast.error(res.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ----- ESTADO VAZIO -----
  if (positions.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-20 rounded-[2rem] border-2 border-dashed border-border/50 bg-muted/10 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <Wallet className="h-8 w-8" />
          </div>
          <h4 className="font-bold text-foreground text-lg">Sua carteira está vazia</h4>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Cadastre seus ativos (ações, FIIs, ETFs, cripto) e acompanhe o preço atual, lucro/prejuízo e alocação em tempo real.
          </p>
          <Button onClick={openCreate} className="mt-5 gap-2 rounded-xl font-bold shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Adicionar primeiro ativo
          </Button>
        </div>
        <HoldingDialog open={dialogOpen} onOpenChange={setDialogOpen} holding={editing} />
      </>
    );
  }

  const profitPositive = totals.profit >= 0;
  const dayPositive = totals.dayChange >= 0;

  return (
    <div className="space-y-6">
      {/* HEADER + AÇÃO */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" /> Minha Carteira
        </h3>
        <Button onClick={openCreate} className="gap-2 rounded-xl font-bold shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Adicionar ativo
        </Button>
      </div>

      {/* AVISO: cotações faltando (token brapi) */}
      {totals.missingQuotes > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
          <p className="text-muted-foreground">
            <strong className="text-foreground">{totals.missingQuotes} ativo(s) sem cotação ao vivo.</strong>{" "}
            Confira o ticker ou configure um token grátis da brapi em <strong className="text-foreground">Configurações → API</strong> para preços em tempo real. Enquanto isso, uso o preço de compra.
          </p>
        </div>
      )}

      {/* RESUMO (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Valor atual"
          value={formatMoney(totals.currentValue)}
          icon={<Wallet className="h-5 w-5" />}
          blur={smartView}
          accent
        />
        <KpiCard
          label="Investido"
          value={formatMoney(totals.invested)}
          icon={<PieIcon className="h-5 w-5" />}
          blur={smartView}
        />
        <KpiCard
          label="Lucro / Prejuízo"
          value={`${profitPositive ? "+" : ""}${formatMoney(totals.profit)}`}
          sub={`${profitPositive ? "+" : ""}${totals.profitPercent.toFixed(2)}%`}
          icon={profitPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          tone={profitPositive ? "emerald" : "rose"}
          blur={smartView}
        />
        <KpiCard
          label="Variação hoje"
          value={`${dayPositive ? "+" : ""}${formatMoney(totals.dayChange)}`}
          sub={`${dayPositive ? "+" : ""}${totals.dayChangePercent.toFixed(2)}%`}
          icon={dayPositive ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
          tone={dayPositive ? "emerald" : "rose"}
          blur={smartView}
        />
      </div>

      {/* ALOCAÇÃO */}
      <Card className="rounded-[2rem] border-border/40 shadow-sm">
        <CardContent className="p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <PieIcon className="h-3.5 w-3.5" /> Alocação da carteira
          </p>
          <PortfolioAllocationChart positions={positions} />
        </CardContent>
      </Card>

      {/* TABELA DE POSIÇÕES */}
      <Card className="rounded-[2rem] border-border/40 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <th className="text-left font-black px-5 py-3">Ativo</th>
                <th className="text-right font-black px-3 py-3">Qtd</th>
                <th className="text-right font-black px-3 py-3 hidden sm:table-cell">Preço médio</th>
                <th className="text-right font-black px-3 py-3">Preço atual</th>
                <th className="text-right font-black px-3 py-3">Valor</th>
                <th className="text-right font-black px-3 py-3">Lucro/Prej.</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const up = p.profit >= 0;
                const dayUp = p.changePercent >= 0;
                return (
                  <tr key={p.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-muted/50 border border-border/40 flex items-center justify-center overflow-hidden">
                          {p.logoUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={p.logoUrl} alt="" className="h-full w-full object-contain" />
                            : <span className="text-xs font-black text-muted-foreground">{p.ticker.slice(0, 2)}</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground leading-tight">{p.ticker}</p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">{TYPE_LABEL[p.type] ?? p.type}{!p.hasQuote && " · sem cotação"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground/80">{p.quantity}</td>
                    <td className={cn("px-3 py-3 text-right font-mono tabular-nums text-muted-foreground hidden sm:table-cell", smartView && "blur-sm select-none")}>{formatMoney(p.avgPrice)}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-mono tabular-nums text-foreground">{formatMoney(p.currentPrice)}</span>
                      <span className={cn("block text-[11px] font-bold", dayUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                        {dayUp ? "+" : ""}{p.changePercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className={cn("px-3 py-3 text-right font-mono font-bold tabular-nums text-foreground", smartView && "blur-sm select-none")}>{formatMoney(p.currentValue)}</td>
                    <td className={cn("px-3 py-3 text-right", smartView && "blur-sm select-none")}>
                      <span className={cn("font-mono font-bold tabular-nums", up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                        {up ? "+" : ""}{formatMoney(p.profit)}
                      </span>
                      <span className={cn("block text-[11px] font-bold", up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                        {up ? "+" : ""}{p.profitPercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors" aria-label="Remover">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <HoldingDialog open={dialogOpen} onOpenChange={setDialogOpen} holding={editing} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o && !isDeleting) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-[2rem] border-destructive/20">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-1">
              <div className="p-3 rounded-2xl bg-destructive/10"><AlertCircle className="h-6 w-6" /></div>
              <AlertDialogTitle className="text-xl font-bold">Remover ativo?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base text-muted-foreground text-left">
              Remover <strong className="text-foreground">{deleteTarget?.ticker}</strong> da sua carteira. Isso não afeta suas transações nem o saldo das contas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void confirmDelete(); }}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-12 font-bold px-8 shadow-lg shadow-rose-500/20"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tone?: "emerald" | "rose" | "default";
  accent?: boolean;
  blur?: boolean;
}

function KpiCard({ label, value, sub, icon, tone = "default", accent, blur }: KpiCardProps) {
  const toneText = tone === "emerald"
    ? "text-emerald-600 dark:text-emerald-400"
    : tone === "rose"
      ? "text-rose-600 dark:text-rose-400"
      : "text-foreground";
  const iconTone = tone === "emerald"
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : tone === "rose"
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      : "bg-primary/10 text-primary";

  return (
    <Card className="rounded-2xl border-border/40 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
          <div className={cn("p-2 rounded-xl", iconTone)}>{icon}</div>
        </div>
        <p className={cn(
          "font-mono font-black tracking-tight tabular-nums",
          accent ? "text-2xl" : "text-xl",
          toneText,
          blur && "blur-sm select-none",
        )}>
          {value}
        </p>
        {sub && <p className={cn("text-xs font-bold mt-0.5", toneText, blur && "blur-sm select-none")}>{sub}</p>}
      </CardContent>
    </Card>
  );
}
