"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Plus, Play, SkipForward, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { playClick, playSuccess, hapticTick } from "./sfx";

// Sugestões de aquecimento por grupo muscular (curtas, sem equipamento especial).
const WARMUP_BY_GROUP: Record<string, string[]> = {
  Peito: ["Flexão leve (1×10)", "Círculos de braço (30s)", "Abertura com elástico ou sem carga (1×15)"],
  Costas: ["Barra fixa assistida ou remada leve (1×12)", "Alongamento de lat no apoio (30s/lado)", "Retração de escápulas (1×15)"],
  Ombros: ["Rotação externa com elástico (1×15/lado)", "Elevação lateral sem carga (1×15)", "Círculos de braço (30s)"],
  Biceps: ["Rosca com barra vazia (1×15)", "Alongamento de punho/antebraço (30s)"],
  Triceps: ["Tríceps no cabo bem leve (1×15)", "Alongamento de tríceps acima da cabeça (30s/lado)"],
  Pernas: ["Agachamento livre sem carga (1×15)", "Avanço alternado (1×10/perna)", "Mobilidade de tornozelo e quadril (45s)"],
  Abdomen: ["Prancha (30s)", "Dead bug (1×10/lado)"],
  Cardio: ["Esteira ou bike em ritmo leve (3-5 min)"],
};

const GENERIC = ["Esteira/bike leve (3-5 min)", "Mobilidade articular geral (1 min)", "1ª série de cada exercício com ~50% da carga"];

function suggestionsFor(groups: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const g of groups) {
    for (const s of WARMUP_BY_GROUP[g] ?? []) {
      if (!seen.has(s)) { seen.add(s); out.push(s); }
    }
  }
  return out.length > 0 ? out.slice(0, 6) : GENERIC;
}

function fmt(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Fase de aquecimento — tela cheia antes da 1ª série, com timer próprio e um
 * CHECKLIST interativo gerado pelos grupos do treino: marcar cada item dá
 * feedback (som/vibração) e enche a barra; com tudo feito, o CTA pulsa.
 * O tempo do aquecimento conta no cronômetro total (faz parte do treino).
 */
export function WarmupOverlay({
  remaining,
  muscleGroups,
  onExtend,
  onDone,
}: {
  remaining: number; // segundos (pode ficar negativo = passou do previsto)
  muscleGroups: string[];
  onExtend: (minutes: number) => void;
  onDone: () => void;
}) {
  const over = remaining <= 0;
  const tips = useMemo(() => suggestionsFor(muscleGroups), [muscleGroups]);

  // Checklist local (só desta fase — não precisa persistir).
  const [checked, setChecked] = useState<boolean[]>(() => tips.map(() => false));
  const doneCount = checked.filter(Boolean).length;
  const allChecked = tips.length > 0 && doneCount === tips.length;
  const pct = tips.length > 0 ? Math.round((doneCount / tips.length) * 100) : 0;

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      // Som/vibração só ao MARCAR; completar a lista ganha um "tcham" maior.
      if (next[i]) {
        hapticTick();
        if (next.every(Boolean)) playSuccess();
        else playClick();
      }
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] flex flex-col items-center overflow-y-auto bg-background px-5 py-6 sm:justify-center"
    >
      <span className="mb-3 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-500">
        <Flame className="h-7 w-7" />
      </span>
      <h2 className="text-lg font-bold">Aquecimento</h2>
      <p className="mt-0.5 text-center text-xs text-muted-foreground">Prepare o corpo — as séries começam quando você concluir.</p>

      <p className={cn("mt-3 font-mono text-5xl font-bold tabular-nums tracking-tight sm:text-6xl", over ? "text-orange-500" : "text-foreground")}>
        {over ? `+${fmt(-remaining)}` : fmt(remaining)}
      </p>
      {over && <p className="mt-1 text-xs font-semibold text-orange-500">Tempo previsto concluído — bora treinar!</p>}

      {/* Checklist interativo (gerado pelos grupos musculares de hoje) */}
      <div className="mt-5 w-full max-w-sm rounded-2xl border border-border/40 bg-card p-3.5 text-left shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Checklist de aquecimento
          </p>
          <span className={cn("font-mono text-[11px] font-bold tabular-nums", allChecked ? "text-emerald-500" : "text-orange-500")}>
            {doneCount}/{tips.length}
          </span>
        </div>

        {/* Barra de progresso do checklist */}
        <div className="mb-2.5 h-1 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className={cn("h-full rounded-full transition-all duration-500 ease-out", allChecked ? "bg-emerald-500" : "bg-orange-500")}
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="space-y-0.5">
          {tips.map((t, i) => {
            const isDone = checked[i];
            return (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg px-1.5 py-2 text-left text-sm transition-colors active:bg-muted/50",
                    isDone && "opacity-55",
                  )}
                  aria-pressed={isDone}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                      isDone ? "border-orange-500 bg-orange-500 text-white" : "border-border text-transparent",
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <span className={cn("leading-snug", isDone && "line-through")}>{t}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {allChecked && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex items-center gap-1.5 border-t border-border/30 pt-2.5 text-xs font-bold text-emerald-600"
          >
            <Flame className="h-3.5 w-3.5" /> Corpo pronto — pode começar!
          </motion.p>
        )}
      </div>

      <div className="mt-5 flex w-full max-w-sm flex-col gap-2 pb-2">
        <Button
          onClick={() => { playClick(); onDone(); }}
          className={cn("h-12 gap-2 text-base font-bold", allChecked && "animate-pulse")}
        >
          <Play className="h-5 w-5" /> {over || allChecked ? "Começar o treino" : "Concluir aquecimento"}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { playClick(); onExtend(2); }} className="h-10 flex-1 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> +2 min
          </Button>
          <Button variant="ghost" onClick={() => { playClick(); onDone(); }} className="h-10 flex-1 gap-1.5 text-xs text-muted-foreground">
            <SkipForward className="h-3.5 w-3.5" /> Pular aquecimento
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
