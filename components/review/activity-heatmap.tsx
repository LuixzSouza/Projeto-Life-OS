// Heatmap de constância (estilo contribuições do GitHub): 1 quadradinho por
// dia, intensidade pelo esforço registrado (treinos, estudos, foco, hábitos e
// tarefas concluídas). Server component puro — busca os próprios dados via
// lib/activity-days e não manda nenhum JS pro cliente (tooltip = title nativo).

import { cn } from "@/lib/utils";
import {
  getActivityDays, dayKey, dayTitle, levelOf, totalOf, HEAT_LEVELS, EMPTY_DAY,
} from "@/lib/activity-days";

const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export async function ActivityHeatmap({
  userId, start, end,
}: {
  userId: string;
  start: Date;
  end: Date;
}) {
  const days = await getActivityDays(userId, start, end);
  if (days.size === 0) return null;

  // Colunas = semanas (domingo→sábado), do domingo anterior ao início até o fim.
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const weeks: Date[][] = [];
  for (let cursor = new Date(gridStart); cursor <= end; ) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  // Total de dias ativos no período (para o subtítulo).
  let activeDays = 0;
  for (const c of days.values()) {
    if (totalOf(c) > 0) activeDays++;
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto scrollbar-hide pb-1">
        <div className="flex gap-[3px] w-max">
          {/* Rótulos dos dias da semana (seg/qua/sex) */}
          <div className="flex flex-col gap-[3px] pr-1 shrink-0">
            <div className="h-3" />
            {["", "seg", "", "qua", "", "sex", ""].map((label, i) => (
              <div key={i} className="flex h-[11px] w-6 items-center">
                <span className="text-[8px] leading-none text-muted-foreground/70">{label}</span>
              </div>
            ))}
          </div>

          {weeks.map((week, wi) => {
            // Rótulo de mês quando a semana contém o dia 1.
            const firstOfMonth = week.find((d) => d.getDate() === 1 && d >= start && d <= end);
            return (
              <div key={wi} className="flex flex-col gap-[3px]">
                <div className="h-3">
                  {firstOfMonth && (
                    <span className="block text-[8px] leading-none text-muted-foreground/70 whitespace-nowrap">
                      {MONTH_SHORT[firstOfMonth.getMonth()]}
                    </span>
                  )}
                </div>
                {week.map((d, di) => {
                  const inRange = d >= start && d <= end;
                  if (!inRange) return <div key={di} className="h-[11px] w-[11px]" />;
                  const counts = days.get(dayKey(d)) ?? EMPTY_DAY;
                  return (
                    <div
                      key={di}
                      title={dayTitle(d, counts)}
                      className={cn("h-[11px] w-[11px] rounded-[2.5px]", HEAT_LEVELS[levelOf(totalOf(counts))])}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{activeDays}</span>{" "}
          {activeDays === 1 ? "dia ativo" : "dias ativos"} no período · treino, estudo, foco, hábitos e tarefas
        </p>
        <div className="flex items-center gap-1 shrink-0 text-[9px] text-muted-foreground/70">
          menos
          {HEAT_LEVELS.map((cls) => (
            <span key={cls} className={cn("h-[9px] w-[9px] rounded-[2px]", cls)} />
          ))}
          mais
        </div>
      </div>
    </div>
  );
}
