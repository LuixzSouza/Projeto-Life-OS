// Tipos e helpers PUROS da sessão de treino ao vivo (sem localStorage/DOM, então
// podem ser importados tanto pelo client quanto pela server action de salvar).

/** Equipamento do exercício — muda a SEMÂNTICA do peso digitado:
 *  - dumbbell (halter): o valor é por MÃO → carga total move o dobro.
 *  - barbell/machine/cable: o valor é a carga total.
 *  - bodyweight: peso corporal (carga 0 é válida; valor extra é opcional). */
export type Equipment = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "other";

export const EQUIPMENT_META: Record<Equipment, { label: string; short: string; perHand: boolean; allowsZero: boolean }> = {
  barbell:    { label: "Barra",         short: "Barra",  perHand: false, allowsZero: false },
  dumbbell:   { label: "Halteres",      short: "Halter", perHand: true,  allowsZero: false },
  machine:    { label: "Máquina",       short: "Máq.",   perHand: false, allowsZero: false },
  cable:      { label: "Cabo/Polia",    short: "Cabo",   perHand: false, allowsZero: false },
  bodyweight: { label: "Peso corporal", short: "Corpo",  perHand: false, allowsZero: true  },
  other:      { label: "Outro",         short: "Outro",  perHand: false, allowsZero: false },
};

/** Fator de carga: halteres somam as duas mãos no volume total. */
export function loadMultiplier(equipment?: Equipment): number {
  return equipment === "dumbbell" ? 2 : 1;
}

/** Palpite de equipamento pelo nome do exercício (PT-BR). Acerta a semântica da
 *  carga já na criação; o usuário pode trocar a qualquer momento na sessão. */
export function guessEquipment(name: string): Equipment {
  const n = name.toLowerCase();
  if (/(halter|alternad|arnold|martelo|concentrada)/.test(n)) return "dumbbell";
  if (/(polia|cabo|pulley|crossover|corda|pull-?down|pulldown|face pull)/.test(n)) return "cable";
  if (/(barra fixa|flex[aã]o|prancha|abdominal|mergulho|paralelas|elevaç[aã]o de pernas|burpee|mountain)/.test(n)) return "bodyweight";
  if (/(m[aá]quina|leg press|cadeira|mesa flexora|peck|voador|hack|smith)/.test(n)) return "machine";
  return "barbell";
}

/** Tipo da série — aquecimento NÃO conta para volume/recorde/1RM (só séries de
 *  trabalho refletem evolução). "failure" = série levada à falha; "drop" = série
 *  com carga REDUZIDA por não aguentar o peso planejado (drop set / continuação). */
export type SetType = "warmup" | "normal" | "failure" | "drop";

export const SET_TYPE_META: Record<SetType, { label: string; short: string; tone: string }> = {
  warmup:  { label: "Aquecimento",  short: "A", tone: "text-amber-600 bg-amber-400/15 border-amber-400/40" },
  normal:  { label: "Normal",       short: "N", tone: "text-muted-foreground bg-muted border-border/50" },
  failure: { label: "Falha",        short: "F", tone: "text-red-600 bg-red-500/15 border-red-500/40" },
  drop:    { label: "Carga reduzida", short: "D", tone: "text-orange-600 bg-orange-500/15 border-orange-500/40" },
};

/** Só séries de trabalho (não-aquecimento) contam para métricas de evolução. */
export function isWorkingSet(s: { type?: SetType }): boolean {
  return (s.type ?? "normal") !== "warmup";
}

export interface LiveSet {
  id: string;
  reps: string;
  weight: string;
  done: boolean;
  type?: SetType;        // default: "normal"
  doneAt?: number;       // epoch ms de quando foi concluída (prova de execução real)
}

/** Meta vinda de uma Ficha, carregada na sessão (fantasma de reps + coloração). */
export interface LiveTarget {
  minReps: number;
  maxReps: number;
  intensity?: { type: "RIR" | "RPE"; value: number };
  restSeconds?: number;   // descanso específico do exercício (override do padrão da sessão)
}

export interface LiveExercise {
  id: string;
  name: string;
  group?: string;
  equipment?: Equipment;
  target?: LiveTarget;
  sets: LiveSet[];
  note?: string;
}

