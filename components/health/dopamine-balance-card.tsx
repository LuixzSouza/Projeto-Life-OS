// Balanço Dopaminérgico (Roadmap Fase 4 — #24, EXPERIMENTO): compara, nos
// últimos 7 dias, a dopamina CONQUISTADA (foco, treino, estudo, hábitos) com a
// dopamina BARATA estimável pelos dados internos (consumo de mídia + gasto por
// impulso no balde "Prazeres"). Sem integração externa (Screen Time/AppBlock):
// é um proxy honesto, e o card diz isso. Server component; some sem dados.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { classifyExpense } from "@/lib/budget-buckets";
import { Scale, Zap, Popcorn } from "lucide-react";
import { cn } from "@/lib/utils";

const WINDOW_DAYS = 7;

// Pesos em "minutos equivalentes" — heurística do experimento, não ciência.
const W = { workout: 45, study: 30, habit: 15, media: 30, pleasureBuy: 20 } as const;

export async function DopamineBalanceCard() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (WINDOW_DAYS - 1));

  const [focusAgg, workouts, studySessions, habitsDone, mediaTouched, expenses] = await Promise.all([
    prisma.focusSession.aggregate({ where: { userId, endedAt: { gte: start } }, _sum: { minutes: true } }),
    prisma.workout.count({ where: { userId, date: { gte: start } } }),
    prisma.studySession.count({ where: { userId, date: { gte: start } } }),
    prisma.habitLog.count({ where: { userId, date: { gte: start }, status: "DONE" } }),
    prisma.mediaItem.count({ where: { userId, deletedAt: null, updatedAt: { gte: start } } }),
    prisma.transaction.findMany({
      where: { userId, deletedAt: null, type: "EXPENSE", date: { gte: start } },
      select: { amount: true, category: true },
    }),
  ]);

  const pleasureBuys = expenses.filter(
    (t) => classifyExpense({ amount: Number(t.amount), category: t.category, fromRecurring: false }) === "pleasure",
  ).length;

  const focusMin = focusAgg._sum.minutes ?? 0;
  const earned = focusMin + workouts * W.workout + studySessions * W.study + habitsDone * W.habit;
  const cheap = mediaTouched * W.media + pleasureBuys * W.pleasureBuy;

  if (earned + cheap === 0) return null; // sem sinal, sem balanço

  const earnedPct = Math.round((earned / (earned + cheap)) * 100);
  const verdict =
    earnedPct >= 70
      ? { text: "Semana de construtor: a maior parte da sua recompensa veio de esforço real.", tone: "text-emerald-500" }
      : earnedPct >= 45
        ? { text: "Equilíbrio razoável — mas a dopamina barata está disputando espaço.", tone: "text-amber-500" }
        : { text: "A recompensa fácil dominou a semana. Um bloco de foco amanhã cedo reverte o placar.", tone: "text-rose-500" };

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <Scale className="h-3.5 w-3.5 text-primary" /> Balanço dopaminérgico · {WINDOW_DAYS} dias
        </p>
        <span className="rounded-md bg-muted/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          experimento
        </span>
      </div>

      <div className="mb-2 flex h-3 w-full overflow-hidden rounded-full bg-muted/60">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${earnedPct}%` }} />
        <div className="h-full bg-rose-400/70 transition-all" style={{ width: `${100 - earnedPct}%` }} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/40 bg-background p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500">
            <Zap className="h-3 w-3" /> Conquistada · {earnedPct}%
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {focusMin > 0 && <>{focusMin} min de foco · </>}
            {workouts > 0 && <>{workouts} treino(s) · </>}
            {studySessions > 0 && <>{studySessions} sessão(ões) de estudo · </>}
            {habitsDone > 0 && <>{habitsDone} hábito(s) cumprido(s)</>}
            {earned === 0 && "nada ainda — o placar abre com 25 min de foco"}
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-400">
            <Popcorn className="h-3 w-3" /> Barata (proxy) · {100 - earnedPct}%
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {mediaTouched > 0 && <>{mediaTouched} mídia(s) consumida(s) · </>}
            {pleasureBuys > 0 && <>{pleasureBuys} compra(s) por impulso</>}
            {cheap === 0 && "nada detectado nos dados internos"}
          </p>
        </div>
      </div>

      <p className={cn("mt-3 text-[11px] font-bold", verdict.tone)}>{verdict.text}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Proxy com dados internos (sem Screen Time): mídia e compras de impulso representam a recompensa fácil.
      </p>
    </div>
  );
}
