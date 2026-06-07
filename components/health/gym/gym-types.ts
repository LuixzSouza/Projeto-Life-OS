// Tipos compartilhados do dashboard de academia.

export interface Exercise {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  /** Séries detalhadas (sessão ao vivo). Quando presente, o volume usa a soma real. */
  setLog?: { reps: string; weight: string; done: boolean }[];
}

export interface GymWorkout {
  id: string;
  title: string;
  date: string;
  duration: number;
  feeling: string | null;
  muscleGroup: string | null;
  exercises: Exercise[];
}

export interface VolumePoint {
  date: string;
  fullDate: string;
  load: number;
  title: string;
}

export interface MuscleCount {
  name: string;
  value: number;
}
