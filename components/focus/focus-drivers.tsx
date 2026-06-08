// "O que move o seu foco?" — exibe os padrões do Motor de Correlação (#8).
// Componente de exibição puro (server). Linguagem honesta: correlação, não causa.

import { Zap, Dumbbell, Moon, Flame, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FocusDrivers as FocusDriversData, DriverKey } from "@/app/(dashboard)/agenda/focus-actions";

const KEY_META: Record<DriverKey, { icon: React.ElementType; title: string }> = {
  energy: { icon: Zap, title: "Energia" },
  workout: { icon: Dumbbell, title: "Treino" },
  sleep: { icon: Moon, title: "Sono" },
  habits: { icon: Flame, title: "Hábitos" },
};

const POS = "#10b981"; // foca mais → verde
const NEG = "#f97316"; // foca menos → âmbar

function fmtMin(m: number): string {
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
}

export function FocusDrivers({ drivers }: { drivers: FocusDriversData }) {
  if (!drivers.hasFocus) return null; // sem foco, o empty state do painel já cobre

  return (
    <div className="px-4 pb-6 sm:px-6">
      <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm">
        <h3 className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> O que move o seu foco
        </h3>
        <p className="mb-4 text-[11px] text-muted-foreground/70">
          Padrões dos últimos {drivers.windowDays} dias. É correlação, não causa.
        </p>

        {drivers.insights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/50 bg-muted/10 p-5 text-center">
            <p className="text-sm font-semibold text-foreground">Ainda juntando sinais</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Registre energia, treino e sono ao longo dos dias (e foque com a pílula). Com alguns dias de
              cada lado, os padrões aparecem aqui. Já são <b className="text-foreground">{drivers.loggedDays}</b> dia(s) com dados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {drivers.insights.map((ins) => {
              const meta = KEY_META[ins.key];
              const Icon = meta.icon;
              const better = ins.deltaPct >= 0;
              const accent = better ? POS : NEG;
              const max = Math.max(ins.withMinutes, ins.withoutMinutes, 1);
              return (
                <div key={ins.key} className="rounded-xl border border-border/40 bg-background p-3.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}1a`, color: accent }}>
                        <Icon className="h-4 w-4" />
                      </span>
                      {meta.title}
                    </span>
                    <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black tabular-nums" style={{ backgroundColor: `${accent}1a`, color: accent }}>
                      {better ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {better ? "+" : "−"}{Math.abs(ins.deltaPct)}%
                    </span>
                  </div>

                  <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                    Nos <b className="text-foreground">{ins.positiveLabel}</b>, você focou em média{" "}
                    <b style={{ color: accent }}>{fmtMin(ins.withMinutes)}</b> — {better ? "mais" : "menos"} que nos{" "}
                    {ins.otherLabel} (<b className="text-foreground">{fmtMin(ins.withoutMinutes)}</b>).
                  </p>

                  {/* Barras comparativas */}
                  <div className="space-y-1.5">
                    <CompareBar label={ins.positiveLabel} value={ins.withMinutes} max={max} color={accent} sample={ins.samplePositive} />
                    <CompareBar label={ins.otherLabel} value={ins.withoutMinutes} max={max} color="hsl(var(--muted-foreground) / 0.4)" sample={ins.sampleOther} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CompareBar({ label, value, max, color, sample }: { label: string; value: number; max: number; color: string; sample: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 truncate text-[10px] font-semibold text-muted-foreground" title={label}>{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full")} style={{ width: `${Math.max(4, (value / max) * 100)}%`, backgroundColor: color }} />
      </div>
      <span className="w-10 shrink-0 text-right text-[10px] font-bold tabular-nums text-muted-foreground">{value}m</span>
      <span className="w-9 shrink-0 text-right text-[9px] text-muted-foreground/50">{sample}d</span>
    </div>
  );
}
