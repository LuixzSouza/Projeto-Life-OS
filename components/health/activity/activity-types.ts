// Tipos compartilhados do feed de atividades.

export type ActivityFilter = 'ALL' | 'GYM' | 'RUN';

export interface ExerciseSetLog {
  reps: string;
  weight: string;
  done: boolean;
}

export interface ExerciseItem {
  name: string;
  weight: string;
  sets?: string;
  reps?: string;
  /** Séries detalhadas da sessão ao vivo (quando existem, dão o volume real). */
  setLog?: ExerciseSetLog[];
}

export interface ActivityStatsData {
  count: number;
  duration: number;
  calories: number;
}
