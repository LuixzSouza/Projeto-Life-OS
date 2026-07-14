"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { ActionResponse } from "./types";
import { loadMultiplier, type SaveGymSessionInput, type LastPerf, type Equipment, type ExerciseHistoryPoint, type MuscleRecovery } from "@/components/health/gym/session/session-types";
import { MUSCLE_GROUPS, groupOfExercise } from "@/components/health/gym/exercise-db";

const toNum = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const isWarmup = (s: Record<string, unknown>) => (typeof s.type === "string" ? s.type : "normal") === "warmup";

// Salva a sessão de treino ao vivo reaproveitando o modelo Workout (type="GYM").
// Os exercícios vão como JSON detalhado (setLog) + campos-resumo legados, então
// o histórico, o card e o gráfico de volume existentes seguem funcionando.
export async function saveGymSession(input: SaveGymSessionInput): Promise<ActionResponse & { id?: string }> {
  try {
    const userId = await requireUserId();

    const title = input.title?.trim() || "Treino";
    const duration = Math.max(0, Math.round(input.durationMin || 0));
    const exercises = Array.isArray(input.exercises) ? input.exercises : [];
    if (exercises.length === 0) {
      return { success: false, message: "Adicione ao menos um exercício antes de salvar." };
    }

    const created = await prisma.workout.create({
      data: {
        title,
        type: "GYM",
        duration,
        intensity: "HIGH",
        feeling: input.feeling ?? null,
        notes: input.notes ?? null,
        muscleGroup: (input.muscleGroups ?? []).join(", "),
        exercises: JSON.stringify(exercises),
        date: new Date(),
        userId,
      },
      select: { id: true },
    });

    revalidatePath("/health");
    revalidatePath("/health/gym");
    return { success: true, message: "Treino salvo! 💪", id: created.id };
  } catch (error) {
    console.error("Erro ao salvar sessão de treino:", error);
    return { success: false, message: "Falha ao salvar o treino." };
  }
}

// ---- Edição das séries de um treino salvo (setLog) ----
// O detalhe do treino permite corrigir carga/reps/tipo/feita de cada série DEPOIS
// de salvar. O resumo legado (sets/reps/weight) é RECOMPUTADO a partir do setLog
// para os gráficos e a "última vez" continuarem coerentes com a edição.

interface EditedSet { reps: string; weight: string; done: boolean; type?: string; doneAt?: number; rpe?: number }
export interface EditedExercise {
  name: string;
  equipment?: string;
  group?: string;
  timed?: boolean;
  note?: string;
  setLog: EditedSet[];
}

function summarizeEdited(ex: EditedExercise): Record<string, unknown> {
  const setLog = ex.setLog.map((s) => ({
    reps: String(s.reps || "0"),
    weight: String(s.weight || "0"),
    done: Boolean(s.done),
    type: typeof s.type === "string" ? s.type : "normal",
    ...(typeof s.doneAt === "number" ? { doneAt: s.doneAt } : {}),
    ...(typeof s.rpe === "number" ? { rpe: s.rpe } : {}),
  }));
  const done = setLog.filter((s) => s.done);
  const working = done.filter((s) => s.type !== "warmup");
  const top = working.reduce<EditedSet | null>((best, s) => (!best || toNum(s.weight) > toNum(best.weight) ? s : best), null);
  return {
    name: ex.name.trim(),
    sets: String(working.length || done.length || setLog.length),
    reps: top?.reps ?? (setLog[0]?.reps || "0"),
    weight: top?.weight ?? "0",
    setLog,
    isCompleted: done.length > 0 && done.length === setLog.length,
    ...(ex.equipment ? { equipment: ex.equipment } : {}),
    ...(ex.group ? { group: ex.group } : {}),
    ...(ex.timed ? { timed: true } : {}),
    ...(ex.note?.trim() ? { note: ex.note.trim() } : {}),
  };
}

/** Substitui as séries detalhadas de um treino (edição pós-salvamento). */
export async function updateWorkoutExercises(workoutId: string, exercises: EditedExercise[]): Promise<ActionResponse> {
  try {
    const userId = await requireUserId();
    const valid = exercises.filter((ex) => ex.name.trim() && Array.isArray(ex.setLog) && ex.setLog.length > 0);
    if (valid.length === 0) {
      return { success: false, message: "O treino precisa de ao menos um exercício com séries." };
    }
    const payload = JSON.stringify(valid.map(summarizeEdited));
    // updateMany: id + userId juntos sem exigir chave composta (regra do projeto).
    const res = await prisma.workout.updateMany({
      where: { id: workoutId, userId },
      data: { exercises: payload },
    });
    if (res.count === 0) return { success: false, message: "Treino não encontrado." };
    revalidatePath("/health");
    revalidatePath("/health/gym");
    return { success: true, message: "Séries atualizadas! ✏️" };
  } catch (error) {
    console.error("Erro ao editar séries do treino:", error);
    return { success: false, message: "Falha ao salvar a edição." };
  }
}

