// Cálculos e séries temporais da página de Estudos.
// Mantém a lógica de analytics fora dos componentes (testável e reutilizável).

import { startOfDay, subDays, eachDayOfInterval, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface SessionLite {
  date: string | Date;
  durationMinutes: number;
  focusLevel?: number | null;
}

export interface DailyPoint {
  label: string;   // "dd/MM"
  full: string;    // "12 de mar"
  minutes: number;
  isToday: boolean;
}

export interface StudyStats {
  todayMinutes: number;
  weekMinutes: number;     // últimos 7 dias
  streak: number;          // dias consecutivos com estudo (até hoje)
  bestDayMinutes: number;  // melhor dia na janela
  activeDays: number;      // dias com atividade na janela
  avgFocus: number;        // foco médio (0-5)
}

export const formatMinutes = (minutes: number) => {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}min`;
  if (rest === 0) return `${h}h`;
  return `${h}h ${rest}min`;
};

const toDate = (d: string | Date) => (d instanceof Date ? d : new Date(d));

/** Série diária de minutos estudados para os últimos `days` dias (inclui hoje). */
export function buildDailyActivity(sessions: SessionLite[], days = 14): DailyPoint[] {
  const end = new Date();
  const start = subDays(end, days - 1);
  const interval = eachDayOfInterval({ start, end });

  return interval.map((date) => {
    const minutes = sessions
      .filter((s) => isSameDay(toDate(s.date), date))
      .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

    return {
      label: format(date, "dd/MM"),
      full: format(date, "d 'de' MMM", { locale: ptBR }),
      minutes,
      isToday: isSameDay(date, end),
    };
  });
}

/** Estatísticas agregadas a partir das sessões da janela. */
export function computeStudyStats(sessions: SessionLite[]): StudyStats {
  const today = startOfDay(new Date());
  const weekStart = subDays(today, 6);

  let todayMinutes = 0;
  let weekMinutes = 0;
  let focusSum = 0;
  let focusCount = 0;

  const minutesByDay = new Map<string, number>();

  for (const s of sessions) {
    const d = toDate(s.date);
    const key = format(d, "yyyy-MM-dd");
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + (s.durationMinutes || 0));

    if (isSameDay(d, today)) todayMinutes += s.durationMinutes || 0;
    if (startOfDay(d) >= weekStart) weekMinutes += s.durationMinutes || 0;

    if (typeof s.focusLevel === "number" && s.focusLevel > 0) {
      focusSum += s.focusLevel;
      focusCount++;
    }
  }

  const bestDayMinutes = Math.max(0, ...Array.from(minutesByDay.values()));
  const activeDays = Array.from(minutesByDay.values()).filter((m) => m > 0).length;

  // Sequência: dias consecutivos com estudo terminando hoje (ou ontem, como tolerância).
  let streak = 0;
  const has = (d: Date) => (minutesByDay.get(format(d, "yyyy-MM-dd")) ?? 0) > 0;
  let cursor = today;
  if (!has(cursor)) cursor = subDays(cursor, 1); // se ainda não estudou hoje, conta a partir de ontem
  while (has(cursor)) {
    streak++;
    cursor = subDays(cursor, 1);
  }

  return {
    todayMinutes,
    weekMinutes,
    streak,
    bestDayMinutes,
    activeDays,
    avgFocus: focusCount ? Math.round((focusSum / focusCount) * 10) / 10 : 0,
  };
}
