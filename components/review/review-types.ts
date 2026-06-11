// Tipos e helpers compartilhados da Retrospectiva (página, gráfico e PDF).
// Módulo plain (sem "use server"/"use client") — importável dos dois lados.

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface MonthStats {
  income: number;
  expense: number;
  txCount: number;
  topCategories: CategoryTotal[];
  workouts: number;
  workoutMinutes: number;
  studyMinutes: number;
  studySessions: number;
  focusMinutes: number;
  focusSessions: number;
  tasksDone: number;
  projectsDone: number;
  notesCreated: number;
  mediaCompleted: number;
  habitsDone: number;
  sleepAvg: number | null;
  weightStart: number | null;
  weightEnd: number | null;
  mealsCount: number;
  kcalTotal: number;
}

export const fmtMinutes = (min: number): string => {
  if (min <= 0) return "0min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
};

export const fmtKg = (v: number): string => v.toFixed(1).replace(".", ",");