// Opções para iniciar uma sessão (compartilhado por setup, ficha e pending-start).
export interface StartExerciseInput {
  name: string;
  group?: string;
  equipment?: Equipment;
  sets: number;
  reps?: string;
  weight?: string;
  target?: LiveTarget;
}
export interface StartOptions {
  title: string;
  muscleGroups: string[];
  exercises: StartExerciseInput[];
  restSeconds?: number;
  /** Minutos de aquecimento antes do treino (a sessão abre na fase de aquecimento). */
  warmupMinutes?: number;
}

export interface LiveSession {
  startedAt: number;          // epoch ms — base do cronômetro
  updatedAt?: number;         // epoch ms — última modificação (detecta sessão obsoleta)
  title: string;
  muscleGroups: string[];
  exercises: LiveExercise[];
  restSeconds: number;        // descanso padrão entre séries
  finishedAt?: number;        // marca a fase de resumo
  // --- Pausa real do cronômetro: tempo decorrido = now - startedAt - pausedMs
  // (- pausa em andamento). Pausar NÃO encerra nada — só congela o relógio.
  pausedAt?: number;          // epoch ms do início da pausa atual (undefined = rodando)
  pausedMs?: number;          // total acumulado de pausas anteriores (ms)
  // --- Aquecimento: fase opcional antes da 1ª série, com timer próprio.
  warmupEndsAt?: number;      // epoch ms do fim previsto do aquecimento
  warmupDone?: boolean;       // usuário concluiu/pulou o aquecimento
  // --- Local do treino (GPS, best-effort) — vira link de mapa nas notas ao salvar.
  location?: { lat: number; lng: number };
}

