"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, Play, Timer, Repeat2, ChevronRight, Minimize2, History, TrendingUp, TrendingDown, Lock, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { playClick } from "./sfx";
import { ExerciseThumb } from "./exercise-thumb";
import { RestMiniGame } from "./rest-minigame";
import type { ExerciseHistoryPoint, LastPerf } from "./session-types";

function fmt(totalSeconds: number): string {
  const s = Math.abs(Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function relDays(iso?: string): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `há ${weeks}sem`;
  return `há ${Math.max(1, Math.floor(days / 30))}m`;
}

interface NextInfo { name: string; group?: string; last?: LastPerf; history?: ExerciseHistoryPoint[] }

// Mini-gráfico de linha do volume (sem libs — SVG puro, leve p/ o overlay).
function Sparkline({ values }: { values: number[] }) {
  const w = 116;
  const h = 34;
  const pad = 3;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => [pad + i * stepX, h - pad - ((v - min) / range) * (h - pad * 2)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const up = values[values.length - 1] >= values[0];
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={d} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={up ? "stroke-emerald-500" : "stroke-amber-500"} />
      <circle cx={lx} cy={ly} r={2.5} className={up ? "fill-emerald-500" : "fill-amber-500"} />
    </svg>
  );
}

/**
 * Tela de descanso (100vh, sobre a sessão). Fundo SÓLIDO (não vaza o conteúdo de
 * trás), sem scroll. Anel de progresso; conta o excedente em vermelho; permite
 * ajustar/definir o tempo exato e — em bi-set — adiantar o exercício pareado.
 */
export function RestOverlay({
  total,
  remaining,
  minRest = 0,
  next,
  superset,
  onAdjust,
  onSetExact,
  onDone,
  onSuperset,
  onMinimize,
}: {
  total: number;        // segundos do descanso programado
  remaining: number;    // segundos restantes (negativo = excedente)
  minRest?: number;     // descanso mínimo obrigatório antes de liberar "pular"
  next?: NextInfo | null;
  superset?: NextInfo | null;   // exercício de OUTRO grupo p/ intercalar no descanso
  onAdjust: (deltaSeconds: number) => void;
  onSetExact: (seconds: number) => void;
  onDone: () => void;   // começar a próxima / pular
  onSuperset?: () => void;
  onMinimize?: () => void;   // recolhe mantendo o cronômetro rodando (pílula)
}) {
  const over = remaining <= 0;
  const frac = over ? 1 : Math.min(1, Math.max(0, remaining / Math.max(1, total)));
  // Descanso mínimo obrigatório: nos primeiros `minRest`s o botão de pular fica
  // travado (induz o usuário a respeitar ao menos um descanso curto). Depois libera.
  const elapsedRest = Math.max(0, total - remaining);
  const waitLeft = Math.max(0, Math.ceil(minRest - elapsedRest));
  const locked = !over && waitLeft > 0;

  const R = 130;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - frac);

  const [custom, setCustom] = useState("");
  // Minigame opcional para passar o tempo do descanso (para sozinho ao zerar).
  const [playing, setPlaying] = useState(false);
  const applyCustom = () => {
    const v = Math.round(parseFloat(custom.replace(",", ".")));
    if (Number.isFinite(v) && v > 0) {
      onSetExact(Math.min(v, 3600));
      playClick();
    }
    setCustom("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-background px-5 pb-safe pt-safe"
    >
      {/* Glow decorativo (não reduz a opacidade do fundo — fica atrás do conteúdo). */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-1/2 -z-0 mx-auto h-[60vh] max-w-lg -translate-y-1/2 blur-3xl transition-colors",
          over ? "bg-red-500/10" : "bg-primary/10",
        )}
      />

      {/* Recolher mantendo o cronômetro (ir fazer outro exercício / bi-set) */}
      {onMinimize && (
        <button
          type="button"
          onClick={() => { onMinimize(); playClick(); }}
          className="absolute right-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-card/70 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Recolher descanso (continuar contando)"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      )}

      {/* Topo flexível: centraliza anel + ajustes; encolhe em telas baixas */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto py-2">
        <div className="relative flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          <Timer className="h-4 w-4" />
          {over ? "Tempo extra" : "Descanso"}
          {playing && <span className={cn("font-mono tabular-nums", over ? "text-red-500" : "text-foreground")}>· {over ? "+" : ""}{fmt(remaining)}</span>}
        </div>

        {playing ? (
          <RestMiniGame active={!over} onExit={() => setPlaying(false)} />
        ) : (
          <>
            {/* Anel + número — escala com a largura E a altura (nunca estoura/scrolla) */}
            <div className="relative flex aspect-square w-[min(56vw,38vh,240px)] items-center justify-center">
              <svg viewBox="0 0 300 300" className="-rotate-90 h-full w-full">
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
                <span className={cn("font-mono text-5xl font-bold tabular-nums tracking-tight", over ? "text-red-500" : "text-foreground")}>
                  {over ? "+" : ""}{fmt(remaining)}
                </span>
                {over && <span className="mt-1 text-xs font-medium text-red-500/80">passou do tempo</span>}
              </div>
            </div>

            {/* Ajuste do descanso: −15 · digitar o tempo exato · +30 (sem fileira de presets) */}
            <div className="relative flex w-full max-w-sm flex-col items-center gap-1.5">
            <div className="flex w-full items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => { onAdjust(-15); playClick(); }}
                className="flex h-12 w-16 shrink-0 items-center justify-center gap-0.5 rounded-xl border border-border/60 bg-card text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                aria-label="Diminuir 15 segundos"
              >
                <Minus className="h-4 w-4" />15
              </button>
              {/* Tempo exato digitável — vira o novo padrão da sessão */}
              <div className="relative flex-1">
                <input
                  inputMode="numeric"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ""))}
                  onKeyDown={(e) => { if (e.key === "Enter") { applyCustom(); (e.target as HTMLInputElement).blur(); } }}
                  onBlur={applyCustom}
                  placeholder={String(total)}
                  aria-label="Descanso em segundos"
                  className="h-12 w-full rounded-xl border border-border/60 bg-card pr-16 text-center font-mono text-xl font-bold tabular-nums text-foreground outline-none transition-colors focus:border-primary/60"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                  seg · {Math.floor(total / 60)}:{String(total % 60).padStart(2, "0")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { onAdjust(30); playClick(); }}
                className="flex h-12 w-16 shrink-0 items-center justify-center gap-0.5 rounded-xl border border-border/60 bg-card text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                aria-label="Aumentar 30 segundos"
              >
                <Plus className="h-4 w-4" />30
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/60">Digite os segundos para mudar o descanso padrão</p>
            <button
              type="button"
              onClick={() => { setPlaying(true); playClick(); }}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              <Gamepad2 className="h-3.5 w-3.5" /> Jogar enquanto descansa
            </button>
            </div>
          </>
        )}
      </div>

      {/* Rodapé: pareado + próxima + ação — fixo no fim, sempre visível (nunca clipado) */}
      <div className="relative flex w-full shrink-0 flex-col items-center gap-2.5 pb-1 pt-3">
      {/* Bi-set: adiantar o exercício pareado (outro grupo) durante o descanso */}
      {superset && onSuperset && (
        <button
          type="button"
          onClick={() => { onSuperset(); playClick(); }}
          className="relative flex w-full max-w-sm items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-2.5 text-left transition-colors hover:bg-amber-400/15"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-600">
            <Repeat2 className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-600">Bi-set · aproveite o descanso</span>
            <span className="block truncate text-sm font-semibold text-foreground">Fazer agora: {superset.name}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-amber-600" />
        </button>
      )}

      {/* A seguir — tela de descanso PRODUTIVA: capa + "última vez" + evolução do volume */}
      {next && (
        <div className="relative w-full max-w-sm rounded-2xl border border-border/40 bg-card/60 p-2.5">
          <div className="flex items-center gap-3">
            <ExerciseThumb name={next.name} group={next.group} showPlay={false} className="h-11 w-11 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">A seguir</p>
              <p className="truncate text-sm font-semibold text-foreground">{next.name}</p>
              {next.last && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  <History className="h-3 w-3 shrink-0" />
                  {next.last.sets}×{next.last.reps} · {next.last.weight}kg{relDays(next.last.date) ? ` · ${relDays(next.last.date)}` : ""}
                </p>
              )}
            </div>
            {next.history && next.history.length >= 2 && (
              <div className="flex shrink-0 flex-col items-end">
                <Sparkline values={next.history.map((p) => p.volume)} />
                {(() => {
                  const h = next.history!;
                  const first = h[0].volume, lastV = h[h.length - 1].volume;
                  const up = lastV >= first;
                  const pct = first > 0 ? Math.round(((lastV - first) / first) * 100) : 0;
                  return (
                    <span className={cn("flex items-center gap-0.5 text-[10px] font-bold", up ? "text-emerald-500" : "text-amber-500")}>
                      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {pct > 0 ? "+" : ""}{pct}%
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Começar / pular — travado até cumprir o descanso mínimo obrigatório */}
      <button
        type="button"
        disabled={locked}
        onClick={() => { if (locked) return; onDone(); playClick(); }}
        className={cn(
          "relative flex h-14 w-full max-w-sm items-center justify-center gap-2 rounded-2xl text-base font-bold shadow-lg transition-transform active:scale-[0.98]",
          locked
            ? "cursor-not-allowed bg-muted text-muted-foreground shadow-none"
            : over
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-primary text-white hover:bg-primary/90",
        )}
      >
        {locked ? (
          <><Lock className="h-4 w-4" /> Descanse mais {waitLeft}s</>
        ) : (
          <><Play className="h-5 w-5" /> {over ? "Começar agora" : "Estou pronto"}</>
        )}
      </button>
      </div>
    </motion.div>
  );
}
