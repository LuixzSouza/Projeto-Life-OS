// Destaques do Mês (estilo "Wrapped"): transforma os números crus da
// Retrospectiva em conquistas e alertas em linguagem humana. Função PURA —
// deriva tudo de MonthStats + o período anterior, sem query nova, sem IA.
// Reutilizável na página e (futuramente) no PDF.

import type { MonthStats } from "@/components/review/review-types";
import { fmtMinutes, fmtKg } from "@/components/review/review-types";

export type HighlightKind = "win" | "attention" | "info";
export type HighlightIcon =
  | "piggy" | "trophy" | "trendingUp" | "trendingDown"
  | "moon" | "scale" | "wallet" | "sparkles";

export interface Highlight {
  id: string;
  icon: HighlightIcon;
  kind: HighlightKind;
  title: string;
  detail: string;
}

export interface HighlightOptions {
  money: (v: number) => string;
  cmp: string; // "mês anterior" | "ano anterior"
}

// Métricas em que "mais é melhor" — base para achar o maior avanço/recuo.
interface Mover {
  key: keyof MonthStats;
  label: string;
  fmt: (v: number) => string;
  minAbs: number; // variação mínima p/ não celebrar ruído
}
const asCount = (v: number) => String(Math.round(v));
const MOVERS: Mover[] = [
  { key: "focusMinutes", label: "Foco", fmt: fmtMinutes, minAbs: 30 },
  { key: "studyMinutes", label: "Estudo", fmt: fmtMinutes, minAbs: 30 },
  { key: "workouts", label: "Treinos", fmt: asCount, minAbs: 2 },
  { key: "tasksDone", label: "Tarefas concluídas", fmt: asCount, minAbs: 3 },
  { key: "habitsDone", label: "Hábitos", fmt: asCount, minAbs: 3 },
  { key: "notesCreated", label: "Notas", fmt: asCount, minAbs: 3 },
  { key: "projectsDone", label: "Projetos", fmt: asCount, minAbs: 1 },
];

interface MoverResult {
  mover: Mover;
  cur: number;
  prev: number;
  pct: number; // Infinity quando saiu do zero
}

function evalMovers(stats: MonthStats, prev: MonthStats): MoverResult[] {
  const out: MoverResult[] = [];
  for (const mover of MOVERS) {
    const cur = Number(stats[mover.key] ?? 0);
    const before = Number(prev[mover.key] ?? 0);
    if (cur === before) continue;
    const pct = before > 0 ? ((cur - before) / before) * 100 : (cur > 0 ? Infinity : -Infinity);
    out.push({ mover, cur, prev: before, pct });
  }
  return out;
}

/**
 * Gera os destaques do período, ordenados por relevância (conquistas primeiro,
 * depois alertas, depois informativos). `limit` corta a lista para caber na faixa.
 */
export function computeHighlights(
  stats: MonthStats,
  prev: MonthStats,
  { money, cmp }: HighlightOptions,
  limit = 6,
): Highlight[] {
  const wins: Highlight[] = [];
  const attention: Highlight[] = [];
  const info: Highlight[] = [];

  // 1) Finanças: guardou dinheiro vs fechou no vermelho.
  const balance = stats.income - stats.expense;
  if (stats.income > 0 || stats.expense > 0) {
    if (balance > 0) {
      wins.push({
        id: "saved",
        icon: "piggy",
        kind: "win",
        title: `Guardou ${money(balance)}`,
        detail: `Receita ${money(stats.income)} maior que a despesa ${money(stats.expense)}.`,
      });
    } else if (balance < 0) {
      attention.push({
        id: "deficit",
        icon: "wallet",
        kind: "attention",
        title: `No vermelho: ${money(balance)}`,
        detail: `A despesa (${money(stats.expense)}) passou a receita (${money(stats.income)}).`,
      });
    }
  }

  // 2/3) Maior avanço e maior recuo entre as métricas de esforço.
  const movers = evalMovers(stats, prev);
  const gained = movers.filter((m) => m.pct > 0);
  const lost = movers.filter((m) => m.pct < 0 && m.prev > 0);

  const best = gained.sort((a, b) => b.pct - a.pct)[0];
  if (best) {
    const changedEnough = best.prev === 0 ? best.cur >= best.mover.minAbs : Math.abs(best.cur - best.prev) >= best.mover.minAbs;
    if (changedEnough) {
      wins.push({
        id: `up-${String(best.mover.key)}`,
        icon: "trendingUp",
        kind: "win",
        title: best.prev === 0
          ? `${best.mover.label}: do zero ao topo`
          : `${best.mover.label} +${Math.round(best.pct)}%`,
        detail: best.prev === 0
          ? `Zerado no ${cmp} → ${best.mover.fmt(best.cur)} agora.`
          : `${best.mover.fmt(best.prev)} → ${best.mover.fmt(best.cur)} vs ${cmp}.`,
      });
    }
  }

  const worst = lost.sort((a, b) => a.pct - b.pct)[0];
  if (worst && Math.abs(worst.cur - worst.prev) >= worst.mover.minAbs && Math.abs(worst.pct) >= 25) {
    attention.push({
      id: `down-${String(worst.mover.key)}`,
      icon: "trendingDown",
      kind: "attention",
      title: `${worst.mover.label} ${Math.round(worst.pct)}%`,
      detail: `${worst.mover.fmt(worst.prev)} → ${worst.mover.fmt(worst.cur)} vs ${cmp}. Bora retomar?`,
    });
  }

  // 4) Sono: bom ou curto.
  if (stats.sleepAvg !== null) {
    const h = stats.sleepAvg.toFixed(1).replace(".", ",");
    if (stats.sleepAvg >= 7.5) {
      wins.push({ id: "sleep-good", icon: "moon", kind: "win", title: `Sono em dia: ${h}h`, detail: "Média por noite registrada — descanso de respeito." });
    } else if (stats.sleepAvg < 6) {
      attention.push({ id: "sleep-low", icon: "moon", kind: "attention", title: `Sono curto: ${h}h`, detail: "Média por noite abaixo de 6h. Mira em 7h+." });
    }
  }

  // 5) Peso: variação relevante no período.
  if (stats.weightStart !== null && stats.weightEnd !== null) {
    const diff = stats.weightEnd - stats.weightStart;
    if (Math.abs(diff) >= 0.5) {
      info.push({
        id: "weight",
        icon: "scale",
        kind: "info",
        title: `Peso ${diff > 0 ? "subiu" : "desceu"} ${fmtKg(Math.abs(diff))} kg`,
        detail: `${fmtKg(stats.weightStart)} → ${fmtKg(stats.weightEnd)} kg no período.`,
      });
    }
  }

  // 6) Para onde o dinheiro foi (maior categoria de gasto).
  const top = stats.topCategories[0];
  if (top && stats.expense > 0) {
    const share = Math.round((top.total / stats.expense) * 100);
    info.push({
      id: "top-category",
      icon: "wallet",
      kind: "info",
      title: `Maior gasto: ${top.category}`,
      detail: `${money(top.total)} — ${share}% das despesas do período.`,
    });
  }

  return [...wins, ...attention, ...info].slice(0, limit);
}
