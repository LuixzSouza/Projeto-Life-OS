"use client";

import { useMemo } from "react";
import { PiggyBank, Home, Sparkles, TrendingUp, CalendarClock, Target } from "lucide-react";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useSmartView } from "@/components/finance/smart-view-context";
import {
  buildSavingsProjection,
  monthsToGoal,
  type BudgetSnapshot,
  type BudgetBucketKey,
} from "@/lib/budget-buckets";
import type { CashFlowPoint } from "@/components/finance/cash-flow-chart";
import type { DashboardWishlist } from "@/components/finance/dashboard/types";
import { DevilsAdvocateButton } from "@/components/finance/dashboard/devils-advocate-dialog";

const BUCKET_META: Record<
  BudgetBucketKey,
  { label: string; hint: string; icon: typeof Home; bar: string; soft: string; text: string }
> = {
  essential: {
    label: "Essencial",
    hint: "Moradia, contas, mercado, transporte…",
    icon: Home,
    bar: "bg-blue-500",
    soft: "bg-blue-500/10",
    text: "text-blue-500",
  },
  pleasure: {
    label: "Prazeres",
    hint: "Lazer, delivery, compras por vontade",
    icon: Sparkles,
    bar: "bg-amber-500",
    soft: "bg-amber-500/10",
    text: "text-amber-500",
  },
  future: {
    label: "Futuro",
    hint: "Investimentos + reserva de emergência",
    icon: PiggyBank,
    bar: "bg-emerald-500",
    soft: "bg-emerald-500/10",
    text: "text-emerald-500",
  },
};

