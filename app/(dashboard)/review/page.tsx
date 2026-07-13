// Retrospectiva do Mês: visão consolidada de TUDO que aconteceu no mês —
// finanças, treinos, estudos, foco, tarefas, hábitos, peso, sono, mídia —
// com comparação contra o mês anterior. Os dados já existem nos módulos;
// esta página só os reúne (zero schema novo).

import Link from "next/link";
import { Metadata } from "next";
import {
  CalendarRange, ChevronLeft, ChevronRight, Wallet, Dumbbell, BookOpen,
  Timer, CheckCircle2, Briefcase, NotebookPen, Flame, Film, Moon, Scale,
  Utensils, TrendingUp, TrendingDown, Sparkles, Activity,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { formatCurrency, cn } from "@/lib/utils";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { AskAiButton } from "@/components/ai/ask-ai-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { FinanceTrendChart, type TrendPoint } from "@/components/review/finance-trend-chart";
import { ActivityHeatmap } from "@/components/review/activity-heatmap";
import { ExportReviewPdfButton } from "@/components/review/export-review-pdf-button";
import { MonthHighlights } from "@/components/review/month-highlights";
import { computeHighlights } from "@/lib/review-highlights";
import { fmtMinutes, fmtKg, type CategoryTotal, type MonthStats } from "@/components/review/review-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retrospectiva | Life OS",
  description: "O resumo consolidado do seu mês: finanças, saúde, estudos e produtividade.",
};

// Nomes fixos (determinístico → sem risco de hidratação/locale).
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

async function getMonthStats(userId: string, start: Date, end: Date): Promise<MonthStats> {
  const range = { gte: start, lte: end };

  const [
    transactions, workoutAgg, studyAgg, focusAgg, tasksDone, projectsDone,
    notesCreated, mediaCompleted, habitsDone, sleepAgg, weightFirst, weightLast, mealAgg,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, deletedAt: null, date: range },
      select: { amount: true, type: true, category: true },
    }),
    prisma.workout.aggregate({ where: { userId, date: range }, _count: { _all: true }, _sum: { duration: true } }),
    prisma.studySession.aggregate({ where: { userId, date: range }, _count: { _all: true }, _sum: { durationMinutes: true } }),
    prisma.focusSession.aggregate({ where: { userId, endedAt: range }, _count: { _all: true }, _sum: { minutes: true } }),
    prisma.task.count({ where: { userId, deletedAt: null, isDone: true, updatedAt: range } }),
    prisma.project.count({ where: { userId, deletedAt: null, status: "COMPLETED", updatedAt: range } }),
    prisma.studyNote.count({ where: { userId, deletedAt: null, createdAt: range } }),
    prisma.mediaItem.count({
      where: { userId, deletedAt: null, status: { in: ["COMPLETED", "WATCHED"] }, updatedAt: range },
    }),
    prisma.habitLog.count({ where: { userId, status: "DONE", date: range } }),
    prisma.healthMetric.aggregate({ where: { userId, type: "SLEEP", date: range }, _avg: { value: true } }),
    // Primeiro/último peso do mês via findFirst+orderBy (groupBy/_max de
    // DateTime quebra no libSQL — ver memória do projeto).
    prisma.healthMetric.findFirst({
      where: { userId, type: "WEIGHT", date: range }, orderBy: { date: "asc" }, select: { value: true },
    }),
    prisma.healthMetric.findFirst({
      where: { userId, type: "WEIGHT", date: range }, orderBy: { date: "desc" }, select: { value: true },
    }),
    prisma.meal.aggregate({ where: { userId, date: range }, _count: { _all: true }, _sum: { calories: true } }),
  ]);

  // Receita/despesa + top categorias em JS: 1 query, sem groupBy de Decimal
  // (e o `type` legado pode variar de caixa).
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();
  for (const t of transactions) {
    const value = Math.abs(Number(t.amount));
    if (String(t.type ?? "").toUpperCase() === "INCOME") {
      income += value;
    } else {
      expense += value;
      const cat = t.category?.trim() || "Sem categoria";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + value);
    }
  }
  const topCategories: CategoryTotal[] = [...byCategory.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    income,
    expense,
    txCount: transactions.length,
    topCategories,
    workouts: workoutAgg._count._all,
    workoutMinutes: workoutAgg._sum.duration ?? 0,
    studyMinutes: studyAgg._sum.durationMinutes ?? 0,
    studySessions: studyAgg._count._all,
    focusMinutes: focusAgg._sum.minutes ?? 0,
    focusSessions: focusAgg._count._all,
    tasksDone,
    projectsDone,
    notesCreated,
    mediaCompleted,
    habitsDone,
    sleepAvg: sleepAgg._avg.value,
    weightStart: weightFirst?.value ?? null,
    weightEnd: weightLast?.value ?? null,
    mealsCount: mealAgg._count._all,
    kcalTotal: mealAgg._sum.calories ?? 0,
  };
}

