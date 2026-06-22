"use client";

import { useMemo } from "react";
import { Trophy, Medal } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { loadMultiplier, type Equipment } from "./session/session-types";
import { ExerciseThumb } from "./session/exercise-thumb";
import type { GymWorkout } from "./gym-types";

// Recordes pessoais de TODOS os tempos: melhor 1RM estimado (Epley) por exercício,
// derivado das séries de trabalho do histórico. Mesma fórmula/peso do badge "1RM"
// da sessão ao vivo (estimatedOneRepMax) — halter usa carga total (×2).
interface RecordRow {
  name: string;
  group?: string;
  oneRm: number;
  weight: number;   // carga digitada da melhor série (por mão, se halter)
  reps: number;
  perHand: boolean;
  date: string;
}

const num = (v: string) => parseFloat((v || "").replace(",", ".")) || 0;

export function PersonalRecordsCard({ workouts }: { workouts: GymWorkout[] }) {
  const records = useMemo<RecordRow[]>(() => {
    const best = new Map<string, RecordRow>();
    for (const w of workouts) {
      for (const ex of w.exercises) {
        const name = ex.name.trim();
        if (!name) continue;
        const mult = loadMultiplier(ex.equipment as Equipment | undefined);
        const perHand = ex.equipment === "dumbbell";
        // Séries de trabalho concluídas (ignora aquecimento); fallback no resumo legado.
        const sets = ex.setLog && ex.setLog.length > 0
          ? ex.setLog.filter((s) => s.done && s.type !== "warmup").map((s) => ({ w: num(s.weight), r: num(s.reps) }))
          : [{ w: num(ex.weight), r: num(ex.reps) }];
        for (const { w: weight, r } of sets) {
          if (weight <= 0 || r <= 0) continue;
          const oneRm = weight * mult * (1 + r / 30); // Epley sobre a carga total
          const key = name.toLowerCase();
          const cur = best.get(key);
          if (!cur || oneRm > cur.oneRm) {
            best.set(key, { name, group: ex.group, oneRm: Math.round(oneRm), weight, reps: r, perHand, date: w.date });
          }
        }
      }
    }
    return Array.from(best.values()).sort((a, b) => b.oneRm - a.oneRm).slice(0, 8);
  }, [workouts]);

  if (records.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-3.5 shadow-sm">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Trophy className="h-3.5 w-3.5 text-amber-500" /> Recordes pessoais
      </p>
      <ul className="space-y-2">
        {records.map((r, i) => (
          <li key={r.name} className="flex items-center gap-2.5">
            <span className="relative shrink-0">
              <ExerciseThumb name={r.name} group={r.group} showPlay={false} className="h-10 w-10 rounded-lg" />
              {i < 3 && (
                <Medal className={medalClass(i)} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.name}</p>
              <p className="text-[11px] text-muted-foreground">
                melhor {r.weight}{r.perHand ? "kg/mão" : "kg"} × {r.reps} · {formatDate(r.date)}
              </p>
            </div>
            <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-right" title="1RM estimado (Epley)">
              <span className="block font-mono text-sm font-bold tabular-nums text-primary">{r.oneRm}</span>
              <span className="block text-[8px] font-semibold uppercase tracking-wider text-primary/70">1RM kg</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Medalha ouro/prata/bronze sobreposta na capa dos 3 maiores 1RMs.
function medalClass(i: number): string {
  const tone = ["text-amber-400", "text-zinc-300", "text-orange-400"][i] ?? "text-muted-foreground";
  return `absolute -left-1 -top-1 h-4 w-4 drop-shadow ${tone} fill-current`;
}
