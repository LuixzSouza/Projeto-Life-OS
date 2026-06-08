// Vetor de Fricção (#15) na Home: revela POR QUE seus hábitos falham, a partir dos
// motivos registrados na falha. Server component assíncrono (busca o próprio dado) —
// some quando ainda não há fricção suficiente para analisar (não polui no início).

import { ShieldAlert, Lightbulb } from "lucide-react";
import { getFrictionVector, type FrictionReason } from "@/app/(dashboard)/health/actions";

const META: Record<FrictionReason, { label: string; emoji: string; color: string; tip: string }> = {
  TIME: { label: "Falta de tempo", emoji: "⏰", color: "#f59e0b", tip: "Reserve um horário fixo ou use a versão de 2 minutos do hábito." },
  ENERGY: { label: "Sem energia", emoji: "🪫", color: "#8b5cf6", tip: "Encaixe no seu pico de energia — veja o Insight do dia." },
  ENVIRONMENT: { label: "Ambiente", emoji: "🧹", color: "#06b6d4", tip: "Prepare o ambiente na véspera para reduzir o atrito." },
  EMERGENCY: { label: "Imprevistos", emoji: "🚨", color: "#f43f5e", tip: "Imprevistos acontecem — busque consistência, não perfeição." },
};

export async function FrictionVectorCard() {
  const fv = await getFrictionVector();

  // Só aparece quando há motivos suficientes para um padrão honesto.
  if (fv.reasonedFailures < 3 || !fv.dominant) return null;

  const dom = META[fv.dominant];
  const domStat = fv.reasons.find((r) => r.reason === fv.dominant);

  return (
    <section className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
            <ShieldAlert className="h-4 w-4 text-amber-500" /> Vetor de fricção
          </h3>
          <p className="text-[11px] text-muted-foreground">Por que seus hábitos falharam · últimos {fv.windowDays} dias</p>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold tabular-nums text-muted-foreground">
          {fv.totalFailures} falha{fv.totalFailures === 1 ? "" : "s"}
        </span>
      </div>

      {/* Obstáculo dominante */}
      <div className="flex items-start gap-3 rounded-xl border p-3" style={{ borderColor: `${dom.color}40`, backgroundColor: `${dom.color}0f` }}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: `${dom.color}1f` }}>
          {dom.emoji}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Maior obstáculo</p>
          <p className="text-sm font-black" style={{ color: dom.color }}>
            {dom.label} <span className="font-bold text-muted-foreground">· {domStat?.pct ?? 0}% das falhas</span>
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /> {dom.tip}
          </p>
        </div>
      </div>

      {/* Distribuição dos motivos */}
      <div className="mt-3 space-y-2">
        {fv.reasons.map((r) => {
          const m = META[r.reason];
          return (
            <div key={r.reason} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-xs font-semibold text-foreground">{m.emoji} {m.label}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: m.color }} />
              </div>
              <span className="w-12 shrink-0 text-right text-[11px] font-bold tabular-nums text-muted-foreground">{r.pct}%</span>
            </div>
          );
        })}
      </div>

      {/* Hábitos que mais travam */}
      {fv.habits.length > 0 && (
        <div className="mt-4 border-t border-border/40 pt-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Onde mais trava</p>
          <div className="space-y-1.5">
            {fv.habits.map((h) => {
              const m = h.topReason ? META[h.topReason] : null;
              return (
                <div key={h.id} className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base" style={{ backgroundColor: `${h.color || "#6366f1"}1a` }}>
                    {h.icon || "✅"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{h.name}</span>
                  {m && <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">{m.emoji} {m.label}</span>}
                  <span className="w-14 shrink-0 text-right text-[11px] font-bold tabular-nums text-muted-foreground">{h.failures}x</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
