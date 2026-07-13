"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, ShieldCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";

type RateMode = "CDI" | "IPCA" | "PRE";

interface FixedIncomeCalculatorProps {
  cdi: number; // % a.a. ao vivo
  ipca: number; // % a.a. ao vivo
  /** Pré-preenche a partir de um título (ex.: Tesouro selecionado). */
  preset?: { mode: RateMode; rate: number; taxFree: boolean; label?: string };
}

// IR regressivo da renda fixa (por prazo).
function irRate(months: number): number {
  const days = months * 30;
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.20;
  if (days <= 720) return 0.175;
  return 0.15;
}

export function FixedIncomeCalculator({ cdi, ipca, preset }: FixedIncomeCalculatorProps) {
  const formatMoney = useFormatCurrency();

  const [amount, setAmount] = useState(1000);
  const [months, setMonths] = useState(24);
  const [mode, setMode] = useState<RateMode>(preset?.mode ?? "CDI");
  const [rate, setRate] = useState(preset?.rate ?? 110);
  const [taxFree, setTaxFree] = useState(preset?.taxFree ?? false);

  const result = useMemo(() => {
    const years = months / 12;

    let annualRate = 0;
    if (mode === "CDI") annualRate = (rate / 100) * (cdi / 100);
    else if (mode === "IPCA") annualRate = ipca / 100 + rate / 100;
    else annualRate = rate / 100; // PRE

    const gross = amount * Math.pow(1 + annualRate, years);
    const grossProfit = gross - amount;
    const tax = taxFree ? 0 : grossProfit * irRate(months);
    const net = gross - tax;
    const netProfit = net - amount;

    // Equivalência líquida vs. CDI puro no mesmo prazo.
    const cdiReturn = Math.pow(1 + cdi / 100, years) - 1;
    const netReturn = net / amount - 1;
    const equivCDI = cdiReturn > 0 ? (netReturn / cdiReturn) * 100 : 0;

    // Ganho real acima da inflação (a.a.).
    const realRate = (annualRate * 100) - ipca;

    return { annualRate: annualRate * 100, gross, net, netProfit, tax, equivCDI, realRate };
  }, [amount, months, mode, rate, taxFree, cdi, ipca]);

  const modeBtn = (m: RateMode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={cn(
        "flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors",
        mode === m ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );

  const rateLabel = mode === "CDI" ? "% do CDI" : mode === "IPCA" ? "IPCA + (% a.a.)" : "Taxa prefixada (% a.a.)";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ENTRADAS */}
      <div className="space-y-5 rounded-2xl border border-border/40 bg-card p-6 shadow-sm">
        <h4 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
          <Calculator className="h-4 w-4 text-primary" /> Simulador real
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aporte (R$)</label>
            <Input type="number" min="0" step="100" value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))} className="rounded-xl font-mono" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prazo (meses)</label>
            <Input type="number" min="1" step="1" value={months} onChange={(e) => setMonths(Math.max(1, Number(e.target.value)))} className="rounded-xl font-mono" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de rendimento</label>
          <div className="flex gap-2">
            {modeBtn("CDI", "% do CDI")}
            {modeBtn("IPCA", "IPCA +")}
            {modeBtn("PRE", "Prefixado")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{rateLabel}</label>
            <Input type="number" min="0" step="0.5" value={rate} onChange={(e) => setRate(Math.max(0, Number(e.target.value)))} className="rounded-xl font-mono" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Imposto</label>
            <Button type="button" variant="outline" onClick={() => setTaxFree((v) => !v)} className={cn("w-full rounded-xl font-bold", taxFree ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10" : "")}>
              {taxFree ? <><ShieldCheck className="h-4 w-4 mr-1.5" /> Isento de IR</> : "Tributado (IR)"}
            </Button>
          </div>
        </div>

        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground/70">
          <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
          Calculado com CDI ao vivo de <strong className="text-foreground">{cdi.toFixed(2)}%</strong> e IPCA de <strong className="text-foreground">{ipca.toFixed(2)}%</strong> (Banco Central). IR regressivo: 22,5% → 15% conforme o prazo.
        </p>
      </div>

      {/* RESULTADO */}
      <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.03] p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor líquido em {months} meses</span>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">{result.annualRate.toFixed(2)}% a.a.</span>
        </div>
        <p className="font-mono text-4xl font-black tracking-tighter text-foreground">{formatMoney(result.net)}</p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Stat label="Lucro líquido" value={`+ ${formatMoney(result.netProfit)}`} tone="emerald" />
          <Stat label="Equivale a" value={`${result.equivCDI.toFixed(0)}% do CDI`} icon={<TrendingUp className="h-3.5 w-3.5" />} />
          <Stat label="Imposto (IR)" value={result.tax > 0 ? `- ${formatMoney(result.tax)}` : "Isento"} tone={result.tax > 0 ? "rose" : "emerald"} />
          <Stat label="Ganho real (acima da inflação)" value={`${result.realRate >= 0 ? "+" : ""}${result.realRate.toFixed(2)}% a.a.`} tone={result.realRate >= 0 ? "emerald" : "rose"} />
        </div>

        <p className="text-[11px] text-muted-foreground/70 pt-1">
          {result.equivCDI >= 100
            ? `Rende ${(result.equivCDI - 100).toFixed(0)}% acima da renda fixa básica (CDI) no líquido. Boa escolha.`
            : "Rende abaixo do CDI no líquido — costuma valer pela segurança ou liquidez."}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "default", icon }: { label: string; value: string; tone?: "default" | "emerald" | "rose"; icon?: React.ReactNode }) {
  const color = tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : tone === "rose" ? "text-rose-600 dark:text-rose-400" : "text-foreground";
  return (
    <div className="rounded-xl bg-background/60 border border-border/40 p-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
      <p className={cn("mt-1 font-mono font-bold tabular-nums flex items-center gap-1", color)}>{icon}{value}</p>
    </div>
  );
}
