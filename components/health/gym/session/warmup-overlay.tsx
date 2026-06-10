"use client";

import { motion } from "framer-motion";
import { Flame, Plus, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { playClick } from "./sfx";

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
 * Fase de aquecimento — tela cheia antes da 1ª série, com timer próprio e
 * sugestões pelos grupos do treino. O tempo do aquecimento conta no cronômetro
 * total (faz parte do treino), mas as séries só começam quando concluir aqui.
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
  const tips = suggestionsFor(muscleGroups);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] flex flex-col items-center justify-center overflow-y-auto bg-background px-6 py-8"
    >
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-500">
        <Flame className="h-7 w-7" />
      </span>
      <h2 className="text-lg font-bold">Aquecimento</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Prepare o corpo — as séries começam quando você concluir.</p>

      <p className={cn("mt-4 font-mono text-6xl font-bold tabular-nums tracking-tight", over ? "text-orange-500" : "text-foreground")}>
        {over ? `+${fmt(-remaining)}` : fmt(remaining)}
      </p>
      {over && <p className="mt-1 text-xs font-semibold text-orange-500">Tempo previsto concluído — bora treinar!</p>}

      <div className="mt-5 w-full max-w-sm rounded-2xl border border-border/40 bg-card p-3.5 text-left shadow-sm">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sugestões para hoje</p>
        <ul className="space-y-1.5">
          {tips.map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500/70" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex w-full max-w-sm flex-col gap-2">
        <Button onClick={() => { playClick(); onDone(); }} className="h-12 gap-2 text-base font-bold">
          <Play className="h-5 w-5" /> {over ? "Começar o treino" : "Concluir aquecimento"}
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
