"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { ActionResponse } from "./types";

// Tênis + quilometragem somada do histórico de corrida (Workout.shoeName).
export interface ShoeWithMileage {
  id: string | null;        // null = aparece só no histórico (ainda não cadastrado)
  name: string;
  maxDistance: number | null;
  retired: boolean;
  totalKm: number;
  runCount: number;
}

const RUN_TYPES = ["RUN", "RUNNING"];

/**
 * Lista os tênis do usuário com a quilometragem acumulada. Mescla o cadastro
 * (`Shoe`, que guarda a meta de troca) com a soma real de km das corridas
 * agrupada por `shoeName`. Tênis que aparecem no histórico mas não foram
 * cadastrados entram com `id: null` (dá pra cadastrar e definir a meta depois).
 */
export async function listShoesWithMileage(): Promise<ShoeWithMileage[]> {
  try {
    const userId = await requireUserId();
    const [shoes, runs] = await Promise.all([
      prisma.shoe.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.workout.findMany({
        where: { userId, type: { in: RUN_TYPES }, shoeName: { not: null } },
        select: { shoeName: true, distance: true },
      }),
    ]);

    // Agrega km e nº de corridas por nome de tênis.
    const agg = new Map<string, { km: number; count: number }>();
    for (const r of runs) {
      const name = (r.shoeName ?? "").trim();
      if (!name) continue;
      const e = agg.get(name) ?? { km: 0, count: 0 };
      e.km += r.distance ?? 0;
      e.count += 1;
      agg.set(name, e);
    }

    const result: ShoeWithMileage[] = [];
    const seen = new Set<string>();
    for (const s of shoes) {
      const a = agg.get(s.name) ?? { km: 0, count: 0 };
      seen.add(s.name);
      result.push({
        id: s.id,
        name: s.name,
        maxDistance: s.maxDistance,
        retired: s.retired,
        totalKm: Math.round(a.km * 10) / 10,
        runCount: a.count,
      });
    }
    // Tênis presentes em corridas mas sem cadastro (nada fica escondido).
    for (const [name, a] of agg) {
      if (seen.has(name)) continue;
      result.push({ id: null, name, maxDistance: null, retired: false, totalKm: Math.round(a.km * 10) / 10, runCount: a.count });
    }

    // Ativos primeiro, depois por km desc.
    return result.sort((a, b) => Number(a.retired) - Number(b.retired) || b.totalKm - a.totalKm);
  } catch (error) {
    console.error("Erro ao listar tênis:", error);
    return [];
  }
}

function parseMax(v: FormDataEntryValue | null): number | null {
  if (v == null || v.toString().trim() === "") return null;
  const n = parseFloat(v.toString().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function createShoe(formData: FormData): Promise<ActionResponse> {
  try {
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { success: false, message: "Dê um nome ao tênis." };
    const maxDistance = parseMax(formData.get("maxDistance"));

    const userId = await requireUserId();

    // (userId, name) é único — evita cadastro duplicado do mesmo tênis.
    const existing = await prisma.shoe.findFirst({ where: { userId, name } });
    if (existing) {
      await prisma.shoe.updateMany({ where: { id: existing.id, userId }, data: { maxDistance, retired: false } });
      revalidatePath("/health/running");
      return { success: true, message: "Tênis atualizado." };
    }

    await prisma.shoe.create({ data: { userId, name, maxDistance } });
    revalidatePath("/health/running");
    return { success: true, message: "Tênis cadastrado! 👟" };
  } catch (error) {
    console.error("Erro ao cadastrar tênis:", error);
    return { success: false, message: "Não foi possível cadastrar o tênis." };
  }
}

export async function updateShoe(formData: FormData): Promise<ActionResponse> {
  try {
    const id = formData.get("id") as string;
    if (!id) return { success: false, message: "Tênis inválido." };
    const name = (formData.get("name") as string)?.trim();
    const maxDistance = parseMax(formData.get("maxDistance"));
    const retired = formData.get("retired") === "true";

    const userId = await requireUserId();
    await prisma.shoe.updateMany({
      where: { id, userId },
      data: { ...(name ? { name } : {}), maxDistance, retired },
    });
    revalidatePath("/health/running");
    return { success: true, message: "Tênis atualizado." };
  } catch (error) {
    console.error("Erro ao atualizar tênis:", error);
    return { success: false, message: "Não foi possível atualizar o tênis." };
  }
}

export async function deleteShoe(id: string): Promise<ActionResponse> {
  try {
    const userId = await requireUserId();
    await prisma.shoe.deleteMany({ where: { id, userId } });
    revalidatePath("/health/running");
    return { success: true, message: "Tênis removido do cadastro." };
  } catch (error) {
    console.error("Erro ao remover tênis:", error);
    return { success: false, message: "Não foi possível remover o tênis." };
  }
}
