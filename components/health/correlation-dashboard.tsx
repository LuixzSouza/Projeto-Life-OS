"use client";

import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Brain, Zap, Moon, Dumbbell, CheckCircle2, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CorrelationMatrix, DailyInsight, DriverKey } from "@/app/(dashboard)/agenda/focus-actions";

const DRIVER_ICON: Record<DriverKey, typeof Zap> = {
  energy: Zap,
  workout: Dumbbell,
  sleep: Moon,
  habits: CheckCircle2,
};

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
      <p className="mb-1 font-bold text-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-medium tabular-nums">
          {entry.name}: {entry.value ?? "—"}
        </p>
      ))}
    </div>
  );
}

/**
 * Correlation Dashboard (#8 completo): série diária sobreposta (foco × energia ×
 * sono × treino) + TODOS os padrões fortes do motor. Linguagem honesta — são
 * correlações sobre a SUA amostra, não afirmações de causa.
 */
export function CorrelationDashboard({ matrix }: { matrix: CorrelationMatrix }) {
  const { days, insights, loggedDays, windowDays, sleepGoal } = matrix;

  // Dados do gráfico: treino vira um marcador na base (0.2) p/ aparecer como ponto.
  const chartData = days.map((d) => ({
    label: d.label,
    Foco: d.focusMin,
    Energia: d.energy,
    Sono: d.sleepH,
    Treino: d.trained ? 0.2 : null,
  }));

  if (loggedDays < 5) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/40 bg-muted/10 p-8 text-center">
        <FlaskConical className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
        <h4 className="text-sm font-black uppercase tracking-tighter text-foreground">Coletando amostra…</h4>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
          O Motor de Correlação precisa de pelo menos 5 dias com registros (energia, sono, treino ou foco)
          nos últimos {windowDays} dias. Você tem {loggedDays} — continue os check-ins diários.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SÉRIE DIÁRIA SOBREPOSTA */}
      <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm sm:p-6">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={4} tickLine={false} axisLine={false} />
              <YAxis yAxisId="min" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={40} unit="m" />
              <YAxis yAxisId="scale" orientation="right" domain={[0, 12]} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }} />
              <Bar yAxisId="min" dataKey="Foco" fill="hsl(var(--primary))" fillOpacity={0.7} radius={[3, 3, 0, 0]} name="Foco (min)" />
              <Line yAxisId="scale" dataKey="Energia" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} connectNulls name="Energia (1–5)" />
              <Line yAxisId="scale" dataKey="Sono" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 3" dot={false} connectNulls name="Sono (h)" />
              <Line yAxisId="scale" dataKey="Treino" stroke="#10b981" strokeWidth={0} dot={{ r: 4, fill: "#10b981" }} legendType="circle" name="Treino" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Últimos {windowDays} dias · meta de sono {sleepGoal}h · ponto verde = dia com treino.
        </p>
      </div>

      {/* TODOS OS PADRÕES FORTES */}
      {insights.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-4 text-xs text-muted-foreground">
          Nenhum padrão forte ainda — ou os grupos têm amostra pequena, ou a diferença é menor que 8%.
          Isso também é informação: seu foco/energia está estável independente desses fatores.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map((ins) => (
            <InsightRow key={`${ins.driver}-${ins.target}`} insight={ins} />
          ))}
        </div>
      )}
    </div>
  );
}

function InsightRow({ insight }: { insight: DailyInsight }) {
  const Icon = DRIVER_ICON[insight.driver];
  const TargetIcon = insight.target === "focus" ? Brain : Zap;
  const better = insight.deltaPct >= 0;
  const unit = insight.unit === "min" ? "min" : "pts";

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/40 bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <div className={cn("rounded-xl p-2", better ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-foreground">
          <span className={cn("font-black", better ? "text-emerald-500" : "text-rose-500")}>
            {better ? "+" : "−"}{Math.abs(insight.deltaPct)}%
          </span>{" "}
          <TargetIcon className="inline h-3.5 w-3.5 -translate-y-px" /> {insight.target === "focus" ? "de foco" : "de energia"} nos {insight.positiveLabel}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {insight.withValue}{unit} vs {insight.withoutValue}{unit} nos {insight.otherLabel} · amostra {insight.samplePositive}+{insight.sampleOther} dias
        </p>
      </div>
    </div>
  );
}
