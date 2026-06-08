"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { ActionResponse } from "./types";

// =========================================================
// CHECK-IN DE ENERGIA (Fase 0 — base do Motor de Correlação)
// =========================================================
// Um registro por dia (escala 1–5). A data vem do CLIENTE como "YYYY-MM-DD" (dia
// local dele) e é ancorada em T12:00:00Z — assim o "dia" é o mesmo no celular e no
// PC (evita o bug de fuso) e o upsert dedup por (userId, dia).

export interface SerializedEnergyCheckin {
  date: string; // YYYY-MM-DD
  energy: number; // 1–5
  mood: number | null;
  note: string | null;
}

function dayDate(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T12:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

export async function saveEnergyCheckin(
  dateStr: string,
  energy: number,
  note?: string | null,
): Promise<ActionResponse> {
  try {
    const userId = await requireUserId();
    const date = dayDate(dateStr);
    if (!date) return { success: false, message: "Data inválida." };
    const e = Math.round(energy);
    if (!(e >= 1 && e <= 5)) return { success: false, message: "Energia deve ser de 1 a 5." };
    const cleanNote = note?.trim() || null;

    await prisma.energyCheckin.upsert({
      where: { userId_date: { userId, date } },
      update: { energy: e, note: cleanNote },
      create: { userId, date, energy: e, note: cleanNote },
    });
    return { success: true, message: "Energia registrada." };
  } catch (error) {
    console.error("Erro ao salvar check-in de energia:", error);
    return { success: false, message: "Falha ao registrar a energia." };
  }
}

/** Check-ins dos últimos `days` dias (mais recentes primeiro). */
export async function getEnergyCheckins(days = 30): Promise<SerializedEnergyCheckin[]> {
  try {
    const userId = await requireUserId();
    const since = new Date();
    since.setDate(since.getDate() - Math.max(1, days));
    const rows = await prisma.energyCheckin.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: "desc" },
    });
    // Stored em T12:00:00Z → slice(0,10) devolve o YYYY-MM-DD correto em qualquer fuso.
    return rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      energy: r.energy,
      mood: r.mood,
      note: r.note,
    }));
  } catch (error) {
    console.error("Erro ao carregar check-ins de energia:", error);
    return [];
  }
}
