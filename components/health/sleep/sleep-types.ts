// Tipos e constantes compartilhados do dashboard de sono.

export interface SleepEntry {
  id: string;
  date: string; // ISO String
  value: number; // Horas
}

export interface SleepChartPoint {
  day: string;
  fullDate: string;
  hours: number;
  quality: 'good' | 'bad' | 'none';
}

export const SLEEP_GOAL = 8;
