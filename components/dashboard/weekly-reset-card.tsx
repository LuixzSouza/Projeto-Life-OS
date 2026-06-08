// Reset Semanal na Home: resumo dos últimos 7 dias com tendência vs a semana
// anterior e uma direção para a próxima. Server component assíncrono — some quando
// ainda não há dados da semana.

import { CalendarCheck, Timer, Zap, Flame, TrendingUp, TrendingDown, Minus, Lightbulb, Trophy } from "lucide-react";
import { getWeeklyReset, type WeekMetric } from "@/app/(dashboard)/agenda/weekly-reset-actions";

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const FRICTION: Record<string, { label: string; emoji: string }> = {
  TIME: { label: "falta de tempo", emoji: "⏰" },
  ENERGY: { label: "sem energia", emoji: "🪫" },
  ENVIRONMENT: { label: "ambiente", emoji: "🧹" },
  EMERGENCY: { label: "imprevistos", emoji: "🚨" },
};

function fmtMin(m: number): string {
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${r}` : `${h}h`;
}

function Trend({ m }: { m: WeekMetric }) {
  if (m.deltaPct == null) {
    return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground/60"><Minus className="h-3 w-3" /> novo</span>;
  }
  const up = m.deltaPct > 0;
  const flat = m.deltaPct === 0;
  const color = flat ? "#9ca3af" : up ? "#10b981" : "#f59e0b";
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-black tabular-nums" style={{ color }}>
      <Icon className="h-3 w-3" /> {up ? "+" : ""}{m.deltaPct}%
    </span>
  );
}

export async function WeeklyResetCard() {
  const w = await getWeeklyReset();
  if (!w.hasData) return null;

  return (
    <section className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
          <CalendarCheck className="h-4 w-4 text-primary" /> Reset semanal
        </h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold tabular-nums text-muted-foreground">
          {w.activeDays}/7 dias ativos
        </span>
      </div>

      {/* Métricas com tendência */}
      <div className="grid grid-cols-3 gap-2.5">
        <Tile icon={<Timer className="h-4 w-4" />} color="#ef4444" value={fmtMin(w.focusMinutes.value)} label="Foco" metric={w.focusMinutes} />
        <Tile icon={<Zap className="h-4 w-4" />} color="#f59e0b" value={w.avgEnergy.value > 0 ? `${String(w.avgEnergy.value).replace(".", ",")}` : "—"} label="Energia méd." metric={w.avgEnergy} />
        <Tile icon={<Flame className="h-4 w-4" />} color="#10b981" value={String(w.habitsDone.value)} label="Hábitos ✓" metric={w.habitsDone} />
      </div>

      {/* Destaques */}
      <div className="mt-3 flex flex-wrap gap-2">
        {w.bestFocusDay && w.bestFocusDay.minutes > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-background px-2.5 py-1.5 text-xs">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-muted-foreground">Melhor dia:</span>
            <span className="font-bold capitalize text-foreground">{WEEKDAYS[w.bestFocusDay.weekday]}</span>
            <span className="font-semibold text-muted-foreground">({fmtMin(w.bestFocusDay.minutes)})</span>
          </span>
        )}
        {w.topFriction && FRICTION[w.topFriction.reason] && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-background px-2.5 py-1.5 text-xs">
            <span>{FRICTION[w.topFriction.reason].emoji}</span>
            <span className="text-muted-foreground">Mais travou:</span>
            <span className="font-bold text-foreground">{FRICTION[w.topFriction.reason].label}</span>
          </span>
        )}
      </div>

      {/* Direção da próxima semana */}
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs font-medium leading-relaxed text-foreground">{w.suggestion}</p>
      </div>
    </section>
  );
}

function Tile({ icon, color, value, label, metric }: { icon: React.ReactNode; color: string; value: string; label: string; metric: WeekMetric }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1a`, color }}>{icon}</span>
        <Trend m={metric} />
      </div>
      <p className="text-xl font-black leading-none tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
