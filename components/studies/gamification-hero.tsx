import { Progress } from "@/components/ui/progress";
import { Trophy, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LevelTheme } from "./studies-helpers";

interface GamificationHeroProps {
  currentLevel: number;
  totalXP: number;
  xpCurrentLevel: number;
  xpNextLevel: number;
  progressPercentage: number;
  totalHours: string;
  totalSessions: number;
  streak?: number;
  weekHours?: string;
  theme: LevelTheme;
}

export function GamificationHero({
  currentLevel,
  totalXP,
  xpCurrentLevel,
  xpNextLevel,
  progressPercentage,
  totalHours,
  totalSessions,
  streak = 0,
  weekHours = "0.0",
  theme,
}: GamificationHeroProps) {
  return (
    <section
      aria-labelledby="studies-hero-title"
      className={cn(
        "relative overflow-hidden rounded-3xl p-8 border shadow-sm",
        "bg-gradient-to-br from-primary/20 via-primary/10 to-transparent",
        "border-border"
      )}
    >
      <div
        className={cn("absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-20", theme.glow)}
        aria-hidden
      />
      <div
        className={cn("absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-10", theme.glow)}
        aria-hidden
      />

      <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase border",
              "bg-secondary",
              theme.border,
              theme.text
            )}
          >
            <Trophy className="h-3 w-3" />
            Nível {currentLevel}
          </div>

          <h2 id="studies-hero-title" className="text-4xl font-black leading-tight">
            Mestre do Foco
          </h2>

          <p className="text-muted-foreground max-w-md text-sm">
            Você acumulou{" "}
            <span className="font-bold text-foreground">{totalXP} XP</span>.{" "}
            Continue evoluindo seus hábitos.
          </p>
        </div>

        <aside className="rounded-2xl p-6 border bg-secondary/50" aria-label="Progresso">
          <div className="flex justify-between mb-2">
            <span className="text-xs font-bold uppercase text-muted-foreground">Próximo nível</span>
            <span className="text-xs text-muted-foreground">{xpCurrentLevel} / {xpNextLevel} XP</span>
          </div>

          <Progress
            value={progressPercentage}
            className="h-2.5 bg-muted"
            indicatorClassName={cn(theme.bg)}
            aria-valuenow={Math.round(progressPercentage)}
            aria-valuemin={0}
            aria-valuemax={100}
          />

          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
            <div>
              <div className="text-2xl font-bold">{totalHours}h</div>
              <div className="text-xs uppercase font-bold text-muted-foreground">Tempo Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{totalSessions}</div>
              <div className="text-xs uppercase font-bold text-muted-foreground">Sessões</div>
            </div>
            <div>
              <div className="text-2xl font-bold flex items-center gap-1.5">
                {streak}
                {streak > 0 && <Flame className="h-5 w-5 text-amber-500" />}
              </div>
              <div className="text-xs uppercase font-bold text-muted-foreground">Sequência (dias)</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{weekHours}h</div>
              <div className="text-xs uppercase font-bold text-muted-foreground">Esta Semana</div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
