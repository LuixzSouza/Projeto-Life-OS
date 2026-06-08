"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { ActionResponse } from "./types";

// =========================================================
// FOTOS DE TREINO (galeria sincronizável)
// =========================================================
// Guardadas como base64 NO BANCO (não mais em IndexedDB local), para que
// sincronizem entre dispositivos via Turso (modo nuvem/híbrido). As imagens já
// chegam comprimidas (≤1280px JPEG) do cliente.

export interface WorkoutPhotoInput {
  dataUrl: string;
  title: string;
  date: string; // ISO
  volume?: number | null;
  durationMin?: number | null;
  sets?: number | null;
  workoutId?: string | null;
}

export interface SerializedWorkoutPhoto {
  id: string;
  dataUrl: string;
  title: string;
  date: string; // ISO
  volume: number | null;
  durationMin: number | null;
  sets: number | null;
}

const MAX_PHOTOS = 1000; // teto de segurança por usuário (poda as mais antigas)

/** Salva uma ou mais fotos no banco. Insere uma a uma (base64 grande → evita
 *  estourar o tamanho de statement do libSQL num INSERT múltiplo). */
export async function saveWorkoutPhotos(
  photos: WorkoutPhotoInput[]
): Promise<ActionResponse & { saved?: number }> {
  try {
    const userId = await requireUserId();
    if (!Array.isArray(photos) || photos.length === 0) {
      return { success: true, message: "Nada a salvar.", saved: 0 };
    }
    let saved = 0;
    for (const p of photos) {
      if (!p?.dataUrl || typeof p.dataUrl !== "string") continue;
      const parsed = new Date(p.date);
      await prisma.workoutPhoto.create({
        data: {
          userId,
          dataUrl: p.dataUrl,
          title: (p.title || "Treino").trim(),
          date: isNaN(parsed.getTime()) ? new Date() : parsed,
          volume: p.volume ?? null,
          durationMin: p.durationMin ?? null,
          sets: p.sets ?? null,
          workoutId: p.workoutId ?? null,
        },
      });
      saved++;
    }
    return { success: true, message: `${saved} foto(s) salva(s).`, saved };
  } catch (error) {
    console.error("Erro ao salvar fotos do treino:", error);
    return { success: false, message: "Falha ao salvar as fotos." };
  }
}

/** Lista as fotos do usuário (mais recentes primeiro). Poda silenciosa do excedente. */
export async function getWorkoutPhotos(): Promise<SerializedWorkoutPhoto[]> {
  try {
    const userId = await requireUserId();
    const rows = await prisma.workoutPhoto.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: MAX_PHOTOS,
    });
    return rows.map((r) => ({
      id: r.id,
      dataUrl: r.dataUrl,
      title: r.title,
      date: r.date.toISOString(),
      volume: r.volume,
      durationMin: r.durationMin,
      sets: r.sets,
    }));
  } catch (error) {
    console.error("Erro ao carregar fotos do treino:", error);
    return [];
  }
}

export async function deleteWorkoutPhoto(id: string): Promise<ActionResponse> {
  try {
    const userId = await requireUserId();
    await prisma.workoutPhoto.deleteMany({ where: { id, userId } });
    return { success: true, message: "Foto removida." };
  } catch (error) {
    console.error("Erro ao remover foto:", error);
    return { success: false, message: "Falha ao remover a foto." };
  }
}
