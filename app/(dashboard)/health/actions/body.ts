"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { ActionResponse } from "./types";

// =========================================================
// MEDIDAS CORPORAIS COMPLETAS (SNAPSHOT)
// =========================================================

export async function saveBodyMeasurements(formData: FormData): Promise<ActionResponse> {
  try {
    const getFloat = (key: string) => {
      const val = formData.get(key);
      return val && val.toString().trim() !== "" ? parseFloat(val.toString()) : null;
    };

    // Dados Obrigatórios
    const weight = getFloat("weight");
    const height = getFloat("height");
    const genderRaw = formData.get("gender") as string | null;

    // --- Captura a data de nascimento ---
    const birthDateString = formData.get("birthDate") as string | null;
    const birthDate = birthDateString ? new Date(`${birthDateString}T12:00:00Z`) : null;

    if (!weight || !height) {
      return { success: false, message: "Peso e Altura são obrigatórios." };
    }

    const userId = await requireUserId();

    // Cada save cria um NOVO snapshot. Para não perder dados quando o
    // formulário envia só alguns campos (ex.: edição rápida do overview),
    // herdamos os valores ausentes do último registro (carry-forward).
    const prev = await prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
    });

    // Usa o valor do formulário se presente; senão, mantém o anterior.
    const pick = (key: string, prevVal: number | null) => {
      const v = getFloat(key);
      return v !== null ? v : prevVal;
    };

    await prisma.bodyMeasurement.create({
      data: {
        weight,
        height,
        gender: genderRaw || prev?.gender || "MALE",
        activity: getFloat("activityFactor") ?? prev?.activity ?? 1.2,
        birthDate: birthDate ?? prev?.birthDate ?? null,
        userId,

        // Medidas (herdam do snapshot anterior se não vierem no formulário)
        neck: pick("neck", prev?.neck ?? null),
        waist: pick("waist", prev?.waist ?? null),
        hip: pick("hip", prev?.hip ?? null),
        shoulders: pick("shoulders", prev?.shoulders ?? null),
        chest: pick("chest", prev?.chest ?? null),
        armLeft: pick("armLeft", prev?.armLeft ?? null),
        armRight: pick("armRight", prev?.armRight ?? null),
        forearmLeft: pick("forearmLeft", prev?.forearmLeft ?? null),
        forearmRight: pick("forearmRight", prev?.forearmRight ?? null),
        thighLeft: pick("thighLeft", prev?.thighLeft ?? null),
        thighRight: pick("thighRight", prev?.thighRight ?? null),
        calfLeft: pick("calfLeft", prev?.calfLeft ?? null),
        calfRight: pick("calfRight", prev?.calfRight ?? null),
      }
    });

    // Backup para gráficos simples
    await prisma.healthMetric.create({
      data: { type: "WEIGHT", value: weight, date: new Date(), userId }
    });

    revalidatePath("/health");
    return { success: true, message: "Medidas salvas com sucesso!" };

  } catch (error) {
    console.error("Erro ao salvar medidas:", error);
    return { success: false, message: "Erro ao salvar no banco de dados." };
  }
}

// =========================================================
// BACKFILL DE SNAPSHOTS DEGENERADOS
// =========================================================
// Pesos anotados pela IA em versões antigas criavam snapshots com height=0 e
// gender "N/A". A página já coalesce na leitura, mas o dado cru fica errado no
// banco (e em exports/gráficos de % gordura). Este backfill herda altura,
// gênero e nascimento do snapshot real mais próximo (anterior; se não houver,
// o seguinte). Peso e medidas nunca são alterados.

function isRealGender(g: string): boolean {
  return g === "MALE" || g === "FEMALE";
}

export async function backfillBodySnapshots(): Promise<ActionResponse & { fixed?: number }> {
  try {
    const userId = await requireUserId();
    const rows = await prisma.bodyMeasurement.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      select: { id: true, height: true, gender: true, birthDate: true },
    });

    interface SnapshotPatch {
      height?: number;
      gender?: string;
      birthDate?: Date;
    }
    const patches = new Map<string, SnapshotPatch>();

    // Passada para frente: herda do último snapshot real anterior.
    let lastHeight: number | null = null;
    let lastGender: string | null = null;
    let lastBirth: Date | null = null;
    for (const r of rows) {
      const patch: SnapshotPatch = {};
      if (r.height <= 0 && lastHeight !== null) patch.height = lastHeight;
      if (!isRealGender(r.gender) && lastGender !== null) patch.gender = lastGender;
      if (r.birthDate === null && lastBirth !== null && (r.height <= 0 || !isRealGender(r.gender))) {
        patch.birthDate = lastBirth;
      }
      if (Object.keys(patch).length > 0) patches.set(r.id, patch);

      if (r.height > 0) lastHeight = r.height;
      if (isRealGender(r.gender)) lastGender = r.gender;
      if (r.birthDate !== null) lastBirth = r.birthDate;
    }

    // Passada para trás: degenerados ANTES do primeiro real herdam do seguinte.
    let nextHeight: number | null = null;
    let nextGender: string | null = null;
    let nextBirth: Date | null = null;
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const patch = patches.get(r.id) ?? {};
      let touched = false;
      if (r.height <= 0 && patch.height === undefined && nextHeight !== null) { patch.height = nextHeight; touched = true; }
      if (!isRealGender(r.gender) && patch.gender === undefined && nextGender !== null) { patch.gender = nextGender; touched = true; }
      if (r.birthDate === null && patch.birthDate === undefined && nextBirth !== null && (r.height <= 0 || !isRealGender(r.gender))) {
        patch.birthDate = nextBirth; touched = true;
      }
      if (touched) patches.set(r.id, patch);

      if (r.height > 0) nextHeight = r.height;
      if (isRealGender(r.gender)) nextGender = r.gender;
      if (r.birthDate !== null) nextBirth = r.birthDate;
    }

    let fixed = 0;
    for (const [id, patch] of patches) {
      const r = await prisma.bodyMeasurement.updateMany({ where: { id, userId }, data: patch });
      fixed += r.count;
    }

    if (fixed > 0) {
      revalidatePath("/health");
      revalidatePath("/health/body");
    }
    return {
      success: true,
      message: fixed > 0
        ? `${fixed} registro${fixed > 1 ? "s" : ""} corrigido${fixed > 1 ? "s" : ""} com os dados dos vizinhos. ✅`
        : "Nenhum registro precisava de correção.",
      fixed,
    };
  } catch (error) {
    console.error("Erro no backfill de medidas corporais:", error);
    return { success: false, message: "Erro ao corrigir registros antigos." };
  }
}
