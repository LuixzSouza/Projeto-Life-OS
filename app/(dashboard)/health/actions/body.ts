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