// Extrai, de forma segura, a "melhor série" (maior carga) de um exercício salvo,
// lidando tanto com o novo formato (setLog) quanto com o resumo legado.
function topSetOf(item: unknown): { weight: string; reps: string; sets: string } | null {
  if (typeof item !== "object" || item === null) return null;
  const rec = item as Record<string, unknown>;
  const name = typeof rec.name === "string" ? rec.name : "";
  if (!name) return null;

  if (Array.isArray(rec.setLog) && rec.setLog.length > 0) {
    // Aquecimento NÃO conta para a "melhor série" (sobrecarga progressiva limpa).
    const working = (rec.setLog as Record<string, unknown>[]).filter((s) => !isWarmup(s));
    let best: { weight: string; reps: string } | null = null;
    for (const s of working) {
      const w = toNum(s.weight);
      if (!best || w > toNum(best.weight)) best = { weight: String(s.weight ?? "0"), reps: String(s.reps ?? "0") };
    }
    const doneCount = working.filter((s) => Boolean(s.done)).length;
    return best ? { weight: best.weight, reps: best.reps, sets: String(doneCount || working.length) } : null;
  }

  return {
    weight: String(rec.weight ?? "0"),
    reps: String(rec.reps ?? "0"),
    sets: String(rec.sets ?? "0"),
  };
}

// Volume (kg) de um exercício salvo: séries de TRABALHO concluídas × fator do equip.
function storedExerciseVolume(rec: Record<string, unknown>): number {
  if (rec.timed === true) return 0; // por tempo (reps = segundos): não é volume
  const equipment = typeof rec.equipment === "string" ? (rec.equipment as Equipment) : undefined;
  const mult = loadMultiplier(equipment);
  if (Array.isArray(rec.setLog) && rec.setLog.length > 0) {
    let v = 0;
    for (const s of rec.setLog as Record<string, unknown>[]) {
      if (!s.done || isWarmup(s)) continue;
      v += toNum(s.reps) * toNum(s.weight) * mult;
    }
    return Math.round(v);
  }
  return Math.round(toNum(rec.weight) * toNum(rec.sets) * toNum(rec.reps) * mult);
}

// Nº de séries de TRABALHO concluídas (ignora aquecimento). Fallback no resumo legado.
function workingDoneSets(rec: Record<string, unknown>): number {
  if (Array.isArray(rec.setLog) && rec.setLog.length > 0) {
    return (rec.setLog as Record<string, unknown>[]).filter((s) => Boolean(s.done) && !isWarmup(s)).length;
  }
  return Math.round(toNum(rec.sets));
}

// Para cada exercício já treinado, devolve o desempenho MAIS RECENTE (sobrecarga
// progressiva). O cliente cruza por nome (case-insensitive) com os exercícios da sessão.
export async function getRecentExercisePerformance(): Promise<LastPerf[]> {
  try {
    const userId = await requireUserId();
    const rows = await prisma.workout.findMany({
      where: { type: "GYM", userId },
      orderBy: { date: "desc" },
      take: 40,
      select: { date: true, exercises: true },
    });

    const byName = new Map<string, LastPerf>();
    for (const row of rows) {
      if (!row.exercises) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(row.exercises);
      } catch {
        continue;
      }
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        const rec = item as Record<string, unknown>;
        const name = typeof rec?.name === "string" ? rec.name.trim() : "";
        if (!name) continue;
        const key = name.toLowerCase();
        if (byName.has(key)) continue; // já temos o mais recente (rows vêm desc)
        const top = topSetOf(item);
        if (!top || top.weight === "0") continue;
        // Séries de trabalho FEITAS na última execução, em ordem — vira o fantasma
        // série-a-série da sessão (cada linha mostra o que foi feito naquela série).
        let lastSets: { weight: string; reps: string }[] | undefined;
        if (Array.isArray(rec.setLog)) {
          const done = (rec.setLog as Record<string, unknown>[]).filter((s) => Boolean(s.done) && !isWarmup(s));
          if (done.length > 0) lastSets = done.map((s) => ({ weight: String(s.weight ?? "0"), reps: String(s.reps ?? "0") }));
        }
        byName.set(key, { name, date: row.date.toISOString(), weight: top.weight, reps: top.reps, sets: top.sets, ...(lastSets ? { lastSets } : {}) });
      }
    }

    return Array.from(byName.values());
  } catch (error) {
    console.error("Erro ao buscar desempenho anterior:", error);
    return [];
  }
}

