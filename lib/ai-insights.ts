// Inteligência cruzada do Life OS (Tier 4A do roadmap de IA) — o superpoder
// do banco único: finanças + saúde + estudos + hábitos no mesmo lugar.
//
// - findCorrelations (#15): padrões entre módulos, SQL/agregação pura.
//   A IA só NARRA o que os números mostram — zero alucinação.
// - detectAnomalies (#16): a IA "puxa assunto" via Notification.
// - projectFuture (#17): projeções lineares ("e se?") com premissas explícitas.
//
// Tudo bounded (janelas de 90-180 dias) e tolerante a poucos dados: cada
// insight só sai quando a amostra sustenta a afirmação.

import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 4) return null;
  const mx = avg(xs.slice(0, n));
  const my = avg(ys.slice(0, n));
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? null : num / den;
}

/* ============================================================================
   #15 — MOTOR DE CORRELAÇÕES
   ============================================================================ */

export interface CorrelationInsight {
  padrao: string;   // a frase factual ("você dorme +47min em dias de treino")
  numeros: string;  // os valores que sustentam ("7,4h vs 6,6h")
  amostra: string;  // tamanho da amostra ("21 dias com treino · 40 sem")
}

export async function findCorrelations(userId: string): Promise<{ janela_dias: number; correlacoes: CorrelationInsight[] }> {
  const since = new Date(Date.now() - 90 * DAY_MS);
  since.setHours(0, 0, 0, 0);

  const [sleepRows, workoutRows, txRows, studyRows, energyRows] = await Promise.all([
    prisma.healthMetric.findMany({ where: { userId, type: "SLEEP", date: { gte: since } }, select: { date: true, value: true } }),
    prisma.workout.findMany({ where: { userId, date: { gte: since } }, select: { date: true } }),
    prisma.transaction.findMany({ where: { userId, deletedAt: null, type: "EXPENSE", date: { gte: since } }, select: { date: true, amount: true } }),
    prisma.studySession.findMany({ where: { userId, date: { gte: since } }, select: { date: true, durationMinutes: true } }),
    prisma.energyCheckin.findMany({ where: { userId, date: { gte: since } }, select: { date: true, energy: true } }),
  ]);

  const workoutDays = new Set(workoutRows.map((w) => dayKey(w.date)));
  const out: CorrelationInsight[] = [];

  // 1) Sono × treino (mesma data: a noite do dia em que treinou)
  {
    const withW: number[] = [];
    const withoutW: number[] = [];
    for (const s of sleepRows) (workoutDays.has(dayKey(s.date)) ? withW : withoutW).push(s.value);
    if (withW.length >= 5 && withoutW.length >= 5) {
      const a = avg(withW), b = avg(withoutW);
      const deltaMin = Math.round((a - b) * 60);
      if (Math.abs(deltaMin) >= 15) {
        out.push({
          padrao: deltaMin > 0
            ? `Você dorme em média ${deltaMin} minutos A MAIS nas noites de dias com treino.`
            : `Você dorme em média ${Math.abs(deltaMin)} minutos A MENOS nas noites de dias com treino.`,
          numeros: `${a.toFixed(1)}h (com treino) vs ${b.toFixed(1)}h (sem)`,
          amostra: `${withW.length} noites com treino · ${withoutW.length} sem`,
        });
      }
    }
  }

  // 2) Energia × treino
  {
    const withW: number[] = [];
    const withoutW: number[] = [];
    for (const e of energyRows) (workoutDays.has(dayKey(e.date)) ? withW : withoutW).push(e.energy);
    if (withW.length >= 5 && withoutW.length >= 5) {
      const a = avg(withW), b = avg(withoutW);
      const deltaPct = b !== 0 ? Math.round(((a - b) / b) * 100) : 0;
      if (Math.abs(deltaPct) >= 10) {
        out.push({
          padrao: `Sua energia auto-relatada é ${Math.abs(deltaPct)}% ${deltaPct > 0 ? "maior" : "menor"} em dias com treino.`,
          numeros: `${a.toFixed(1)} vs ${b.toFixed(1)} (escala 1-5)`,
          amostra: `${withW.length} dias com treino · ${withoutW.length} sem`,
        });
      }
    }
  }

  // 3) Gasto semanal × sono médio da semana (Pearson)
  {
    const weekOf = (d: Date) => dayKey(new Date(d.getTime() - ((d.getDay() + 6) % 7) * DAY_MS));
    const spendByWeek = new Map<string, number>();
    for (const t of txRows) {
      const k = weekOf(t.date);
      spendByWeek.set(k, (spendByWeek.get(k) ?? 0) + Number(t.amount));
    }
    const sleepByWeek = new Map<string, number[]>();
    for (const s of sleepRows) {
      const k = weekOf(s.date);
      const arr = sleepByWeek.get(k) ?? [];
      arr.push(s.value);
      sleepByWeek.set(k, arr);
    }
    const weeks = [...spendByWeek.keys()].filter((k) => (sleepByWeek.get(k)?.length ?? 0) >= 3).sort();
    if (weeks.length >= 4) {
      const xs = weeks.map((k) => avg(sleepByWeek.get(k)!));
      const ys = weeks.map((k) => spendByWeek.get(k)!);
      const r = pearson(xs, ys);
      if (r !== null && Math.abs(r) >= 0.45) {
        out.push({
          padrao: r < 0
            ? "Semanas em que você dorme MENOS tendem a ter gastos MAIORES."
            : "Semanas em que você dorme mais coincidem com gastos maiores.",
          numeros: `correlação r=${r.toFixed(2)} entre sono médio e gasto semanal`,
          amostra: `${weeks.length} semanas comparadas`,
        });
      }
    }
  }

  // 4) Estudo × dia da semana (melhor dia)
  {
    const byWd = new Map<number, number[]>();
    for (const s of studyRows) {
      const wd = s.date.getDay();
      const arr = byWd.get(wd) ?? [];
      arr.push(s.durationMinutes);
      byWd.set(wd, arr);
    }
    const totals = [...byWd.entries()].map(([wd, arr]) => ({ wd, total: arr.reduce((a, b) => a + b, 0), sessoes: arr.length }));
    const overall = totals.reduce((a, t) => a + t.total, 0);
    if (totals.length >= 3 && overall >= 300) {
      const best = totals.sort((a, b) => b.total - a.total)[0];
      const sharePct = Math.round((best.total / overall) * 100);
      if (sharePct >= 30) {
        out.push({
          padrao: `Seu dia mais produtivo de estudo é ${WEEKDAYS[best.wd]} — concentra ${sharePct}% dos seus minutos.`,
          numeros: `${best.total} min em ${best.sessoes} sessões`,
          amostra: `${overall} min estudados em 90 dias`,
        });
      }
    }
  }

  // 5) Gasto × dia da semana (dia mais caro)
  {
    const byWd = new Map<number, number>();
    for (const t of txRows) {
      const wd = t.date.getDay();
      byWd.set(wd, (byWd.get(wd) ?? 0) + Number(t.amount));
    }
    const total = [...byWd.values()].reduce((a, b) => a + b, 0);
    if (byWd.size >= 4 && total > 0) {
      const [bestWd, bestTotal] = [...byWd.entries()].sort((a, b) => b[1] - a[1])[0];
      const sharePct = Math.round((bestTotal / total) * 100);
      if (sharePct >= 25) {
        out.push({
          padrao: `${WEEKDAYS[bestWd].charAt(0).toUpperCase() + WEEKDAYS[bestWd].slice(1)} é seu dia mais caro: ${sharePct}% das despesas dos últimos 90 dias.`,
          numeros: `R$ ${bestTotal.toFixed(2)} de R$ ${total.toFixed(2)}`,
          amostra: `${txRows.length} lançamentos`,
        });
      }
    }
  }

  return { janela_dias: 90, correlacoes: out };
}

