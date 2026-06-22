"use client";

import { useState } from "react";
import { Dumbbell, Trophy, Gamepad2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { playClick, hapticTick } from "./sfx";

// Mini-jogo opcional para o descanso: "acerte o alvo" num grid 3×3. Uma célula
// fica acesa (halter); tocá-la pontua e move o alvo. É puramente dirigido por
// toque (sem timers internos) — robusto e leve. Para automaticamente quando o
// descanso acaba (`active=false`): o grid trava e mostra a pontuação final.
const BEST_KEY = "lifeos:gym:minigame-best";
const CELLS = 9;

function randCell(except: number): number {
  let n = Math.floor(Math.random() * CELLS);
  if (n === except) n = (n + 1 + Math.floor(Math.random() * (CELLS - 1))) % CELLS;
  return n;
}

export function RestMiniGame({ active, onExit }: { active: boolean; onExit: () => void }) {
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [lit, setLit] = useState(() => Math.floor(Math.random() * CELLS));
  const [best, setBest] = useState(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(window.localStorage.getItem(BEST_KEY) ?? "0", 10) || 0;
  });

  const hit = (i: number) => {
    if (!active) return;
    if (i === lit) {
      const next = score + 1;
      setScore(next);
      setLit((cur) => randCell(cur));
      hapticTick();
      playClick();
      if (next > best) {
        setBest(next);
        try { window.localStorage.setItem(BEST_KEY, String(next)); } catch { /* ignora */ }
      }
    } else {
      setMisses((m) => m + 1);
    }
  };

  const restart = () => { setScore(0); setMisses(0); setLit(Math.floor(Math.random() * CELLS)); };

  return (
    <div className="relative flex w-full max-w-xs flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <Gamepad2 className="h-4 w-4 text-primary" /> Acerte o alvo
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
          <Trophy className="h-3 w-3 text-amber-500" /> recorde {best}
        </span>
      </div>

      <div className="flex w-full items-center justify-around rounded-xl border border-border/40 bg-card/60 py-2">
        <div className="flex flex-col items-center">
          <span className="font-mono text-2xl font-black tabular-nums text-primary">{score}</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">pontos</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-mono text-2xl font-black tabular-nums text-muted-foreground/70">{misses}</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">erros</span>
        </div>
      </div>

      <div className="grid w-full grid-cols-3 gap-2">
        {Array.from({ length: CELLS }, (_, i) => {
          const on = i === lit && active;
          return (
            <button
              key={i}
              type="button"
              onClick={() => hit(i)}
              disabled={!active}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl border transition-all active:scale-95",
                on
                  ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105"
                  : "border-border/40 bg-muted/30 text-transparent",
              )}
              aria-label={on ? "Alvo — toque!" : "Vazio"}
            >
              <Dumbbell className="h-6 w-6" />
            </button>
          );
        })}
      </div>

      {!active && (
        <div className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-center">
          <p className="text-sm font-bold text-emerald-600">Tempo de descanso acabou!</p>
          <p className="text-xs text-muted-foreground">Você fez <span className="font-bold text-foreground">{score}</span> pontos. Bora pra próxima série.</p>
        </div>
      )}

      <div className="flex w-full gap-2">
        <button
          type="button"
          onClick={restart}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
        </button>
        <button
          type="button"
          onClick={() => { playClick(); onExit(); }}
          className="flex-1 rounded-xl border border-border/60 bg-card py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          Voltar ao descanso
        </button>
      </div>
    </div>
  );
}
