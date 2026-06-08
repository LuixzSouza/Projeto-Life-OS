// Overview do Dia (Home): unifica o "ouro" dos módulos de Treino e Nutrição.
// Componente de apresentação puro (sem hooks) — renderiza no servidor.
import Link from "next/link";
import { Flame, Dumbbell, Utensils, ChevronRight, BatteryCharging } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MuscleRecovery } from "@/components/health/gym/session/session-types";

interface DayOverviewCardProps {
  consumed: number;       // kcal consumidas hoje
  goal: number;           // meta calórica (TDEE/override)
  workoutBurn: number;    // kcal estimadas do(s) treino(s) de hoje
  recovery: MuscleRecovery[];
}

// Faixas de recuperação: 0 (fadigado) … 1 (recuperado).
function recoveryTone(r: number): { label: string; chip: string; dot: string } {
  if (r < 0.5) return { label: "fadigado", chip: "bg-rose-500/10 text-rose-600 border-rose-500/20", dot: "bg-rose-500" };
  if (r < 0.85) return { label: "recuperando", chip: "bg-amber-500/10 text-amber-600 border-amber-500/20", dot: "bg-amber-500" };
  return { label: "pronto", chip: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", dot: "bg-emerald-500" };
}

export function DayOverviewCard({ consumed, goal, workoutBurn, recovery }: DayOverviewCardProps) {
  const budget = goal + workoutBurn;
  const balance = budget - consumed;
  const isOver = balance < 0;
  const pct = budget > 0 ? Math.min(100, Math.round((consumed / budget) * 100)) : 0;

  // Só grupos efetivamente treinados entram no panorama (os nunca treinados
  // voltariam como "prontos" e poluiriam o resumo).
  const trained = recovery
    .filter((r) => r.lastTrainedAt)
    .sort((a, b) => a.recovery - b.recovery);
  const fatigued = trained.filter((r) => r.recovery < 0.5);
  const ready = trained.find((r) => r.recovery >= 0.85);

  const recoveryHeadline =
    trained.length === 0
      ? "Nenhum treino recente"
      : fatigued.length === 0
        ? "Tudo recuperado — pode treinar pesado! 💪"
        : `${fatigued.length} ${fatigued.length > 1 ? "músculos fadigados" : "músculo fadigado"}${ready ? ` · ${ready.group} pronto!` : ""}`;

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* ---------- ENERGIA ---------- */}
        <Link
          href="/health/nutrition"
          className="group relative flex flex-col gap-4 p-5 transition-colors hover:bg-muted/30 lg:border-r border-border/40"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Flame className="h-4 w-4 text-orange-500" /> Energia do Dia
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
          </div>

          {/* Saldo gigante */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-4xl font-black tracking-tighter tabular-nums", isOver ? "text-rose-500" : "text-emerald-500")}>
                {isOver ? `+${Math.abs(balance)}` : balance}
              </span>
              <span className="text-sm font-medium text-foreground">kcal {isOver ? "acima" : "disponíveis"}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {consumed.toLocaleString("pt-BR")} de {budget.toLocaleString("pt-BR")} kcal
            </p>
          </div>

          {/* Barra de progresso */}
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full rounded-full transition-all duration-700 ease-out", isOver ? "bg-rose-500" : "bg-primary")}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Composição do orçamento */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Utensils className="h-3 w-3" /> Meta {goal.toLocaleString("pt-BR")}
            </span>
            {workoutBurn > 0 && (
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <Dumbbell className="h-3 w-3" /> +{workoutBurn} do treino
              </span>
            )}
          </div>
        </Link>

        {/* ---------- RECUPERAÇÃO ---------- */}
        <Link
          href="/health/gym"
          className="group relative flex flex-col gap-4 p-5 transition-colors hover:bg-muted/30 border-t border-border/40 lg:border-t-0"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <BatteryCharging className="h-4 w-4 text-primary" /> Recuperação Muscular
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
          </div>

          <p className="text-base font-bold leading-snug text-foreground">{recoveryHeadline}</p>

          {/* Chips dos grupos treinados (mais fadigados primeiro) */}
          {trained.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {trained.slice(0, 6).map((r) => {
                const tone = recoveryTone(r.recovery);
                return (
                  <span
                    key={r.group}
                    className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", tone.chip)}
                    title={`${Math.round(r.recovery * 100)}% recuperado${r.hoursSince != null ? ` · há ${r.hoursSince}h` : ""}`}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
                    {r.group}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Registre um treino para ver o mapa de fadiga aqui.</p>
          )}
        </Link>
      </div>
    </Card>
  );
}
