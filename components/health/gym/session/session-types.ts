// Tipos e helpers PUROS da sessão de treino ao vivo (sem localStorage/DOM, então
// podem ser importados tanto pelo client quanto pela server action de salvar).

export interface LiveSet {
  id: string;
  reps: string;
  weight: string;
  done: boolean;
}

export interface LiveExercise {
  id: string;
  name: string;
  group?: string;
  sets: LiveSet[];
  note?: string;
}

export interface LiveSession {
  startedAt: number;          // epoch ms — base do cronômetro
  title: string;
  muscleGroups: string[];
  exercises: LiveExercise[];
  restSeconds: number;        // descanso padrão entre séries
  finishedAt?: number;        // marca a fase de resumo
}

/** Rotina reutilizável (salva no localStorage). */
export interface Routine {
  id: string;
  name: string;
  muscleGroups: string[];
  exercises: { name: string; group?: string; sets: number; reps: string; weight: string }[];
}

/** Desempenho anterior de um exercício (para sobrecarga progressiva). */
export interface LastPerf {
  name: string;
  date: string;     // ISO
  weight: string;
  reps: string;
  sets: string;
}

// ---- Formato persistido dentro de Workout.exercises (JSON) ----
// Mantém os campos-resumo legados (sets/reps/weight) para os gráficos e o card de
// histórico continuarem funcionando, e adiciona `setLog` com as séries detalhadas.
export interface StoredSet { reps: string; weight: string; done: boolean }
export interface StoredExercise {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  setLog: StoredSet[];
  isCompleted: boolean;
}

export interface SaveGymSessionInput {
  title: string;
  muscleGroups: string[];
  durationMin: number;
  feeling?: string | null;
  notes?: string | null;
  exercises: StoredExercise[];
}

const num = (v: string | number | undefined): number => {
  const n = typeof v === "number" ? v : parseFloat((v ?? "").toString().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Volume (kg) de uma série = reps × carga. */
export function setVolume(s: { reps: string; weight: string }): number {
  return num(s.reps) * num(s.weight);
}

/** Volume total das séries CONCLUÍDAS de um exercício. */
export function exerciseVolume(sets: { reps: string; weight: string; done: boolean }[]): number {
  return sets.filter((s) => s.done).reduce((acc, s) => acc + setVolume(s), 0);
}

/** Estatísticas da sessão (séries feitas, volume total). */
export function sessionStats(exercises: LiveExercise[]): { doneSets: number; totalSets: number; volume: number } {
  let doneSets = 0;
  let totalSets = 0;
  let volume = 0;
  for (const ex of exercises) {
    totalSets += ex.sets.length;
    for (const s of ex.sets) {
      if (s.done) { doneSets += 1; volume += setVolume(s); }
    }
  }
  return { doneSets, totalSets, volume: Math.round(volume) };
}

/** Converte os exercícios da sessão no formato persistido (setLog + resumo legado). */
export function toStoredExercises(exercises: LiveExercise[]): StoredExercise[] {
  return exercises
    .filter((ex) => ex.name.trim())
    .map((ex) => {
      const setLog: StoredSet[] = ex.sets.map((s) => ({ reps: s.reps || "0", weight: s.weight || "0", done: s.done }));
      const done = setLog.filter((s) => s.done);
      // Campos-resumo: nº de séries feitas, carga de topo e as reps dessa série.
      const top = done.reduce<StoredSet | null>((best, s) => (!best || num(s.weight) > num(best.weight) ? s : best), null);
      return {
        name: ex.name.trim(),
        sets: String(done.length || ex.sets.length),
        reps: top?.reps ?? (ex.sets[0]?.reps || "0"),
        weight: top?.weight ?? "0",
        setLog,
        isCompleted: done.length > 0 && done.length === ex.sets.length,
      };
    });
}

let _seq = 0;
/** ID curto e único o suficiente para itens locais da sessão. */
export function uid(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq}`;
}