/* ============================================================================
   #16 — DETECTOR DE ANOMALIAS (vira Notification — a IA puxa assunto)
   ============================================================================ */

export interface Anomaly {
  type: string;       // p/ notifyOnce (idempotência)
  entityId: string;   // idem
  title: string;
  body: string;
  askAi: string;      // prompt do link /ai?q=
}

export async function detectAnomalies(userId: string): Promise<Anomaly[]> {
  const now = new Date();
  const out: Anomaly[] = [];

  // 1) Gasto 3× acima da média da categoria (lançamentos dos últimos 3 dias)
  {
    const recentSince = new Date(now.getTime() - 3 * DAY_MS);
    const baseSince = new Date(now.getTime() - 90 * DAY_MS);
    const [recent, base] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, deletedAt: null, type: "EXPENSE", date: { gte: recentSince } },
        select: { id: true, description: true, category: true, amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["category"],
        where: { userId, deletedAt: null, type: "EXPENSE", date: { gte: baseSince, lt: recentSince } },
        _avg: { amount: true }, _count: { _all: true },
      }),
    ]);
    const avgByCat = new Map(base.filter((b) => b._count._all >= 5).map((b) => [b.category, Number(b._avg.amount ?? 0)]));
    for (const t of recent) {
      const catAvg = avgByCat.get(t.category);
      if (!catAvg || catAvg <= 0) continue;
      const ratio = Number(t.amount) / catAvg;
      if (ratio >= 3) {
        out.push({
          type: "AI_ANOMALY_EXPENSE",
          entityId: t.id,
          title: `Gasto fora do padrão: ${t.description}`,
          body: `R$ ${Number(t.amount).toFixed(2)} — ${ratio.toFixed(1)}× a sua média em ${t.category}.`,
          askAi: `O lançamento "${t.description}" (R$ ${Number(t.amount).toFixed(2)}) ficou ${ratio.toFixed(1)}x acima da minha média em ${t.category}. Analise meus gastos dessa categoria.`,
        });
      }
    }
  }

  // 2) Sono caindo 3 noites seguidas
  {
    const nights = await prisma.healthMetric.findMany({
      where: { userId, type: "SLEEP" },
      orderBy: { date: "desc" }, take: 4,
      select: { value: true, date: true },
    });
    if (nights.length >= 3) {
      const [n1, n2, n3] = nights; // mais recente primeiro
      const lastIsRecent = now.getTime() - n1.date.getTime() <= 2 * DAY_MS;
      if (lastIsRecent && n1.value < n2.value && n2.value < n3.value) {
        out.push({
          type: "AI_ANOMALY_SLEEP",
          entityId: dayKey(n1.date),
          title: "Seu sono está caindo há 3 noites",
          body: `${n3.value}h → ${n2.value}h → ${n1.value}h. Vale ajustar hoje.`,
          askAi: "Meu sono caiu três noites seguidas. Analise minha semana (sono, treinos, agenda) e sugira como recuperar.",
        });
      }
    }
  }

  // 3) Hábito quebrado depois de sequência longa (≥7 dias)
  {
    const habits = await prisma.habit.findMany({
      where: { userId, archived: false },
      select: {
        id: true, name: true,
        logs: { where: { status: "DONE" }, orderBy: { date: "desc" }, take: 30, select: { date: true } },
      },
    });
    const yesterday = new Date(now.getTime() - DAY_MS);
    for (const h of habits) {
      if (h.logs.length < 7) continue;
      const lastDone = h.logs[0].date;
      // Quebrou ontem (último DONE = anteontem) e vinha numa sequência diária ≥7.
      const gapDays = Math.round((Date.parse(dayKey(yesterday)) - Date.parse(dayKey(lastDone))) / DAY_MS);
      if (gapDays !== 1) continue;
      let streak = 1;
      for (let i = 1; i < h.logs.length; i++) {
        const diff = Math.round((h.logs[i - 1].date.getTime() - h.logs[i].date.getTime()) / DAY_MS);
        if (diff === 1) streak++;
        else break;
      }
      if (streak >= 7) {
        out.push({
          type: "AI_ANOMALY_HABIT",
          entityId: `${h.id}:${dayKey(yesterday)}`,
          title: `Sequência de ${streak} dias quebrada: ${h.name}`,
          body: "Um dia perdido não apaga o progresso — retome hoje.",
          askAi: `Quebrei ontem uma sequência de ${streak} dias do hábito "${h.name}". Me ajude a entender o que aconteceu e a retomar hoje.`,
        });
      }
    }
  }

  // 4) Amigo próximo sem interação registrada há 60+ dias
  {
    const cutoff = new Date(now.getTime() - 60 * DAY_MS);
    const friends = await prisma.friend.findMany({
      where: { userId, deletedAt: null, proximity: { in: ["CLOSE", "FAMILY"] }, updatedAt: { lt: cutoff } },
      select: { id: true, name: true, updatedAt: true },
      take: 3,
    });
    for (const f of friends) {
      const days = Math.floor((now.getTime() - f.updatedAt.getTime()) / DAY_MS);
      out.push({
        type: "AI_ANOMALY_FRIEND",
        entityId: `${f.id}:${now.toISOString().slice(0, 7)}`, // 1 lembrete por mês
        title: `Sem registros com ${f.name} há ${days} dias`,
        body: "Conexões próximas pedem manutenção. Que tal uma mensagem hoje?",
        askAi: `Faz ${days} dias que não registro nada com ${f.name}, que é do meu círculo próximo. Me sugira um jeito leve de retomar o contato.`,
      });
    }
  }

  return out;
}