const ym = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// Variação vs período anterior: seta + cor conforme a direção ser boa ou ruim.
function DeltaBadge({
  current, previous, goodWhen, format, compareLabel = "mês anterior",
}: {
  current: number;
  previous: number;
  goodWhen: "up" | "down" | "neutral";
  format?: (v: number) => string;
  compareLabel?: string;
}) {
  const diff = current - previous;
  if (previous === 0 && current === 0) return null;
  const up = diff > 0;
  const isGood = goodWhen === "neutral" ? null : (goodWhen === "up") === up;
  const tone =
    diff === 0 || isGood === null
      ? "text-muted-foreground"
      : isGood ? "text-emerald-500" : "text-rose-500";
  const fmt = format ?? ((v: number) => String(Math.abs(Math.round(v))));
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold", tone)} title={`Comparado ao ${compareLabel}`}>
      {diff === 0 ? `= ${compareLabel}` : (
        <>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {fmt(Math.abs(diff))} vs {compareLabel}
        </>
      )}
    </span>
  );
}

function StatCard({
  icon: Icon, tone, label, value, sub, delta,
}: {
  icon: React.ElementType;
  tone: string; // classes de cor do chip (bg + text)
  label: string;
  value: string;
  sub?: string;
  delta?: React.ReactNode;
}) {
  return (
    <Card className="group rounded-2xl border-border/40 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-center gap-2">
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl transition-transform group-hover:scale-110", tone)}>
            <Icon className="h-4 w-4" />
          </span>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">{label}</p>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight leading-none tabular-nums">{value}</p>
        <div className="mt-auto space-y-1 pt-2">
          {sub && <p className="text-[11px] text-muted-foreground leading-tight">{sub}</p>}
          {delta}
        </div>
      </CardContent>
    </Card>
  );
}

