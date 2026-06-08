// Painel de Foco (aba "Foco" da Agenda): mostra os últimos 7 dias de FocusSession —
// total, barras por dia, top rótulos e sessões recentes. Componente de exibição puro
// (sem estado/hooks), renderizado no server a partir de getFocusStats().

import { Brain, Timer, Flame, CalendarCheck, Hourglass } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { FocusStats } from "@/app/(dashboard)/agenda/focus-actions";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const ACCENT = "#ef4444"; // mesma cor da fase de foco do timer

function fmtMin(m: number): string {
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
}

export function FocusInsights({ stats }: { stats: FocusStats }) {
  if (stats.sessions === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
        <div className="mb-3 rounded-full bg-muted p-4">
          <Brain className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <p className="font-semibold text-foreground">Sem foco registrado ainda</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Inicie o timer pela pílula no canto ou pelo ▶ num bloco. Cada foco concluído aparece aqui.
        </p>
      </div>
    );
  }

  const maxDay = Math.max(...stats.week.map((d) => d.minutes), 1);
  const maxLabel = Math.max(...stats.byLabel.map((l) => l.minutes), 1);
  const todayKey = new Date().toDateString();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* CARTÕES DE RESUMO */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Timer className="h-4 w-4" />} value={fmtMin(stats.totalMinutes)} label="Foco · 7 dias" highlight />
        <StatCard icon={<Brain className="h-4 w-4" />} value={String(stats.sessions)} label="Sessões" />
        <StatCard icon={<Hourglass className="h-4 w-4" />} value={String(stats.cycles)} label="Ciclos" />
        <StatCard icon={<CalendarCheck className="h-4 w-4" />} value={`${stats.activeDays}/7`} label="Dias ativos" />
      </div>

      {/* BARRAS POR DIA */}
      <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm">
        <h3 className="mb-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <Flame className="h-3.5 w-3.5" style={{ color: ACCENT }} /> Foco por dia
        </h3>
        <div className="flex items-end justify-between gap-2" style={{ height: 132 }}>
          {stats.week.map((d) => {
            const isToday = new Date(d.date).toDateString() === todayKey;
            const h = d.minutes > 0 ? Math.max(6, Math.round((d.minutes / maxDay) * 104)) : 3;
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[9px] font-bold tabular-nums text-muted-foreground/60">
                  {d.minutes > 0 ? fmtMin(d.minutes) : ""}
                </span>
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-[34px] rounded-md transition-all"
                    style={{
                      height: h,
                      backgroundColor: d.minutes > 0 ? (isToday ? ACCENT : `${ACCENT}80`) : "hsl(var(--muted-foreground) / 0.15)",
                    }}
                    title={`${fmtMin(d.minutes)} em ${WEEKDAYS[d.weekday]}`}
                  />
                </div>
                <span className={cn("text-[10px] font-bold uppercase", isToday ? "text-foreground" : "text-muted-foreground/60")}>
                  {WEEKDAYS[d.weekday]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* TOP RÓTULOS */}
        <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">No que você focou</h3>
          <div className="space-y-2.5">
            {stats.byLabel.map((l) => (
              <div key={l.label}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{l.label}</span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">{fmtMin(l.minutes)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${(l.minutes / maxLabel) * 100}%`, backgroundColor: ACCENT }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SESSÕES RECENTES */}
        <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sessões recentes</h3>
          <div className="space-y-1.5">
            {stats.recent.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border/40 bg-background px-3 py-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}>
                  {s.mode === "STOPWATCH" ? <Timer className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{s.label || "Sem rótulo"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {formatDistanceToNow(parseISO(s.endedAt), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-black tabular-nums" style={{ color: ACCENT }}>{fmtMin(s.minutes)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, highlight }: { icon: React.ReactNode; value: string; label: string; highlight?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-2xl border p-3 shadow-sm", highlight ? "border-transparent text-white" : "border-border/40 bg-card")}
      style={highlight ? { backgroundColor: ACCENT } : undefined}>
      <span className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider", highlight ? "text-white/80" : "text-muted-foreground")}>
        {icon}
      </span>
      <span className="text-2xl font-black leading-none tabular-nums">{value}</span>
      <span className={cn("text-[10px] font-semibold", highlight ? "text-white/80" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}
