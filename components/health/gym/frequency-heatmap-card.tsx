"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { startOfWeek, subWeeks, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { trainingByDay, dayLevel, type DayTraining } from "./gym-analytics";
import type { GymWorkout } from "./gym-types";

// Heatmap de frequência (estilo GitHub): últimas ~18 semanas, uma coluna por
// semana (segunda→domingo), célula colorida pela intensidade do dia. Motiva a
// consistência — "não quebrar a corrente". Rola horizontal no mobile.

const WEEKS = 18;
const LEVEL_BG = [
  "bg-muted/50",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
] as const;

interface Cell {
  key: string;
  date: Date;
  future: boolean;
  day?: DayTraining;
  level: 0 | 1 | 2 | 3 | 4;
}

export function FrequencyHeatmapCard({ workouts }: { workouts: GymWorkout[] }) {
  const [hover, setHover] = useState<Cell | null>(null);

  const { columns, monthLabels, totalSessions, daysTrained } = useMemo(() => {
    const byDay = trainingByDay(workouts);
    const today = new Date();
    const start = startOfWeek(subWeeks(today, WEEKS - 1), { weekStartsOn: 1 });

    const cols: Cell[][] = [];
    const labels: { col: number; label: string }[] = [];
    let prevMonth = -1;
    let sessions = 0;
    let trained = 0;

    for (let c = 0; c < WEEKS; c++) {
      const col: Cell[] = [];
      for (let r = 0; r < 7; r++) {
        const date = addDays(start, c * 7 + r);
        const key = format(date, "yyyy-MM-dd");
        const future = date > today;
        const day = byDay.get(key);
        if (day && !future) { sessions += day.sessions; trained += 1; }
        col.push({ key, date, future, day, level: day ? dayLevel(day.sets, day.sessions) : 0 });
      }
      // Rótulo do mês na 1ª semana em que ele aparece (linha do topo).
      const m = addDays(start, c * 7).getMonth();
      if (m !== prevMonth) { labels.push({ col: c, label: format(addDays(start, c * 7), "MMM", { locale: ptBR }) }); prevMonth = m; }
      cols.push(col);
    }
    return { columns: cols, monthLabels: labels, totalSessions: sessions, daysTrained: trained };
  }, [workouts]);

  if (totalSessions === 0) return null;

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-3.5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 text-primary" /> Frequência
        </p>
        <p className="text-[11px] text-muted-foreground">
          <span className="font-bold text-foreground">{daysTrained}</span> dias · <span className="font-bold text-foreground">{totalSessions}</span> treinos
        </p>
      </div>

      <div className="overflow-x-auto scrollbar-hide">
        <div className="inline-flex min-w-full flex-col gap-1">
          {/* Rótulos de mês */}
          <div className="relative h-3" style={{ marginLeft: 2 }}>
            {monthLabels.map((m) => (
              <span key={`${m.col}-${m.label}`} className="absolute text-[9px] font-medium text-muted-foreground" style={{ left: m.col * 15 }}>
                {m.label}
              </span>
            ))}
          </div>
          {/* Grade: colunas = semanas, linhas = dias */}
          <div className="flex gap-[3px]">
            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                {col.map((cell) => (
                  <div
                    key={cell.key}
                    onMouseEnter={() => !cell.future && setHover(cell)}
                    onMouseLeave={() => setHover(null)}
                    className={cn(
                      "h-3 w-3 rounded-[3px] transition-transform",
                      cell.future ? "bg-transparent" : LEVEL_BG[cell.level],
                      cell.day && "cursor-pointer hover:scale-125 hover:ring-1 hover:ring-primary/50",
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip do dia sob o cursor + legenda */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/30 pt-2.5">
        <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
          {hover?.day
            ? `${format(hover.date, "dd 'de' MMM", { locale: ptBR })}: ${hover.day.sets} séries · ${hover.day.titles.slice(0, 2).join(", ")}`
            : "Passe o mouse num dia para ver os detalhes."}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
          menos
          {LEVEL_BG.map((bg, i) => <span key={i} className={cn("h-2.5 w-2.5 rounded-[2px]", bg)} />)}
          mais
        </span>
      </div>
    </div>
  );
}
