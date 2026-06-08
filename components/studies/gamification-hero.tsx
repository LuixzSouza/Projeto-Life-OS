import { Progress } from "@/components/ui/progress";
import { GraduationCap, Clock, Layers, Sparkles } from "lucide-react";

interface GamificationHeroProps {
  currentLevel: number;
  totalXP: number;
  xpCurrentLevel: number;
  xpNextLevel: number;
  progressPercentage: number;
  totalHours: string;
  totalSessions: number;
}

/**
 * Cabeçalho de progresso — enxuto e calmo (substitui o antigo hero com gradiente).
 * Mostra o nível num anel, o avanço de XP e três números-chave. As métricas de
 * cadência (hoje/semana/sequência/foco) vivem no StudyAnalytics para não duplicar.
 */
export function GamificationHero({
  currentLevel,
  totalXP,
  xpCurrentLevel,
  xpNextLevel,
  progressPercentage,
  totalHours,
  totalSessions,
}: GamificationHeroProps) {
  const xpToNext = Math.max(0, xpNextLevel - xpCurrentLevel);

  return (
    <section
      aria-label="Progresso de estudos"
      className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        {/* Nível + progresso de XP */}
        <div className="flex items-center gap-4">
          <div
            className="relative grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(hsl(var(--primary)) ${progressPercentage}%, hsl(var(--muted)) 0)` }}
            aria-hidden
          >
            <div className="grid h-[54px] w-[54px] place-items-center rounded-full bg-card">
              <span className="text-xl font-bold leading-none">{currentLevel}</span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <GraduationCap className="h-3.5 w-3.5" /> Nível {currentLevel}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Faltam <span className="font-semibold text-foreground">{xpToNext} XP</span> para o nível {currentLevel + 1}
            </p>
            <Progress
              value={progressPercentage}
              className="mt-2.5 h-1.5 w-48 max-w-full bg-muted"
              indicatorClassName="bg-primary"
            />
          </div>
        </div>

        {/* Números-chave */}
        <div className="grid grid-cols-3 gap-3 sm:ml-auto sm:gap-6">
          <Stat icon={Clock} label="Tempo total" value={`${totalHours}h`} />
          <Stat icon={Layers} label="Sessões" value={String(totalSessions)} />
          <Stat icon={Sparkles} label="XP" value={totalXP.toLocaleString("pt-BR")} />
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 sm:items-end">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="text-xl font-bold leading-none tabular-nums">{value}</span>
    </div>
  );
}