// Histórico de VOLUME por exercício (mini-gráfico da tela de descanso). Mapa
// nome-minúsculo → últimos ~8 pontos {date, volume} em ordem cronológica (asc).
export async function getExerciseVolumeHistory(): Promise<Record<string, ExerciseHistoryPoint[]>> {
  try {
    const userId = await requireUserId();
    const rows = await prisma.workout.findMany({
      where: { type: "GYM", userId },
      orderBy: { date: "desc" },
      take: 60,
      select: { date: true, exercises: true },
    });

    const map: Record<string, ExerciseHistoryPoint[]> = {};
    for (const row of rows) {
      if (!row.exercises) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(row.exercises);
      } catch {
        continue;
      }
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        if (typeof item !== "object" || item === null) continue;
        const rec = item as Record<string, unknown>;
        const name = typeof rec.name === "string" ? rec.name.trim() : "";
        if (!name) continue;
        const volume = storedExerciseVolume(rec);
        if (volume <= 0) continue;
        const key = name.toLowerCase();
        (map[key] ??= []).push({ date: row.date.toISOString(), volume });
      }
    }

    // rows vieram desc → cada série está desc; inverte p/ asc e mantém os últimos 8.
    for (const key of Object.keys(map)) {
      map[key] = map[key].reverse().slice(-8);
    }
    return map;
  } catch (error) {
    console.error("Erro ao buscar histórico de volume:", error);
    return {};
  }
}

// Mapa de fadiga/recuperação por grupo muscular ("treino perna hoje ou tá recente?").
// Para cada grupo: a sessão MAIS RECENTE que o treinou, seu volume/séries e quão
// recuperado está (0 = fadigado … 1 = recuperado) numa janela de 48–72h que cresce
// com o volume. Grupos nunca treinados voltam como "frescos" (recovery = 1).
export async function getMuscleRecovery(): Promise<MuscleRecovery[]> {
  try {
    const userId = await requireUserId();
    const rows = await prisma.workout.findMany({
      where: { type: "GYM", userId },
      orderBy: { date: "desc" },
      take: 30,
      select: { date: true, exercises: true },
    });

    const latest: Record<string, { date: Date; volume: number; sets: number }> = {};
    for (const row of rows) {
      if (!row.exercises) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(row.exercises);
      } catch {
        continue;
      }
      if (!Array.isArray(parsed)) continue;

      const perGroup: Record<string, { volume: number; sets: number }> = {};
      for (const item of parsed) {
        if (typeof item !== "object" || item === null) continue;
        const rec = item as Record<string, unknown>;
        const name = typeof rec.name === "string" ? rec.name.trim() : "";
        if (!name) continue;
        const g = groupOfExercise(name);
        if (!g) continue;
        const bucket = (perGroup[g] ??= { volume: 0, sets: 0 });
        bucket.volume += storedExerciseVolume(rec);
        bucket.sets += workingDoneSets(rec);
      }
      // rows vêm desc → o 1º que vemos por grupo é a sessão mais recente dele.
      for (const g of Object.keys(perGroup)) {
        if (!latest[g]) latest[g] = { date: row.date, volume: perGroup[g].volume, sets: perGroup[g].sets };
      }
    }

    const now = Date.now();
    return MUSCLE_GROUPS.map(({ value }) => {
      const l = latest[value];
      if (!l) return { group: value, lastTrainedAt: null, hoursSince: null, sets: 0, volume: 0, recovery: 1 };
      const hours = (now - l.date.getTime()) / 3_600_000;
      const recoveryHours = 48 + Math.min(24, l.sets * 2); // 48–72h conforme a carga
      const recovery = Math.max(0, Math.min(1, hours / recoveryHours));
      return {
        group: value,
        lastTrainedAt: l.date.toISOString(),
        hoursSince: Math.max(0, Math.round(hours)),
        sets: l.sets,
        volume: l.volume,
        recovery,
      };
    });
  } catch (error) {
    console.error("Erro ao calcular recuperação muscular:", error);
    return [];
  }
}
