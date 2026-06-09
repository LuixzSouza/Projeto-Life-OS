// Radar de Pontos Cegos (Roadmap Fase 4 — #23): audita a densidade de registros
// por ÁREA de vida nos últimos 14 dias e acende alerta nas negligenciadas.
// Server component assíncrono (envolver em <Suspense>); some quando o usuário
// ainda não tem dados suficientes para o radar fazer sentido.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import {
  Radar, Dumbbell, Moon, BookOpen, Gamepad2, Users, Wallet, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const WINDOW_DAYS = 14;

interface AreaSignal {
  key: string;
  label: string;
  icon: typeof Radar;
  /** Quantos registros a área teve na janela. */
  signals: number;
}

function statusOf(signals: number): "ok" | "weak" | "blind" {
  if (signals === 0) return "blind";
  if (signals < 3) return "weak";
  return "ok";
}

const STATUS_META = {
  ok: { bar: "bg-emerald-500", text: "text-emerald-500", label: "ativa" },
  weak: { bar: "bg-amber-500", text: "text-amber-500", label: "fraca" },
  blind: { bar: "bg-rose-500", text: "text-rose-500", label: "ponto cego" },
} as const;

export async function BlindSpotRadar() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (WINDOW_DAYS - 1));

  // Cada área soma os "sinais de vida" dos seus modelos na janela.
  const [workouts, meals, habitLogs, sleeps, studySessions, notesTouched, media, social, transactions, tasksTouched] =
    await Promise.all([
      prisma.workout.count({ where: { userId, date: { gte: start } } }),
      prisma.meal.count({ where: { userId, date: { gte: start } } }),
      prisma.habitLog.count({ where: { userId, date: { gte: start } } }),
      prisma.healthMetric.count({ where: { userId, type: "SLEEP", date: { gte: start } } }),
      prisma.studySession.count({ where: { userId, date: { gte: start } } }),
      prisma.studyNote.count({ where: { userId, deletedAt: null, updatedAt: { gte: start } } }),
      prisma.mediaItem.count({ where: { userId, updatedAt: { gte: start } } }),
      prisma.friend.count({ where: { userId, deletedAt: null, updatedAt: { gte: start } } }),
      prisma.transaction.count({ where: { userId, deletedAt: null, createdAt: { gte: start } } }),
      prisma.task.count({ where: { userId, deletedAt: null, updatedAt: { gte: start } } }),
    ]);

  const areas: AreaSignal[] = [
    { key: "body", label: "Corpo", icon: Dumbbell, signals: workouts + meals + habitLogs },
    { key: "rest", label: "Descanso", icon: Moon, signals: sleeps },
    { key: "mind", label: "Mente", icon: BookOpen, signals: studySessions + notesTouched },
    { key: "leisure", label: "Lazer", icon: Gamepad2, signals: media },
    { key: "social", label: "Social", icon: Users, signals: social },
    { key: "money", label: "Finanças", icon: Wallet, signals: transactions },
    { key: "work", label: "Projetos", icon: Layers, signals: tasksTouched },
  ];

  const total = areas.reduce((acc, a) => acc + a.signals, 0);
  // Sem uso geral ainda → radar não tem o que auditar (não assusta usuário novo).
  if (total < 5) return null;

  const blind = areas.filter((a) => statusOf(a.signals) === "blind");
  const max = Math.max(...areas.map((a) => a.signals), 1);

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <Radar className="h-3.5 w-3.5 text-primary" /> Radar de pontos cegos · {WINDOW_DAYS} dias
        </p>
        {blind.length > 0 && (
          <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-500">
            {blind.length} área(s) no escuro
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-7 lg:gap-x-4">
        {areas.map((area) => {
          const st = STATUS_META[statusOf(area.signals)];
          const Icon = area.icon;
          return (
            <div key={area.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <p className="flex min-w-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-3 w-3 shrink-0" /> <span className="truncate">{area.label}</span>
                </p>
                <span className={cn("shrink-0 text-[10px] font-black tabular-nums", st.text)}>{area.signals}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className={cn("h-full rounded-full", st.bar)}
                  style={{ width: `${Math.max((area.signals / max) * 100, area.signals > 0 ? 8 : 4)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {blind.length > 0 && (
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          <strong className="text-rose-500">
            {blind.map((a) => a.label).join(", ")}
          </strong>{" "}
          sem nenhum registro em {WINDOW_DAYS} dias. Área negligenciada não aparece nos insights — o sistema só
          enxerga o que você registra.
        </p>
      )}
    </div>
  );
}
