"use server";

// Tetos de gasto por categoria — primeira UI do model Category (dormente no
// schema desde a Fase B). O orçamento casa com a categoria-texto usada nas
// transações: a linha Category é criada sob demanda só para guardar o teto.

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

interface BudgetActionResponse {
  success: boolean;
  message: string;
}

/**
 * Define (ou atualiza) o teto mensal de uma categoria de despesa.
 * `value: null` remove o teto (a linha Category permanece — pode ter FKs).
 */
export async function setCategoryBudget(name: string, value: number | null): Promise<BudgetActionResponse> {
  try {
    const userId = await requireUserId();
    const clean = name.trim().slice(0, 60);
    if (!clean) return { success: false, message: "Informe a categoria." };
    if (value !== null && (!Number.isFinite(value) || value <= 0)) {
      return { success: false, message: "O teto precisa ser um valor maior que zero." };
    }

    const existing = await prisma.category.findFirst({
      where: { userId, name: clean, type: "EXPENSE" },
      select: { id: true },
    });

    if (existing) {
      await prisma.category.updateMany({
        where: { id: existing.id, userId },
        data: { monthlyBudget: value },
      });
    } else if (value !== null) {
      await prisma.category.create({
        data: { userId, name: clean, type: "EXPENSE", monthlyBudget: value },
      });
    }

    revalidatePath("/finance");
    return {
      success: true,
      message: value === null ? `Teto de "${clean}" removido.` : `Teto de "${clean}" salvo.`,
    };
  } catch (error) {
    console.error("Erro ao salvar teto de categoria:", error);
    return { success: false, message: "Não foi possível salvar o teto." };
  }
}
