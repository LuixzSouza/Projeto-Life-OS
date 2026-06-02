// Tipos compartilhados do feed de atividades.

export type ActivityFilter = 'ALL' | 'GYM' | 'RUN';

export interface ExerciseItem {
  name: string;
  weight: string;
  sets?: string;
  reps?: string;
}

export interface ActivityStatsData {
  count: number;
  duration: number;
  calories: number;
}
