"use client";

import { useState } from "react";
import { Info, Banknote, Landmark, TrendingUp, Calculator } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { GLOSSARY } from "./investment-data";
import { FixedIncomeCalculator } from "./fixed-income-calculator";
import type { TesouroBond, TesouroIndexer } from "@/lib/tesouro-service";

interface RealFixedIncomeProps {
  cdi: number;
  ipca: number;
  tesouro: TesouroBond[];
}

type RateMode = "CDI" | "IPCA" | "PRE";

const INDEXER_META: Record<TesouroIndexer, { label: string; color: string; Icon: typeof Banknote }> = {
  SELIC: { label: "Pós-fixado (Selic)", color: "text-emerald-500", Icon: TrendingUp },
  IPCA: { label: "Inflação (IPCA+)", color: "text-amber-500", Icon: Landmark },
  PREFIXADO: { label: "Prefixado", color: "text-blue-500", Icon: Banknote },
  OUTRO: { label: "Outro", color: "text-muted-foreground", Icon: Banknote },
};

function rateDisplay(b: TesouroBond): string {
  if (b.indexer === "SELIC") return `Selic + ${b.annualRate.toFixed(2)}%`;
  if (b.indexer === "IPCA") return `IPCA + ${b.annualRate.toFixed(2)}%`;
  return `${b.annualRate.toFixed(2)}% a.a.`;
}

function presetFor(b: TesouroBond): { mode: RateMode; rate: number; taxFree: boolean } {
  if (b.indexer === "IPCA") return { mode: "IPCA", rate: b.annualRate, taxFree: false };
  if (b.indexer === "PREFIXADO") return { mode: "PRE", rate: b.annualRate, taxFree: false };
  return { mode: "CDI", rate: 100, taxFree: false }; // Selic ≈ 100% do CDI
}

export function RealFixedIncome({ cdi, ipca, tesouro }: RealFixedIncomeProps) {
  const formatMoney = useFormatCurrency();
  const [preset, setPreset] = useState<{ mode: RateMode; rate: number; taxFree: boolean } | undefined>();
  const [presetKey, setPresetKey] = useState(0);

  const simulate = (b: TesouroBond) => {
    setPreset(presetFor(b));
    setPresetKey((k) => k + 1);
    document.getElementById("fi-calculator")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* CALCULADORA REAL */}
      <section id="fi-calculator" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-foreground">Calculadora de renda fixa</h3>
        </div>
        <FixedIncomeCalculator key={presetKey} cdi={cdi} ipca={ipca} preset={preset} />
      </section>

      {/* TESOURO DIRETO AO VIVO */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-foreground">Tesouro Direto · ao vivo</h3>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Taxas reais · B3
          </span>
        </div>

        {tesouro.length === 0 ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            Não consegui carregar as taxas do Tesouro agora (a API da B3 pode estar fora do ar). Tente novamente em instantes — a calculadora acima continua funcionando com o CDI/IPCA ao vivo.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tesouro.map((b, i) => {
              const meta = INDEXER_META[b.indexer];
              return (
                <div key={i} className="group flex flex-col justify-between rounded-2xl border border-border/40 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className={cn("p-2 rounded-xl bg-muted/40 border border-border/40", meta.color)}><meta.Icon className="h-4 w-4" /></div>
                      <span className="rounded-md bg-muted/50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground">{meta.label}</span>
                    </div>
                    <h4 className="mt-3 font-bold text-foreground leading-tight">{b.name}</h4>
                    <p className="mt-1 font-mono text-lg font-black text-primary">{rateDisplay(b)}</p>
                  </div>
                  <div className="mt-4 space-y-1.5 text-[11px] text-muted-foreground">
                    <div className="flex justify-between"><span>Mínimo</span><span className="font-mono text-foreground/80">{formatMoney(b.minInvestment)}</span></div>
                    <div className="flex justify-between"><span>Vencimento</span><span className="font-mono text-foreground/80">{b.maturity ? new Date(b.maturity).toLocaleDateString("pt-BR") : "—"}</span></div>
                  </div>
                  <button
                    onClick={() => simulate(b)}
                    className="mt-4 w-full rounded-xl bg-muted/60 py-2 text-xs font-bold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    Simular na calculadora
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* GLOSSÁRIO */}
      <section className="border-t border-border/40 pt-8">
        <h3 className="mb-6 flex items-center gap-3 text-sm font-extrabold uppercase tracking-widest text-foreground">
          <div className="rounded-md bg-primary/10 p-1.5 text-primary"><Info className="h-4 w-4" /></div>
          Glossário do Investidor
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(GLOSSARY).map(([term, def]) => (
            <HoverCard key={term}>
              <HoverCardTrigger asChild>
                <div className="cursor-help rounded-xl border border-border/50 bg-muted/20 p-4 text-center transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{term}</span>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="z-50 w-[280px] rounded-2xl border-border/50 p-6 text-sm shadow-2xl sm:w-80" sideOffset={12}>
                <p className="mb-2 text-lg font-black tracking-tight text-primary">{term}</p>
                <p className="font-medium leading-relaxed text-muted-foreground">{def}</p>
              </HoverCardContent>
            </HoverCard>
          ))}
        </div>
      </section>
    </div>
  );
}
