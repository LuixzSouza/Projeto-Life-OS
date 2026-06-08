// "Insight do dia" (Home): mostra o padrão mais forte entre foco e energia,
// usando o Motor de Correlação (#8). Server component assíncrono — busca o próprio
// dado (envolva em <Suspense> na página). Linguagem honesta: correlação, não causa.

import Link from "next/link";
import { Sparkles, Zap, Dumbbell, Moon, Flame, Brain, ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { getDailyInsight, type DriverKey } from "@/app/(dashboard)/agenda/focus-actions";

const DRIVER_ICON: Record<DriverKey, React.ElementType> = {
  energy: Zap, workout: Dumbbell, sleep: Moon, habits: Flame,
};

const POS = "#10b981";
const NEG = "#f97316";

function fmtMin(m: number): string {
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
}

const fmtVal = (v: number, unit: "min" | "pts") =>
  unit === "min" ? fmtMin(v) : `${String(v).replace(".", ",")} de energia`;

export async function DailyInsightCard() {
  const { insight, loggedDays } = await getDailyInsight();

  // Sem padrão ainda: nudge discreto (não ocupa muito espaço na Home).
  if (!insight) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border/50 bg-muted/10 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Seus padrões aparecem aqui</p>
          <p className="text-xs text-muted-foreground">
            Registre energia, treino e sono e foque alguns dias — já são {loggedDays} dia(s) com dados.
          </p>
        </div>
      </div>
    );
  }

  const Icon = DRIVER_ICON[insight.driver];
  const better = insight.deltaPct >= 0;
  const accent = better ? POS : NEG;
  const targetWord = insight.target === "focus" ? "de foco" : "de energia";
  const TargetIcon = insight.target === "focus" ? Brain : Zap;

  return (
    <Link
      href="/agenda"
      className="group flex items-center gap-3 rounded-2xl border border-border/40 bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}1a`, color: accent }}>
        <Icon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Insight do dia
          </span>
          <span className="flex items-center gap-0.5 rounded-full px-1.5 text-[11px] font-black tabular-nums" style={{ backgroundColor: `${accent}1a`, color: accent }}>
            {better ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {better ? "+" : "−"}{Math.abs(insight.deltaPct)}%
          </span>
        </div>
        <p className="truncate text-sm font-bold text-foreground">
          <span style={{ color: accent }}>{better ? "+" : "−"}{Math.abs(insight.deltaPct)}% {targetWord}</span>{" "}
          nos <TargetIcon className="inline h-3.5 w-3.5 -translate-y-px" /> {insight.positiveLabel}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {fmtVal(insight.withValue, insight.unit)} vs {fmtVal(insight.withoutValue, insight.unit)} nos {insight.otherLabel}
          {" · "}{insight.samplePositive}+{insight.sampleOther} dias · correlação
        </p>
      </div>

      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </Link>
  );
}
