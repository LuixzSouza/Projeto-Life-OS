// Cálculos e análises de sono — baseados em padrões de apps reais
// (Sleep Cycle, Oura, Whoop): score, consistência, dívida e ciclos de 90min.

export const DEFAULT_SLEEP_GOAL = 8;
export const SLEEP_CYCLE_MIN = 90;     // duração média de um ciclo de sono
export const FALL_ASLEEP_MIN = 15;     // latência média para adormecer

export interface SleepEntryLite {
  date: string; // ISO
  value: number; // horas
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const stdDev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = avg(xs);
  const variance = avg(xs.map(x => (x - m) ** 2));
  return Math.sqrt(variance);
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// --- Tempo (HH:MM) em minutos e vice-versa ---
export function parseTime(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function formatTime(totalMin: number): string {
  const m = ((totalMin % 1440) + 1440) % 1440; // normaliza p/ 0..1439
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Duração em horas entre deitar e acordar (lida com virada de meia-noite). */
export function durationBetween(bedtime: string, wakeTime: string): number | null {
  const bed = parseTime(bedtime);
  const wake = parseTime(wakeTime);
  if (bed === null || wake === null) return null;
  let diff = wake - bed;
  if (diff <= 0) diff += 1440; // dormiu passando da meia-noite
  return round1(diff / 60);
}

/**
 * Sugestões de horário de dormir para acordar em determinado horário,
 * completando ciclos de sono inteiros (evita acordar no meio do ciclo).
 */
export interface CycleSuggestion {
  cycles: number;
  hours: number;
  time: string;
}

export function bedtimeSuggestions(wakeTime: string, cyclesList = [6, 5, 4]): CycleSuggestion[] {
  const wake = parseTime(wakeTime);
  if (wake === null) return [];
  return cyclesList.map(cycles => {
    const sleepMin = cycles * SLEEP_CYCLE_MIN + FALL_ASLEEP_MIN;
    return { cycles, hours: round1(sleepMin / 60), time: formatTime(wake - sleepMin) };
  });
}

/** Sugestões de horário para acordar caso vá dormir agora/num horário. */
export function wakeSuggestions(bedTime: string, cyclesList = [4, 5, 6]): CycleSuggestion[] {
  const bed = parseTime(bedTime);
  if (bed === null) return [];
  return cyclesList.map(cycles => {
    const sleepMin = cycles * SLEEP_CYCLE_MIN + FALL_ASLEEP_MIN;
    return { cycles, hours: round1(sleepMin / 60), time: formatTime(bed + sleepMin) };
  });
}

// --- Análise agregada ---
export interface SleepInsights {
  count: number;           // registros nos últimos 7 dias
  avg7: number;            // média de horas (7 dias)
  debt: number;            // dívida de sono acumulada (h) nos últimos 7 dias
  consistency: number;     // regularidade 0-100
  streak: number;          // noites consecutivas na meta (a partir da mais recente)
  score: number;           // pontuação geral 0-100
  best: SleepEntryLite | null;
  worst: SleepEntryLite | null;
}

export function computeSleepInsights(entries: SleepEntryLite[], goal = DEFAULT_SLEEP_GOAL): SleepInsights {
  const sorted = [...entries].sort((a, b) => +new Date(a.date) - +new Date(b.date));

  const now = new Date();
  const sevenAgo = new Date(now);
  sevenAgo.setDate(now.getDate() - 6);
  sevenAgo.setHours(0, 0, 0, 0);

  const last7 = sorted.filter(e => new Date(e.date) >= sevenAgo);
  const vals7 = last7.map(e => e.value);

  const avg7 = round1(avg(vals7));
  const debt = round1(last7.reduce((acc, e) => acc + (goal - e.value), 0));

  // Consistência: menor desvio-padrão das horas = mais regular.
  const sd = stdDev(vals7);
  const consistency = vals7.length >= 2 ? Math.round(clamp(100 - sd * 30)) : 0;

  // Streak: noites consecutivas (a partir da mais recente) atingindo a meta.
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].value >= goal - 0.25) streak++;
    else break;
  }

  // Score: 50% adequação de duração + 30% consistência + 20% dívida.
  const durationScore = vals7.length ? clamp((avg7 / goal) * 100) : 0;
  const debtScore = clamp(100 - Math.max(0, debt) * 8);
  const score = vals7.length
    ? Math.round(0.5 * durationScore + 0.3 * consistency + 0.2 * debtScore)
    : 0;

  let best: SleepEntryLite | null = null;
  let worst: SleepEntryLite | null = null;
  for (const e of last7) {
    if (!best || e.value > best.value) best = e;
    if (!worst || e.value < worst.value) worst = e;
  }

  return { count: last7.length, avg7, debt, consistency, streak, score, best, worst };
}

export function scoreLabel(score: number): { label: string; tone: "emerald" | "blue" | "amber" | "rose" } {
  if (score >= 85) return { label: "Excelente", tone: "emerald" };
  if (score >= 70) return { label: "Bom", tone: "blue" };
  if (score >= 50) return { label: "Regular", tone: "amber" };
  return { label: "Precisa melhorar", tone: "rose" };
}
