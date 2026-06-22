"use client";

import { useEffect, useState } from "react";
import { Disc3 } from "lucide-react";
import { playClick } from "./sfx";
import { BAR_OPTIONS, platesPerSide, fmtKg } from "./plate-calculator";

const BAR_KEY = "lifeos:gym:bar-weight";

/**
 * Dica de montagem da barra (calculadora de anilhas) para a série ativa.
 * Mostra, por LADO, quais discos carregar para atingir a carga digitada — toque
 * no peso da barra cicla entre as opções (preferência salva no localStorage).
 * Renderize só para exercícios de barra com carga > 0 (o chamador decide).
 */
export function PlateHint({ total }: { total: number }) {
  const [bar, setBar] = useState(20);
  // Hidrata a barra escolhida no cliente (evita mismatch de SSR).
  useEffect(() => {
    try {
      const v = parseFloat(window.localStorage.getItem(BAR_KEY) ?? "");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Number.isFinite(v) && BAR_OPTIONS.some((o) => o.weight === v)) setBar(v);
    } catch {
      /* ignora */
    }
  }, []);

  const cycleBar = () => {
    playClick();
    const i = BAR_OPTIONS.findIndex((o) => o.weight === bar);
    const next = BAR_OPTIONS[(i + 1) % BAR_OPTIONS.length].weight;
    setBar(next);
    try { window.localStorage.setItem(BAR_KEY, String(next)); } catch { /* ignora */ }
  };

  const stack = platesPerSide(total, bar);
  const label = BAR_OPTIONS.find((o) => o.weight === bar)?.label ?? `Barra ${fmtKg(bar)}kg`;

  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/40 px-2 py-1 text-[11px]">
      <button
        type="button"
        onClick={cycleBar}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/50 bg-background px-1.5 py-0.5 font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        title="Tocar para trocar o peso da barra"
      >
        <Disc3 className="h-3 w-3" /> {label}
      </button>

      {stack === null ? (
        <span className="text-muted-foreground/70">carga abaixo da barra</span>
      ) : stack.perSide.length === 0 ? (
        <span className="text-muted-foreground/70">só a barra ({fmtKg(stack.total)}kg)</span>
      ) : (
        <span className="flex flex-wrap items-center gap-1">
          <span className="font-medium text-muted-foreground">por lado:</span>
          {stack.perSide.map((p) => (
            <span
              key={p.plate}
              className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 font-mono font-bold tabular-nums text-primary"
            >
              {p.count}× {fmtKg(p.plate)}
            </span>
          ))}
          {stack.leftover > 0 && (
            <span className="text-amber-600" title="As anilhas padrão não fecham essa carga exata">
              + {fmtKg(stack.leftover)}kg ≈
            </span>
          )}
        </span>
      )}
    </div>
  );
}