function money(v: number, hidden: boolean): string {
  if (hidden) return "•••••";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface BudgetSectionProps {
  budget: BudgetSnapshot;
  monthlyFlow: CashFlowPoint[];
  wishlist: DashboardWishlist[];
  /** Saldo somado das contas — desconta o que já existe antes de projetar. */
  totalBalance: number;
}

/**
 * Orçamento 75/10/15 (Fase 2) + Finanças Preditivas (Fase 3).
 * Esquerda: baldes percentuais da renda com o gasto real classificado.
 * Direita: ritmo de poupança e a DATA projetada de cada meta da wishlist.
 */
export function BudgetSection({ budget, monthlyFlow, wishlist, totalBalance }: BudgetSectionProps) {
  const { smartView } = useSmartView();
  const hidden = smartView;

  const projection = useMemo(() => buildSavingsProjection(monthlyFlow), [monthlyFlow]);

  // Desejos com preço definido e ainda não comprados, mais prioritários primeiro.
  // O que falta é medido contra o saldo REAL das contas (não um cofre virtual).
  const goals = useMemo(
    () =>
      wishlist
        .filter((w) => w.price > 0 && w.status !== "BOUGHT")
        .slice(0, 4)
        .map((w) => {
          const remaining = Math.max(w.price - totalBalance, 0);
          const months = remaining <= 0 ? 0 : projection ? monthsToGoal(remaining, projection.avgMonthlySavings) : null;
          return { ...w, remaining, months };
        }),
    [wishlist, projection, totalBalance],
  );

  // Advogado do Diabo (#17): o balde mais estourado vira o "réu" do confronto.
  const worstOver = useMemo(() => {
    const over = budget.buckets
      .filter((b) => b.limit > 0 && b.spent > b.limit)
      .sort((a, b) => b.spent - b.limit - (a.spent - a.limit));
    return over[0] ?? null;
  }, [budget.buckets]);

  if (budget.income <= 0) return null; // sem renda-base não há o que orçar

  return (
    <section id="orcamento" className="scroll-mt-36 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-foreground leading-none">Orçamento 75 · 10 · 15</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Renda-base do mês: <strong>{money(budget.income, hidden)}</strong>
            {budget.incomeFromSalary && " (salário líquido — ainda sem receitas lançadas)"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* BALDES */}
        <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm space-y-5">
          {budget.buckets.map((bucket) => {
            const meta = BUCKET_META[bucket.key];
            const Icon = meta.icon;
            const ratio = bucket.limit > 0 ? bucket.spent / bucket.limit : 0;
            const over = ratio > 1;
            return (
              <div key={bucket.key} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("rounded-lg p-1.5", meta.soft)}>
                      <Icon className={cn("h-3.5 w-3.5", meta.text)} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-none text-foreground">
                        {meta.label}{" "}
                        <span className="text-[10px] font-black text-muted-foreground">{bucket.percent}%</span>
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">{meta.hint}</p>
                    </div>
                  </div>
                  <p className={cn("shrink-0 text-xs font-bold tabular-nums", over ? "text-rose-500" : "text-foreground")}>
                    {money(bucket.spent, hidden)}{" "}
                    <span className="font-medium text-muted-foreground">/ {money(bucket.limit, hidden)}</span>
                  </p>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={cn("h-full rounded-full transition-all", over ? "bg-rose-500" : meta.bar)}
                    style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                  />
                </div>
                {over && (
                  <p className="text-[10px] font-bold text-rose-500">
                    {money(bucket.spent - bucket.limit, hidden)} acima do balde — compensa nos outros ou no próximo mês.
                  </p>
                )}
              </div>
            );
          })}

          {budget.unclassified > 0 && (
            <p className="rounded-xl border border-dashed border-border/40 bg-muted/20 p-3 text-[11px] text-muted-foreground">
              {money(budget.unclassified, hidden)} em lançamentos <strong>sem categoria</strong> caíram em
              “Prazeres”. Categorize-os no extrato para o orçamento ficar fiel.
            </p>
          )}

          {/* Advogado do Diabo (#17): só aparece com balde estourado. */}
          {worstOver && (
            <DevilsAdvocateButton
              input={{
                bucketLabel: BUCKET_META[worstOver.key].label,
                over: worstOver.spent - worstOver.limit,
                spent: worstOver.spent,
                limit: worstOver.limit,
                avgMonthlySavings: projection?.avgMonthlySavings ?? 0,
                goals: goals.map((g) => ({ name: g.name, remaining: g.remaining, monthsAway: g.months })),
              }}
            />
          )}
        </div>

        {/* PREDITIVO */}
        <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-black uppercase tracking-widest text-foreground">No ritmo atual</h4>
          </div>

          {projection && projection.sampleMonths > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/40 bg-background p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Poupança média/mês</p>
                  <p className={cn("mt-1 text-xl font-black tabular-nums", projection.avgMonthlySavings >= 0 ? "text-emerald-500" : "text-rose-500")}>
                    {money(projection.avgMonthlySavings, hidden)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">média de {projection.sampleMonths} mês(es)</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-background p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Em 12 meses</p>
                  <p className={cn("mt-1 text-xl font-black tabular-nums", projection.in12Months >= 0 ? "text-foreground" : "text-rose-500")}>
                    {money(projection.in12Months, hidden)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    taxa de poupança {hidden ? "•••" : `${Math.round(projection.savingsRate * 100)}%`}
                  </p>
                </div>
              </div>

              {goals.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" /> Quando cada meta chega
                  </p>
                  {goals.map((g) => (
                    <div key={g.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{g.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {g.remaining > 0 ? `faltam ${money(g.remaining, hidden)} além do saldo` : "seu saldo atual já cobre"}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs font-bold text-primary">
                        {g.months === 0
                          ? "Já dá! 🎉"
                          : g.months === null
                            ? "—"
                            : format(addMonths(new Date(), g.months), "MMM yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                  {projection.avgMonthlySavings <= 0 && (
                    <p className="text-[10px] font-bold text-rose-500">
                      Poupança média negativa — no ritmo atual as metas não chegam. O balde “Futuro” é o caminho.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-border/40 bg-muted/20 p-4 text-xs text-muted-foreground">
              Lance receitas e despesas por alguns meses para o Life OS projetar quando suas metas chegam.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
