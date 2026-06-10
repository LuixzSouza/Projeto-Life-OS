"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isSameDay, parseISO, subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Moon, Flame, CheckCircle2, Loader2 } from "lucide-react";
import { logSleep } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SleepEntry } from "./sleep-types";

const QUICK_HOURS = [5, 6, 6.5, 7, 7.5, 8, 9];

const todayStr = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const fmtH = (h: number) => `${h.toFixed(1).replace(".", ",").replace(",0", "")}h`;

/**
 * Registro de 1 toque — a resposta para "não dá vontade de marcar":
 * a página abre perguntando "Como foi sua noite?" e UM toque numa hora registra.
 * Streak + faixa das últimas 7 noites dão o motivo de voltar amanhã.
 */
export function SleepQuickLog({ data, goal }: { data: SleepEntry[]; goal: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [justLogged, setJustLogged] = useState<number | null>(null);

  const today = new Date();
  const todayEntry = data.find((d) => isSameDay(parseISO(d.date), today));
  const loggedHours = todayEntry?.value ?? justLogged;

  // Sequência de noites registradas (hoje ainda em aberto não quebra a sequência).
  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const day = subDays(today, i);
      const has = data.some((d) => isSameDay(parseISO(d.date), day)) || (i === 0 && justLogged !== null);
      if (has) s++;
      else if (i === 0) continue;
      else break;
    }
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, justLogged]);

  // Últimas 7 noites (mini-barras: verde = meta batida, índigo = abaixo, vazio = sem registro).
  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(today, 6 - i);
      const entry = data.find((d) => isSameDay(parseISO(d.date), day));
      const hours = entry?.value ?? (i === 6 && justLogged !== null ? justLogged : 0);
      return {
        key: day.toISOString(),
        label: format(day, "EEEEE", { locale: ptBR }),
        isToday: i === 6,
        hours,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, justLogged]);

  const quickLog = (hours: number) => {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("value", hours.toString());
        fd.append("date", todayStr());
        const res = await logSleep(fd);
        if (res.success) {
          setJustLogged(hours);
          toast.success(
            hours >= goal
              ? `${fmtH(hours)} registradas — meta batida! 😴`
              : `${fmtH(hours)} registradas. Hoje a cama chama mais cedo. 🌙`,
          );
          router.refresh();
        } else {
          toast.error(res.message);
        }
      } catch {
        toast.error("Não foi possível salvar agora. Tente de novo.");
      }
    });
  };

  const onGoal = loggedHours !== null && loggedHours >= goal;

  return (
    <Card className={cn(
      "relative overflow-hidden rounded-2xl border-border/40 shadow-sm transition-all",
      loggedHours !== null
        ? onGoal ? "bg-emerald-500/[0.06]" : "bg-indigo-500/[0.06]"
        : "bg-card",
    )}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">

        {/* Pergunta / confirmação + ação de 1 toque */}
        <div className="min-w-0 flex-1">
          {loggedHours === null ? (
            <>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Moon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">Como foi sua noite?</h3>
                  <p className="text-xs text-muted-foreground">Toque numa hora — registrado em 1 segundo.</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {QUICK_HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    disabled={pending}
                    onClick={() => quickLog(h)}
                    className={cn(
                      "h-10 rounded-xl border px-3 font-mono text-sm font-bold tabular-nums transition-all active:scale-95",
                      h === goal
                        ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-500"
                        : "border-border/40 bg-background text-foreground/80 hover:border-indigo-500/40 hover:text-indigo-500",
                      pending && "pointer-events-none opacity-50",
                    )}
                    title={h === goal ? `Sua meta (${fmtH(goal)})` : undefined}
                  >
                    {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : fmtH(h)}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Quer precisão? Use <span className="font-medium text-foreground/70">Registrar Noite</span> abaixo com os horários exatos.
              </p>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                onGoal ? "bg-emerald-500/15 text-emerald-500" : "bg-indigo-500/15 text-indigo-500",
              )}>
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">
                  Noite registrada: <span className="font-mono tabular-nums">{fmtH(loggedHours)}</span>
                  {onGoal ? " — meta batida! 🎉" : ""}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {onGoal
                    ? "Recuperação em dia. Continue assim."
                    : `Faltou ${fmtH(Math.max(0, goal - loggedHours))} para a meta — tente dormir mais cedo hoje.`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Últimas 7 noites + sequência */}
        <div className="flex shrink-0 items-end justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
          <div className="flex items-end gap-1.5" aria-label="Últimas 7 noites">
            {week.map((d) => (
              <div key={d.key} className="flex flex-col items-center gap-1">
                <div className="flex h-9 w-3.5 items-end overflow-hidden rounded-full bg-muted/40">
                  {d.hours > 0 && (
                    <div
                      className={cn("w-full rounded-full", d.hours >= goal ? "bg-emerald-500" : "bg-indigo-400")}
                      style={{ height: `${Math.min((d.hours / Math.max(goal, 1)) * 100, 100)}%` }}
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[9px] font-semibold uppercase",
                  d.isToday ? "text-foreground" : "text-muted-foreground/60",
                )}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
          {streak > 1 && (
            <span className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-bold text-orange-500" title="Noites seguidas registradas">
              <Flame className="h-3 w-3" /> {streak} noites
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
