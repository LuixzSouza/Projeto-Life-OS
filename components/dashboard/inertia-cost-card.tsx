// Custo Fantasma da Inércia (Roadmap Fase 4 — #20): torna VISÍVEL o preço de não
// agir. Dois contadores honestos:
//   1. Treino parado: dias desde o último treino vs o ritmo recente do próprio
//      usuário → treinos "devidos" acumulando.
//   2. Dinheiro parado: saldo em contas não-investimento × inflação → perda
//      projetada por ano (e por dia, para doer no concreto).
// Server component assíncrono (envolver em <Suspense>); some sem dados.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { Ghost, Dumbbell, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

// IPCA aproximado (a.a.) — propósito ilustrativo, não previsão.
const INFLATION_RATE = 0.045;
// Considera "treino parado" a partir deste nº de dias sem registrar treino.
const WORKOUT_ALERT_DAYS = 4;

function money(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 864e5);
}

export async function InertiaCostCard() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 60);

  const [lastWorkout, recentWorkouts, accounts] = await Promise.all([
    prisma.workout.findFirst({ where: { userId }, orderBy: { date: "desc" }, select: { date: true } }),
    prisma.workout.count({ where: { userId, date: { gte: windowStart } } }),
    prisma.account.findMany({ where: { userId }, select: { type: true, balance: true } }),
  ]);

  // --- Treino parado ---
  const daysSinceWorkout = lastWorkout ? daysSince(new Date(lastWorkout.date)) : null;
  // Ritmo recente do próprio usuário (treinos/semana nos últimos 60 dias).
  const weeklyRate = recentWorkouts / (60 / 7);
  const owedWorkouts =
    daysSinceWorkout != null && weeklyRate > 0 ? Math.floor((daysSinceWorkout / 7) * weeklyRate) : 0;
  const workoutAlert = daysSinceWorkout != null && daysSinceWorkout >= WORKOUT_ALERT_DAYS && weeklyRate > 0;

  // --- Dinheiro parado (contas que não rendem; investimento fica de fora) ---
  const idleBalance = accounts
    .filter((a) => !/invest|aplica|corretora|cripto/i.test(a.type))
    .reduce((acc, a) => acc + Number(a.balance), 0);
  const yearlyLoss = idleBalance * INFLATION_RATE;
  const moneyAlert = yearlyLoss >= 50; // abaixo disso o número vira ruído

  if (!workoutAlert && !moneyAlert) return null; // sem fantasma, sem card

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <p className="mb-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        <Ghost className="h-3.5 w-3.5 text-violet-500" /> Custo fantasma da inércia
      </p>

      <div className={cn("grid gap-3", workoutAlert && moneyAlert ? "sm:grid-cols-2" : "grid-cols-1")}>
        {workoutAlert && daysSinceWorkout != null && (
          <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-background p-4">
            <div className="rounded-xl bg-rose-500/10 p-2 text-rose-500">
              <Dumbbell className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-snug text-foreground">
                {daysSinceWorkout} dia{daysSinceWorkout === 1 ? "" : "s"} sem treino
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                No seu ritmo recente (~{weeklyRate.toFixed(1)}×/semana), {owedWorkouts > 0
                  ? <>já são <strong className="text-rose-500">{owedWorkouts} treino{owedWorkouts === 1 ? "" : "s"} devido{owedWorkouts === 1 ? "" : "s"}</strong> acumulando.</>
                  : "a constância que você construiu começa a escorregar."} Cada dia parado empurra o resultado para mais longe.
              </p>
            </div>
          </div>
        )}

        {moneyAlert && (
          <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-background p-4">
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-500">
              <Coins className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-snug text-foreground">
                {money(idleBalance)} parados em conta
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Sem render, a inflação (~{Math.round(INFLATION_RATE * 100 * 10) / 10}% a.a.) come{" "}
                <strong className="text-amber-500">{money(yearlyLoss)}/ano</strong> (~{money(yearlyLoss / 365)}/dia)
                do seu poder de compra. O balde &ldquo;Futuro&rdquo; do orçamento é a saída.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