/** Segundos decorridos descontando pausas (cronômetro "honesto"). */
export function elapsedSeconds(s: Pick<LiveSession, "startedAt" | "pausedAt" | "pausedMs">, now: number): number {
  const pausedLive = s.pausedAt ? now - s.pausedAt : 0;
  return Math.max(0, Math.floor((now - s.startedAt - (s.pausedMs ?? 0) - pausedLive) / 1000));
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
export interface StoredSet { reps: string; weight: string; done: boolean; type?: SetType; doneAt?: number }
export interface StoredExercise {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  equipment?: Equipment;
  setLog: StoredSet[];
  isCompleted: boolean;
  /** Anotação da sessão (ex.: reduções de carga no meio do treino). */
  note?: string;
}

/** Ponto do histórico de volume de um exercício (sparkline da tela de descanso). */
export interface ExerciseHistoryPoint { date: string; volume: number }

/** Estado de recuperação de um grupo muscular (mapa de fadiga do dashboard). */
export interface MuscleRecovery {
  group: string;             // valor do grupo (ex.: "Pernas")
  lastTrainedAt: string | null;
  hoursSince: number | null; // calculado no servidor (sem mismatch de hidratação)
  sets: number;              // séries de trabalho na última sessão do grupo
  volume: number;
  recovery: number;          // 0 (fadigado) … 1 (recuperado)
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

/** Volume (kg) de uma série = reps × carga × fator do equipamento. */
export function setVolume(s: { reps: string; weight: string }, equipment?: Equipment): number {
  return num(s.reps) * num(s.weight) * loadMultiplier(equipment);
}

/** Volume total das séries CONCLUÍDAS de um exercício. */
export function exerciseVolume(sets: { reps: string; weight: string; done: boolean }[], equipment?: Equipment): number {
  return sets.filter((s) => s.done).reduce((acc, s) => acc + setVolume(s, equipment), 0);
}

/** Estatísticas da sessão (séries feitas, volume total). Aquecimento conta como
 *  série concluída, mas NÃO entra no volume (métrica de evolução limpa). */
export function sessionStats(exercises: LiveExercise[]): { doneSets: number; totalSets: number; volume: number } {
  let doneSets = 0;
  let totalSets = 0;
  let volume = 0;
  for (const ex of exercises) {
    totalSets += ex.sets.length;
    for (const s of ex.sets) {
      if (s.done) {
        doneSets += 1;
        if (isWorkingSet(s)) volume += setVolume(s, ex.equipment);
      }
    }
  }
  return { doneSets, totalSets, volume: Math.round(volume) };
}

/** Recorde: alguma série de TRABALHO feita supera a "última vez" (mais carga, ou
 *  mesma carga e mais reps). Aquecimento nunca vira recorde. */
export function isExercisePR(ex: LiveExercise, last?: LastPerf): boolean {
  if (!last) return false;
  const lastW = num(last.weight);
  const lastR = num(last.reps);
  let best: { w: number; r: number } | null = null;
  for (const s of ex.sets) {
    if (!s.done || !isWorkingSet(s)) continue;
    const w = num(s.weight), r = num(s.reps);
    if (!best || w > best.w || (w === best.w && r > best.r)) best = { w, r };
  }
  if (!best || best.w === 0) return false;
  return best.w > lastW || (best.w === lastW && best.r > lastR);
}

/** Volume das séries de trabalho concluídas por GRUPO muscular (resumo da sessão). */
export function volumeByGroup(exercises: LiveExercise[]): { group: string; volume: number }[] {
  const map = new Map<string, number>();
  for (const ex of exercises) {
    const vol = ex.sets.filter((s) => s.done && isWorkingSet(s)).reduce((acc, s) => acc + setVolume(s, ex.equipment), 0);
    if (vol <= 0) continue;
    const g = ex.group?.trim() || "Outros";
    map.set(g, (map.get(g) ?? 0) + vol);
  }
  return Array.from(map, ([group, volume]) => ({ group, volume: Math.round(volume) })).sort((a, b) => b.volume - a.volume);
}

/** Tempo médio de TROCA de exercício (s): da última série feita de um exercício
 *  até a primeira do seguinte, na ordem do treino. Inclui o descanso pós-última
 *  série + deslocamento/montagem — é o custo real de transição. Null sem dados.
 *  Ignora < 5s (cliques em sequência) e > 30 min (pausa/abandono). */
export function averageExerciseTransitionSeconds(exercises: LiveExercise[]): number | null {
  const gaps: number[] = [];
  let prevLast: number | null = null;
  for (const ex of exercises) {
    const stamps = ex.sets.filter((s) => s.done && s.doneAt).map((s) => s.doneAt as number).sort((a, b) => a - b);
    if (stamps.length === 0) continue;
    if (prevLast !== null) {
      const gap = (stamps[0] - prevLast) / 1000;
      if (gap >= 5 && gap <= 1800) gaps.push(gap);
    }
    prevLast = stamps[stamps.length - 1];
  }
  if (gaps.length === 0) return null;
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

/** Ritmo médio entre séries concluídas (s), via carimbos doneAt. Null sem dados.
 *  Ignora intervalos < 5s (cliques em sequência) e > 15 min (pausa/abandono). */
export function averageSetGapSeconds(exercises: LiveExercise[]): number | null {
  const stamps = exercises.flatMap((e) => e.sets.filter((s) => s.done && s.doneAt).map((s) => s.doneAt as number)).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < stamps.length; i++) {
    const gap = (stamps[i] - stamps[i - 1]) / 1000;
    if (gap >= 5 && gap <= 900) gaps.push(gap);
  }
  if (gaps.length === 0) return null;
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

/** Estimativa de 1RM (Epley) da MELHOR série de trabalho concluída. 0 se não houver. */
export function estimatedOneRepMax(ex: LiveExercise): number {
  let best = 0;
  for (const s of ex.sets) {
    if (!s.done || !isWorkingSet(s)) continue;
    const w = num(s.weight) * loadMultiplier(ex.equipment);
    const r = num(s.reps);
    if (w <= 0 || r <= 0) continue;
    const orm = w * (1 + r / 30); // Epley
    if (orm > best) best = orm;
  }
  return Math.round(best);
}

/** Converte os exercícios da sessão no formato persistido (setLog + resumo legado). */
export function toStoredExercises(exercises: LiveExercise[]): StoredExercise[] {
  return exercises
    .filter((ex) => ex.name.trim())
    .map((ex) => {
      const setLog: StoredSet[] = ex.sets.map((s) => ({ reps: s.reps || "0", weight: s.weight || "0", done: s.done, type: s.type ?? "normal", ...(s.doneAt ? { doneAt: s.doneAt } : {}) }));
      const done = setLog.filter((s) => s.done);
      // Resumo de evolução vem só das séries de TRABALHO feitas (ignora aquecimento).
      const working = done.filter(isWorkingSet);
      const top = working.reduce<StoredSet | null>((best, s) => (!best || num(s.weight) > num(best.weight) ? s : best), null);
      return {
        name: ex.name.trim(),
        sets: String(working.length || done.length || ex.sets.length),
        reps: top?.reps ?? (ex.sets[0]?.reps || "0"),
        weight: top?.weight ?? "0",
        equipment: ex.equipment,
        setLog,
        isCompleted: done.length > 0 && done.length === ex.sets.length,
        ...(ex.note?.trim() ? { note: ex.note.trim() } : {}),
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
