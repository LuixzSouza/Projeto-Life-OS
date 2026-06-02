"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Wallet, TrendingUp, Pencil, Check, X, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { PrivacyText, ValueRow, TOOLTIPS, type FinanceMetrics } from "./overview-shared";

interface IncomeDynamicsCardProps {
  grossSalary: number;
  netSalary: number;
  totalRecurring: number;
  totalPaidDebts: number;
  metrics: FinanceMetrics;
  smartView: boolean;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  tempSalary: string;
  setTempSalary: (v: string) => void;
  onSaveSalary: () => void;
  isPending: boolean;
}

export function IncomeDynamicsCard({
  grossSalary,
  netSalary,
  totalRecurring,
  totalPaidDebts,
  metrics,
  smartView,
  isEditing,
  setIsEditing,
  tempSalary,
  setTempSalary,
  onSaveSalary,
  isPending,
}: IncomeDynamicsCardProps) {
  const formatMoney = useFormatCurrency();

  return (
    <Card className="lg:col-span-2 rounded-[2rem] border-border/40 shadow-lg relative overflow-hidden bg-card">
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <CardHeader className="pb-4 pt-8 px-8">
        <CardTitle className="text-2xl font-extrabold flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-primary" /> Dinâmica de Renda
        </CardTitle>
      </CardHeader>

      <CardContent className="px-8 pb-8 space-y-8 relative z-10">

        {/* Bloco Editável do Salário */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-3xl border border-border/60 bg-muted/10 hover:bg-muted/30 hover:border-primary/30 transition-all group/salary gap-4 shadow-sm">
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 mb-1">
              <Wallet className="h-3.5 w-3.5" /> Receita Bruta / Salário
            </p>
            <p className="text-xs text-muted-foreground font-medium">{TOOLTIPS.salarioBruto}</p>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 bg-background p-1.5 rounded-2xl shadow-inner border border-border/50">
              <Input autoFocus value={tempSalary} onChange={e => setTempSalary(e.target.value)} className="w-36 h-10 text-right font-mono text-lg font-bold border-none focus-visible:ring-0 bg-transparent" />
              <Button size="icon" className="h-10 w-10 rounded-xl shadow-md" onClick={onSaveSalary} disabled={isPending}>
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive" onClick={() => setIsEditing(false)}><X className="h-5 w-5" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className={cn("text-3xl sm:text-4xl font-black font-mono tracking-tighter tabular-nums text-foreground group-hover/salary:text-primary transition-colors", smartView && "blur-md opacity-60")}>
                {formatMoney(grossSalary)}
              </div>
              <Button size="icon" variant="outline" className="h-10 w-10 rounded-xl opacity-50 hover:opacity-100 hover:text-primary hover:border-primary/50 shadow-sm transition-all" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* DRE Simplificado */}
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-2 px-2">
          <ValueRow label="Deduções e Impostos" value={metrics.taxes} isNegative tooltip={TOOLTIPS.deducoes} isSmartView={smartView} />
          <ValueRow label="Renda Líquida Real" value={netSalary} isTotal tooltip={TOOLTIPS.salarioLiquido} isSmartView={smartView} />
          <Separator className="col-span-full my-3 md:hidden opacity-50" />
          <ValueRow label="Custo de Vida Fixo" value={totalRecurring} isNegative tooltip={TOOLTIPS.custosFixos} isSmartView={smartView} />
          <ValueRow label="Pagamento de Dívidas" value={totalPaidDebts} isNegative tooltip={TOOLTIPS.dividasPagas} isSmartView={smartView} />
        </div>

        {/* Resultado Final (Caixa Forte) */}
        <div className={cn("flex flex-col sm:flex-row sm:justify-between sm:items-center p-8 rounded-[2rem] border-2 transition-all mt-6 relative overflow-hidden shadow-sm",
          metrics.residual < 0 ? "border-rose-500/30 bg-rose-500/5" : "border-primary/20 bg-primary/5"
        )}>
          <div className="absolute right-0 top-0 opacity-5 pointer-events-none translate-x-1/4 -translate-y-1/4">
            <TrendingUp className="w-56 h-56" />
          </div>
          <div className="relative z-10 mb-3 sm:mb-0">
            <p className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
              Fluxo de Caixa Livre <ArrowRight className="h-5 w-5 opacity-40" />
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Sua capacidade real de aporte e lazer</p>
          </div>
          <div className={cn("text-4xl sm:text-5xl font-black font-mono tracking-tighter tabular-nums relative z-10",
            metrics.residual < 0 ? "text-rose-500" : "text-primary",
            smartView && "blur-[10px] opacity-60"
          )}>
            <PrivacyText value={metrics.residual} isSmartView={smartView} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