// Cabeçalho de seção: barra de acento + título, organiza os blocos de cards.
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-4 w-1 rounded-full bg-primary/60" />
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{children}</h3>
    </div>
  );
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const { month, year: yearParam } = await searchParams;

  const now = new Date();
  // Modo Ano (?year=2026) agrega jan–dez e compara com o ano anterior;
  // modo Mês (padrão / ?month=YYYY-MM) segue como antes.
  const isYearMode = typeof yearParam === "string" && /^\d{4}$/.test(yearParam);
  let year = now.getFullYear();
  let monthIdx = now.getMonth();
  if (isYearMode) {
    year = Number(yearParam);
    monthIdx = 11; // âncora da janela de tendência (jan–dez do ano)
  } else if (typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    const [y, mo] = month.split("-").map(Number);
    year = y;
    monthIdx = mo - 1;
  }

  const start = isYearMode ? new Date(year, 0, 1) : new Date(year, monthIdx, 1);
  const end = isYearMode
    ? new Date(year, 11, 31, 23, 59, 59, 999)
    : new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
  const prevStart = isYearMode ? new Date(year - 1, 0, 1) : new Date(year, monthIdx - 1, 1);
  const prevEnd = isYearMode
    ? new Date(year - 1, 11, 31, 23, 59, 59, 999)
    : new Date(year, monthIdx, 0, 23, 59, 59, 999);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const hasNext = isYearMode ? year < now.getFullYear() : start < currentMonthStart;

  let stats: MonthStats | null = null;
  let prev: MonthStats | null = null;
  let currency = "BRL";
  let viewerId: string | null = null;
  const trend: TrendPoint[] = [];

  try {
    const userId = await getCurrentUserId();
    viewerId = userId;
    if (userId) {
      // Janela do gráfico: os 12 meses que terminam no mês em exibição.
      const trendStart = new Date(year, monthIdx - 11, 1);
      const [cur, before, settings, trendTx] = await Promise.all([
        getMonthStats(userId, start, end),
        getMonthStats(userId, prevStart, prevEnd),
        prisma.settings.findUnique({ where: { userId }, select: { currency: true } }),
        prisma.transaction.findMany({
          where: { userId, deletedAt: null, date: { gte: trendStart, lte: end } },
          select: { date: true, amount: true, type: true },
        }),
      ]);
      stats = cur;
      prev = before;
      currency = settings?.currency || "BRL";

      // Buckets em ordem cronológica (Map preserva inserção).
      const buckets = new Map<string, { income: number; expense: number }>();
      for (let i = 11; i >= 0; i--) buckets.set(ym(new Date(year, monthIdx - i, 1)), { income: 0, expense: 0 });
      for (const t of trendTx) {
        const bucket = buckets.get(ym(t.date));
        if (!bucket) continue;
        const value = Math.abs(Number(t.amount));
        if (String(t.type ?? "").toUpperCase() === "INCOME") bucket.income += value;
        else bucket.expense += value;
      }
      // No modo Ano nenhum mês é "o atual" — todos os pontos ficam clicáveis.
      const viewedKey = isYearMode ? "" : ym(start);
      for (const [key, b] of buckets) {
        trend.push({
          label: MONTH_SHORT[Number(key.slice(5)) - 1],
          monthKey: key,
          income: Math.round(b.income),
          expense: Math.round(b.expense),
          balance: Math.round(b.income - b.expense),
          isCurrent: key === viewedKey,
        });
      }
    }
  } catch (error) {
    console.error("Erro ao montar a retrospectiva:", error);
  }

  if (!stats || !prev) {
    return (
      <ErrorState
        title="Falha de Leitura"
        description="Não foi possível montar a retrospectiva do mês agora."
        backHref="/dashboard"
        retryHref="/review"
      />
    );
  }

  const money = (v: number) => formatCurrency(v, { currency });
  const periodLabel = isYearMode ? String(year) : `${MONTH_NAMES[monthIdx]} de ${year}`;
  const prevLabel = isYearMode
    ? String(year - 1)
    : `${MONTH_NAMES[prevStart.getMonth()]} de ${prevStart.getFullYear()}`;
  // Sair do modo Ano volta para o mês atual (mesmo ano) ou janeiro (ano antigo).
  const monthModeHref =
    year === now.getFullYear() ? "/review" : `/review?month=${year}-01`;
  const cmp = isYearMode ? "ano anterior" : "mês anterior";
  const balance = stats.income - stats.expense;
  const maxCategory = stats.topCategories[0]?.total ?? 0;
  const weightDiff =
    stats.weightStart !== null && stats.weightEnd !== null ? stats.weightEnd - stats.weightStart : null;
  const isEmpty =
    stats.txCount === 0 && stats.workouts === 0 && stats.studySessions === 0 &&
    stats.focusSessions === 0 && stats.tasksDone === 0 && stats.mealsCount === 0;

  // Destaques do período: conquistas/alertas derivados dos números (sem IA).
  const highlights = computeHighlights(stats, prev, { money, cmp });

  return (
    <PageShell>
      <PageHeader
        icon={<CalendarRange className="h-6 w-6" />}
        title="Retrospectiva"
        description="O resumo consolidado do seu mês, módulo por módulo."
        actions={
          <>
            <ExportReviewPdfButton
              periodLabel={periodLabel}
              prevLabel={prevLabel}
              fileSlug={isYearMode ? String(year) : ym(start)}
              currency={currency}
              stats={stats}
              prev={prev}
              trend={trend}
              highlights={highlights}
            />
            <AskAiButton
              q={`Analise minha retrospectiva de ${periodLabel}: finanças (receita ${money(stats.income)}, despesa ${money(stats.expense)}), ${stats.workouts} treinos, ${fmtMinutes(stats.studyMinutes)} de estudo, ${stats.tasksDone} tarefas concluídas. O que foi bem, o que derrapou e quais 3 intenções sugere para o próximo ${isYearMode ? "ano" : "mês"}?`}
              label="Analisar com IA"
            />
          </>
        }
      />

      <PageContainer>
        <div className="space-y-6 pb-24 animate-in fade-in duration-500">
          {/* Navegação do período + toggle Mês/Ano */}
          <div className="flex items-center justify-between gap-3">
            <Button asChild variant="outline" size="sm" className="gap-1 rounded-lg">
              <Link href={isYearMode ? `/review?year=${year - 1}` : `/review?month=${ym(prevStart)}`}>
                <ChevronLeft className="h-4 w-4" />
                {isYearMode ? year - 1 : MONTH_NAMES[prevStart.getMonth()]}
              </Link>
            </Button>

            <div className="flex flex-col items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">{periodLabel}</h2>
              <div className="inline-flex items-center gap-0.5 rounded-full border border-border/50 bg-muted/30 p-0.5">
                <Link
                  href={monthModeHref}
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                    !isYearMode
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Mês
                </Link>
                <Link
                  href={`/review?year=${year}`}
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                    isYearMode
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Ano
                </Link>
              </div>
            </div>

            {hasNext ? (
              <Button asChild variant="outline" size="sm" className="gap-1 rounded-lg">
                <Link href={isYearMode ? `/review?year=${year + 1}` : `/review?month=${ym(new Date(year, monthIdx + 1, 1))}`}>
                  {isYearMode ? year + 1 : MONTH_NAMES[(monthIdx + 1) % 12]} <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled className="gap-1 rounded-lg opacity-40">
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isEmpty && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 py-10 text-center">
              <Sparkles className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm font-medium">Nenhum registro neste mês.</p>
              <p className="text-xs text-muted-foreground">Navegue para outro mês ou comece a registrar — tudo aparece aqui.</p>
            </div>
          )}

          {/* Destaques do período — a "capa" narrativa da retrospectiva */}
          {!isEmpty && <MonthHighlights highlights={highlights} />}

          {/* Finanças — saldo em destaque */}
          <Card className="overflow-hidden rounded-2xl border-border/40 bg-card shadow-sm">
            <div className={cn(
              "p-5 sm:p-6",
              balance >= 0
                ? "bg-gradient-to-br from-emerald-500/[0.08] via-card to-card"
                : "bg-gradient-to-br from-rose-500/[0.08] via-card to-card"
            )}>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Wallet className="h-3.5 w-3.5" />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Finanças</p>
                <span className="ml-auto text-[11px] text-muted-foreground">{stats.txCount} lançamentos</span>
              </div>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Saldo do período</p>
                  <p className={cn(
                    "text-3xl sm:text-4xl font-black tracking-tight tabular-nums leading-none mt-1",
                    balance >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-rose-500"
                  )}>
                    {money(balance)}
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <div className="rounded-xl border border-border/50 bg-background/70 px-3.5 py-2 backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Receitas</p>
                    <p className="text-base sm:text-lg font-bold text-emerald-500 tabular-nums">{money(stats.income)}</p>
                    <DeltaBadge compareLabel={cmp} current={stats.income} previous={prev.income} goodWhen="up" format={money} />
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/70 px-3.5 py-2 backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Despesas</p>
                    <p className="text-base sm:text-lg font-bold text-rose-500 tabular-nums">{money(stats.expense)}</p>
                    <DeltaBadge compareLabel={cmp} current={stats.expense} previous={prev.expense} goodWhen="down" format={money} />
                  </div>
                </div>
              </div>
            </div>

            {stats.topCategories.length > 0 && (
              <div className="space-y-2.5 border-t border-border/40 p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Onde o dinheiro foi</p>
                {stats.topCategories.map((c) => (
                  <div key={c.category} className="flex items-center gap-3">
                    <span className="w-28 sm:w-36 truncate text-xs font-medium">{c.category}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                        style={{ width: `${maxCategory > 0 ? Math.max((c.total / maxCategory) * 100, 4) : 0}%` }}
                      />
                    </div>
                    <span className="w-24 text-right font-mono text-xs text-muted-foreground">{money(c.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Tendência financeira de 12 meses */}
          {trend.some((p) => p.income > 0 || p.expense > 0) && (
            <Card className="border-border/40 bg-card shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {isYearMode ? `Tendência · jan–dez de ${year}` : "Tendência · últimos 12 meses"}
                  </p>
                  <span className="ml-auto hidden sm:flex items-center gap-3 text-[10px] font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Receitas</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-500" /> Despesas</span>
                    <span className="flex items-center gap-1"><span className="h-0.5 w-3 rounded bg-primary" /> Saldo</span>
                  </span>
                </div>
                <FinanceTrendChart data={trend} />
              </CardContent>
            </Card>
          )}

          {/* Constância: 1 quadradinho por dia (esforço real registrado) */}
          {viewerId && (
            <Card className="border-border/40 bg-card shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Activity className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {isYearMode ? `Constância · ${year}` : "Constância · últimos 12 meses"}
                  </p>
                </div>
                <ActivityHeatmap
                  userId={viewerId}
                  start={new Date(year, monthIdx - 11, 1)}
                  end={end < now ? end : now}
                />
              </CardContent>
            </Card>
          )}

          {/* Saúde & Corpo */}
          <div className="space-y-3">
            <SectionTitle>Saúde &amp; Corpo</SectionTitle>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Dumbbell} tone="bg-orange-500/10 text-orange-500" label="Treinos"
                value={String(stats.workouts)}
                sub={stats.workoutMinutes > 0 ? `${fmtMinutes(stats.workoutMinutes)} no total` : undefined}
                delta={<DeltaBadge compareLabel={cmp} current={stats.workouts} previous={prev.workouts} goodWhen="up" />}
              />
              <StatCard
                icon={Flame} tone="bg-red-500/10 text-red-500" label="Hábitos cumpridos"
                value={String(stats.habitsDone)}
                delta={<DeltaBadge compareLabel={cmp} current={stats.habitsDone} previous={prev.habitsDone} goodWhen="up" />}
              />
              <StatCard
                icon={Moon} tone="bg-violet-500/10 text-violet-400" label="Sono médio"
                value={stats.sleepAvg !== null ? `${stats.sleepAvg.toFixed(1).replace(".", ",")}h` : "—"}
                sub={stats.sleepAvg === null ? "Sem registros no mês" : "por noite registrada"}
              />
              <StatCard
                icon={Scale} tone="bg-cyan-500/10 text-cyan-500" label="Peso"
                value={
                  stats.weightEnd !== null
                    ? `${fmtKg(stats.weightEnd)} kg`
                    : "—"
                }
                sub={
                  weightDiff !== null && stats.weightStart !== null
                    ? `${fmtKg(stats.weightStart)} → ${fmtKg(stats.weightEnd!)} kg (${weightDiff > 0 ? "+" : ""}${fmtKg(weightDiff)})`
                    : stats.weightEnd === null ? "Sem medições no mês" : undefined
                }
              />
              <StatCard
                icon={Utensils} tone="bg-emerald-500/10 text-emerald-500" label="Refeições registradas"
                value={String(stats.mealsCount)}
                sub={
                  stats.mealsCount > 0 && stats.kcalTotal > 0
                    ? `média de ${Math.round(stats.kcalTotal / stats.mealsCount)} kcal por refeição`
                    : undefined
                }
                delta={<DeltaBadge compareLabel={cmp} current={stats.mealsCount} previous={prev.mealsCount} goodWhen="neutral" />}
              />
            </div>
          </div>

          {/* Produtividade & Mente */}
          <div className="space-y-3">
            <SectionTitle>Produtividade &amp; Mente</SectionTitle>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={BookOpen} tone="bg-blue-500/10 text-blue-500" label="Estudos"
                value={fmtMinutes(stats.studyMinutes)}
                sub={`${stats.studySessions} sessões`}
                delta={<DeltaBadge compareLabel={cmp} current={stats.studyMinutes} previous={prev.studyMinutes} goodWhen="up" format={fmtMinutes} />}
              />
              <StatCard
                icon={Timer} tone="bg-violet-500/10 text-violet-500" label="Foco"
                value={fmtMinutes(stats.focusMinutes)}
                sub={`${stats.focusSessions} sessões`}
                delta={<DeltaBadge compareLabel={cmp} current={stats.focusMinutes} previous={prev.focusMinutes} goodWhen="up" format={fmtMinutes} />}
              />
              <StatCard
                icon={CheckCircle2} tone="bg-yellow-500/10 text-yellow-600" label="Tarefas concluídas"
                value={String(stats.tasksDone)}
                delta={<DeltaBadge compareLabel={cmp} current={stats.tasksDone} previous={prev.tasksDone} goodWhen="up" />}
              />
              <StatCard
                icon={Briefcase} tone="bg-indigo-500/10 text-indigo-500" label="Projetos concluídos"
                value={String(stats.projectsDone)}
                delta={<DeltaBadge compareLabel={cmp} current={stats.projectsDone} previous={prev.projectsDone} goodWhen="up" />}
              />
              <StatCard
                icon={NotebookPen} tone="bg-teal-500/10 text-teal-500" label="Notas criadas"
                value={String(stats.notesCreated)}
                delta={<DeltaBadge compareLabel={cmp} current={stats.notesCreated} previous={prev.notesCreated} goodWhen="up" />}
              />
              <StatCard
                icon={Film} tone="bg-purple-500/10 text-purple-500" label="Mídia concluída"
                value={String(stats.mediaCompleted)}
                sub="Filmes, séries, jogos…"
                delta={<DeltaBadge compareLabel={cmp} current={stats.mediaCompleted} previous={prev.mediaCompleted} goodWhen="neutral" />}
              />
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground/70">
            Comparações são contra {prevLabel}.
          </p>
        </div>
      </PageContainer>
    </PageShell>
  );
}
