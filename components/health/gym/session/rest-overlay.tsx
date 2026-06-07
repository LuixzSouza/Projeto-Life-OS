"use client";

import { Minus, Plus, Play, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(totalSeconds: number): string {
  const s = Math.abs(Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Tela de descanso (100vh, sobre a sessão). Anel de progresso grande; dá pra começar
 * antes (Pular) e, se o tempo passar, conta o EXCEDENTE em vermelho em vez de só avisar.
 */
export function RestOverlay({
  total,
  remaining,
  nextLabel,
  onAdjust,
  onDone,
}: {
  total: number;        // segundos do descanso programado
  remaining: number;    // segundos restantes (negativo = excedente)
  nextLabel?: string;   // dica da próxima série
  onAdjust: (deltaSeconds: number) => void;
  onDone: () => void;   // começar a próxima / pular
}) {
  const over = remaining <= 0;
  const frac = over ? 1 : Math.min(1, Math.max(0, remaining / Math.max(1, total)));

  const R = 130;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - frac);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-background via-background to-primary/5 px-6">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        <Timer className="h-4 w-4" />
        {over ? "Tempo extra" : "Descanso"}
      </div>

      {/* Anel + número */}
      <div className="relative flex items-center justify-center">
        <svg width="300" height="300" viewBox="0 0 300 300" className="-rotate-90">
          <circle cx="150" cy="150" r={R} fill="none" stroke="currentColor" strokeWidth="14" className="text-muted/20" />
          <circle
            cx="150" cy="150" r={R} fill="none" strokeWidth="14" strokeLinecap="round"
            stroke="currentColor"
            className={cn("transition-[stroke-dashoffset] duration-1000 ease-linear", over ? "text-red-500" : "text-primary")}
            strokeDasharray={C}
            strokeDashoffset={over ? 0 : offset}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={cn("font-mono text-6xl font-bold tabular-nums tracking-tight", over ? "text-red-500" : "text-foreground")}>
            {over ? "+" : ""}{fmt(remaining)}
          </span>
          {over && <span className="mt-1 text-xs font-medium text-red-500/80">passou do tempo</span>}
        </div>
      </div>

      {/* Próxima série */}
      {nextLabel && (
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">A seguir</p>
          <p className="text-base font-semibold text-foreground">{nextLabel}</p>
        </div>
      )}

      {/* Ajustes */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onAdjust(-15)}
          className="flex h-12 w-16 items-center justify-center gap-1 rounded-xl border border-border/60 bg-card text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Minus className="h-4 w-4" /> 15
        </button>
        <button
          type="button"
          onClick={() => onAdjust(30)}
          className="flex h-12 w-16 items-center justify-center gap-1 rounded-xl border border-border/60 bg-card text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> 30
        </button>
      </div>

      {/* Começar / pular */}
      <button
        type="button"
        onClick={onDone}
        className={cn(
          "flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl text-base font-bold text-white shadow-lg transition-transform active:scale-[0.98]",
          over ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90",
        )}
      >
        <Play className="h-5 w-5" /> {over ? "Começar agora" : "Estou pronto"}
      </button>
    </div>
  );
}
