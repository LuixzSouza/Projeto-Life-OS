"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { ActionResponse } from "./types";
import {
  coerceGoal,
  parsePlanDivisions,
  stringifyPlanContent,
  type PlanDivision,
  type PlanGoal,
  type WorkoutPlan,
} from "@/components/health/gym/session/plan-types";

interface SavePlanInput {
  id?: string;            // ausente → cria; presente → atualiza (se for do usuário)
  name: string;
  goal: PlanGoal;
  divisions: PlanDivision[];
}

// Linha do banco → ficha do cliente (parse defensivo do JSON `content`).
function serialize(row: { id: string; name: string; goal: string; content: string; createdAt: Date; updatedAt: Date }): WorkoutPlan {
  return {
    id: row.id,
    name: row.name,
    goal: coerceGoal(row.goal),
    divisions: parsePlanDivisions(row.content),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listWorkoutPlans(): Promise<WorkoutPlan[]> {
  try {
    const userId = await requireUserId();
    const rows = await prisma.workoutPlan.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(serialize);
  } catch (error) {
    console.error("Erro ao listar fichas:", error);
    return [];
  }
}

export async function saveWorkoutPlan(input: SavePlanInput): Promise<ActionResponse & { plan?: WorkoutPlan }> {
  try {
    const userId = await requireUserId();
    const name = input.name?.trim() || "Nova ficha";
    const goal = coerceGoal(input.goal);
    // Sanitiza re-parseando (limpa metas fora do range, ids etc.).
    const divisions = parsePlanDivisions(stringifyPlanContent(input.divisions));
    const content = stringifyPlanContent(divisions);

    // Atualiza só se a ficha existir E for do usuário (evita escrita cruzada).
    if (input.id) {
      const updated = await prisma.workoutPlan.updateMany({
        where: { id: input.id, userId },
        data: { name, goal, content },
      });
      if (updated.count > 0) {
        const row = await prisma.workoutPlan.findFirst({ where: { id: input.id, userId } });
        revalidatePath("/health/gym");
        return { success: true, message: "Ficha atualizada!", plan: row ? serialize(row) : undefined };
      }
      // Não encontrada como do usuário → cai para criar uma nova.
    }

    const created = await prisma.workoutPlan.create({
      data: { name, goal, content, userId },
    });
    revalidatePath("/health/gym");
    return { success: true, message: "Ficha criada!", plan: serialize(created) };
  } catch (error) {
    console.error("Erro ao salvar ficha:", error);
    return { success: false, message: "Falha ao salvar a ficha." };
  }
}

export async function deleteWorkoutPlan(id: string): Promise<ActionResponse> {
  try {
    const userId = await requireUserId();
    const res = await prisma.workoutPlan.deleteMany({ where: { id, userId } });
    if (res.count === 0) return { success: false, message: "Ficha não encontrada." };
    revalidatePath("/health/gym");
    return { success: true, message: "Ficha removida." };
  } catch (error) {
    console.error("Erro ao remover ficha:", error);
    return { success: false, message: "Falha ao remover a ficha." };
  }
}
