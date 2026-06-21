import { cn } from "@/lib/utils";
import { Flame, CalendarRange } from "lucide-react";

interface StudyHeatmapProps {
  /** dia "YYYY-MM-DD" → minutos estudados naquele dia. */
  data: Record<string, number>;
  /** Sequência atual de dias estudando (vem de computeStudyStats). */
  streak?: number;
  weeks?: number;
}

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function isoKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Minutos → nível 0..4 de intensidade (escala da "floresta de constância"). */
function level(min: number): number {
  if (min <= 0) return 0;
  if (min <= 15) return 1;
  if (min <= 30) return 2;
  if (min <= 60) return 3;
  return 4;
}

const LEVEL_CLASS = [
  "bg-muted/50",
  "bg-emerald-500/25",
  "bg-emerald-500/45",
  "bg-emerald-500/70",
  "bg-emerald-500",
];

/**
 * Heatmap de constância: um quadradinho por dia nas últimas ~26 semanas, mais
 * escuro quanto mais você estudou. Mostra de relance a regularidade (o que mais
 * importa em estudo) e a ofensiva atual. Componente puro — recebe o mapa pronto.
 */
export function StudyHeatmap({ data, streak = 0, weeks = 26 }: StudyHeatmapProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Começa no domingo da semana mais antiga, para as colunas alinharem certinho.
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  start.setDate(start.getDate() - start.getDay());

  // Monta colunas (semanas) × 7 linhas (dom→sáb).
  const columns: { date: Date; minutes: number }[][] = [];
  const cursor = new Date(start);
  let totalDays = 0;
  let totalMinutes = 0;
  while (cursor <= today) {
    const week: { date: Date; minutes: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(cursor);
      const minutes = date <= today ? data[isoKey(date)] ?? 0 : -1; // -1 = futuro (vazio)
      if (minutes > 0) {
        totalDays++;
        totalMinutes += minutes;
      }
      week.push({ date, minutes });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(week);
  }

  // Rótulos de mês: aparecem na coluna em que o mês muda.
  const monthLabels = columns.map((week, i) => {
    const first = week[0].date;
    const prevFirst = i > 0 ? columns[i - 1][0].date : null;
    if (!prevFirst || first.getMonth() !== prevFirst.getMonth()) {
      return MONTHS[first.getMonth()];
    }
    return "";
  });

  const totalHours = (totalMinutes / 60).toFixed(0);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <CalendarRange className="h-4 w-4 text-primary" /> Constância
        </h3>
        <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 font-bold text-amber-600">
              <Flame className="h-3.5 w-3.5" /> {streak} {streak === 1 ? "dia" : "dias"} seguidos
            </span>
          )}
          <span>{totalDays} dias · {totalHours}h no período</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1 scrollbar-hide">
        <div className="inline-flex min-w-full flex-col gap-1.5">
          {/* Rótulos de mês */}
          <div className="flex gap-1 pl-6">
            {monthLabels.map((m, i) => (
              <div key={i} className="w-3 shrink-0 text-[9px] font-semibold text-muted-foreground/70">
                {m}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {/* Rótulos de dia da semana (seg, qua, sex) */}
            <div className="mr-1 flex w-5 flex-col gap-1">
              {WEEKDAYS.map((d, i) => (
                <div key={i} className="grid h-3 place-items-center text-[8px] font-semibold text-muted-foreground/50">
                  {i % 2 === 1 ? d : ""}
                </div>
              ))}
            </div>

            {/* Colunas (semanas) */}
            {columns.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={day.minutes >= 0 ? `${day.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}: ${day.minutes} min` : undefined}
                    className={cn(
                      "h-3 w-3 rounded-[3px]",
                      day.minutes < 0 ? "bg-transparent" : LEVEL_CLASS[level(day.minutes)],
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] font-medium text-muted-foreground">
        <span>menos</span>
        {LEVEL_CLASS.map((c, i) => (
          <span key={i} className={cn("h-3 w-3 rounded-[3px]", c)} />
        ))}
        <span>mais</span>
      </div>
    </div>
  );
}
