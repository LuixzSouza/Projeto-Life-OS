// Regulador Adaptativo (#13) na Home: "o que fazer hoje" conforme o seu estado.
// Server component assíncrono (busca o próprio dado). Sempre útil — quando não há
// energia registrada, vira um convite a registrar.

import Link from "next/link";
import {
  Gauge, PencilLine, BatteryLow, Clock, Target, Flame, Dumbbell, Wind, ArrowUpRight,
} from "lucide-react";
import { getDailyRegulator, type RegulatorIcon, type RegulatorTone, type RegulatorLevel } from "@/app/(dashboard)/agenda/regulator-actions";

const ICONS: Record<RegulatorIcon, React.ElementType> = {
  edit: PencilLine, battery: BatteryLow, clock: Clock, target: Target, flame: Flame, dumbbell: Dumbbell, wind: Wind,
};

const TONE: Record<RegulatorTone, string> = {
  calm: "#3b82f6", // azul — poupar
  neutral: "#6366f1", // índigo — equilíbrio
  push: "#ef4444", // vermelho — acelerar
};

const LEVEL_LABEL: Record<RegulatorLevel, string> = {
  none: "aguardando energia",
  low: "modo leve",
  mid: "ritmo equilibrado",
  high: "modo pico",
};

export async function DailyRegulatorCard() {
  const { energyToday, level, suggestions } = await getDailyRegulator();
  if (suggestions.length === 0) return null;

  const headTone = level === "high" ? TONE.push : level === "low" ? TONE.calm : TONE.neutral;

  return (
    <section className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
          <Gauge className="h-4 w-4" style={{ color: headTone }} /> Regulador do dia
        </h3>
        <span className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: `${headTone}14`, color: headTone }}>
          {energyToday != null && <span className="tabular-nums">⚡ {energyToday}/5</span>}
          <span className="uppercase tracking-wide">{LEVEL_LABEL[level]}</span>
        </span>
      </div>

      <div className="space-y-2">
        {suggestions.map((s) => {
          const Icon = ICONS[s.icon];
          const color = TONE[s.tone];
          const inner = (
            <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-background p-3 transition-colors group-hover:border-primary/30">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1a`, color }}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{s.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{s.detail}</p>
                {s.actionLabel && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider" style={{ color }}>
                    {s.actionLabel} <ArrowUpRight className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
          );
          return s.actionUrl ? (
            <Link key={s.id} href={s.actionUrl} className="group block">{inner}</Link>
          ) : (
            <div key={s.id} className="group">{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
