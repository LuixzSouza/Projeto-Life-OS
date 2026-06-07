"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { ActionResponse } from "./types";
import type { SaveGymSessionInput, LastPerf } from "@/components/health/gym/session/session-types";

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

// Extrai, de forma segura, a "melhor série" (maior carga) de um exercício salvo,
// lidando tanto com o novo formato (setLog) quanto com o resumo legado.
function topSetOf(item: unknown): { weight: string; reps: string; sets: string } | null {
  if (typeof item !== "object" || item === null) return null;
  const rec = item as Record<string, unknown>;
  const name = typeof rec.name === "string" ? rec.name : "";
  if (!name) return null;

  const toNum = (v: unknown) => {
    const n = parseFloat(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  if (Array.isArray(rec.setLog) && rec.setLog.length > 0) {
    let best: { weight: string; reps: string } | null = null;
    for (const s of rec.setLog as Record<string, unknown>[]) {
      const w = toNum(s.weight);
      if (!best || w > toNum(best.weight)) best = { weight: String(s.weight ?? "0"), reps: String(s.reps ?? "0") };
    }
    const doneCount = (rec.setLog as Record<string, unknown>[]).filter((s) => Boolean(s.done)).length;
    return best ? { weight: best.weight, reps: best.reps, sets: String(doneCount || (rec.setLog as unknown[]).length) } : null;
  }

  return {
    weight: String(rec.weight ?? "0"),
    reps: String(rec.reps ?? "0"),
    sets: String(rec.sets ?? "0"),
  };
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
        byName.set(key, { name, date: row.date.toISOString(), weight: top.weight, reps: top.reps, sets: top.sets });
      }
    }

    return Array.from(byName.values());
  } catch (error) {
    console.error("Erro ao buscar desempenho anterior:", error);
    return [];
  }
}