/* ============================================================================
   #17 — SIMULADOR DE FUTURO (projeções lineares com premissas explícitas)
   ============================================================================ */

export type ProjectionMetric = "EXPENSE" | "WEIGHT" | "WISHLIST";

export async function projectFuture(userId: string, metric: ProjectionMetric, horizonDays = 90): Promise<Record<string, unknown>> {
  const horizon = Math.min(Math.max(Math.floor(horizonDays), 7), 365);
  const now = new Date();

  switch (metric) {
    case "EXPENSE": {
      const since = new Date(now.getTime() - 60 * DAY_MS);
      const agg = await prisma.transaction.aggregate({
        where: { userId, deletedAt: null, type: "EXPENSE", date: { gte: since } },
        _sum: { amount: true }, _count: { _all: true },
      });
      const total = Number(agg._sum.amount ?? 0);
      if (agg._count._all < 5) return { erro: "Poucos lançamentos nos últimos 60 dias para projetar." };
      const daily = total / 60;
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const daysLeft = Math.max(0, Math.ceil((monthEnd.getTime() - now.getTime()) / DAY_MS));
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthAgg = await prisma.transaction.aggregate({
        where: { userId, deletedAt: null, type: "EXPENSE", date: { gte: monthStart } },
        _sum: { amount: true },
      });
      const monthSoFar = Number(monthAgg._sum.amount ?? 0);
      return {
        premissa: `ritmo médio dos últimos 60 dias (R$ ${daily.toFixed(2)}/dia), projeção linear`,
        gasto_medio_diario: Number(daily.toFixed(2)),
        mes_atual: { ja_gasto: Number(monthSoFar.toFixed(2)), projecao_fim_do_mes: Number((monthSoFar + daily * daysLeft).toFixed(2)) },
        projecao_horizonte: { dias: horizon, total_projetado: Number((daily * horizon).toFixed(2)) },
      };
    }
    case "WEIGHT": {
      const since = new Date(now.getTime() - 180 * DAY_MS);
      const rows = await prisma.bodyMeasurement.findMany({
        where: { userId, date: { gte: since } },
        orderBy: { date: "asc" },
        select: { date: true, weight: true },
      });
      if (rows.length < 3) return { erro: "Menos de 3 pesagens nos últimos 6 meses — registre mais para projetar." };
      // Regressão linear simples (dias × kg).
      const t0 = rows[0].date.getTime();
      const xs = rows.map((r) => (r.date.getTime() - t0) / DAY_MS);
      const ys = rows.map((r) => r.weight);
      const mx = avg(xs), my = avg(ys);
      let num = 0, den = 0;
      for (let i = 0; i < xs.length; i++) {
        num += (xs[i] - mx) * (ys[i] - my);
        den += (xs[i] - mx) ** 2;
      }
      const slope = den === 0 ? 0 : num / den; // kg/dia
      const current = ys[ys.length - 1];
      return {
        premissa: `tendência linear das últimas ${rows.length} pesagens (${(slope * 7).toFixed(2)} kg/semana)`,
        peso_atual_kg: current,
        ritmo_kg_semana: Number((slope * 7).toFixed(2)),
        projecao: { dias: horizon, peso_estimado_kg: Number((current + slope * horizon).toFixed(1)) },
        aviso: "Projeção linear simples — não considera platôs nem mudanças de rotina.",
      };
    }
    case "WISHLIST": {
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
      const totals = await prisma.transaction.groupBy({
        by: ["type"],
        where: { userId, deletedAt: null, date: { gte: threeMonthsAgo, lt: lastMonthEnd } },
        _sum: { amount: true },
      });
      const income = Number(totals.find((t) => t.type === "INCOME")?._sum.amount ?? 0);
      const expense = Number(totals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0);
      const monthlyNet = (income - expense) / 3;
      const items = await prisma.wishlistItem.findMany({
        where: { userId, deletedAt: null, status: { not: "PURCHASED" } },
        orderBy: { priority: "asc" }, take: 5,
        select: { name: true, price: true, saved: true },
      });
      if (items.length === 0) return { erro: "Nenhum item ativo na wishlist." };
      return {
        premissa: `sobra média mensal REAL dos últimos 3 meses fechados (R$ ${monthlyNet.toFixed(2)})`,
        sobra_mensal: Number(monthlyNet.toFixed(2)),
        itens: items.map((i) => {
          const falta = Number(i.price) - Number(i.saved);
          const semanas = monthlyNet > 0 ? Math.ceil(falta / (monthlyNet / 4.33)) : null;
          return {
            item: i.name,
            preco: Number(i.price),
            guardado: Number(i.saved),
            falta: Number(falta.toFixed(2)),
            semanas_estimadas: semanas,
            ...(semanas === null ? { aviso: "sobra mensal negativa — sem data prevista nesse ritmo" } : {}),
          };
        }),
      };
    }
  }
}
