// Tipos compartilhados do dashboard de academia.

export interface Exercise {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  /** Séries detalhadas (sessão ao vivo). Quando presente, o volume usa a soma real.
   *  `type` distingue aquecimento (não conta volume) de séries de trabalho. */
  setLog?: { reps: string; weight: string; done: boolean; type?: string }[];
  /** Equipamento — define a semântica da carga (halter = por mão → volume ×2). */
  equipment?: string;
  /** Grupo muscular (capa colorida / agrupamentos). */
  group?: string;
  /** Anotação feita durante a sessão (ex.: reduzi a carga, dor no ombro). */
  note?: string;
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
