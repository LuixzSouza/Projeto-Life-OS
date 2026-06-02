"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { PortfolioData, INITIAL_PORTFOLIO } from "@/types/portfolio";

// =========================================================
// PORTFÓLIO / CURRÍCULO (Builder Engine)
// Persistência no SQLite (1 portfólio por usuário) substituindo o localStorage.
// =========================================================

export async function getPortfolio(): Promise<PortfolioData> {
  const userId = await requireUserId();

  const record = await prisma.portfolio.findUnique({ where: { userId } });
  if (!record) return INITIAL_PORTFOLIO;

  try {
    // Mescla com o INITIAL para tolerar versões antigas sem campos novos (ex: languages).
    const parsed = JSON.parse(record.data) as Partial<PortfolioData>;
    return { ...INITIAL_PORTFOLIO, ...parsed };
  } catch {
    return INITIAL_PORTFOLIO;
  }
}

export async function savePortfolio(data: PortfolioData): Promise<{ success: boolean }> {
  const userId = await requireUserId();

  const payload = JSON.stringify({
    ...data,
    meta: { ...data.meta, lastUpdated: new Date().toISOString() },
  });

  await prisma.portfolio.upsert({
    where: { userId },
    update: { data: payload },
    create: { userId, data: payload },
  });

  revalidatePath("/jobs");
  return { success: true };
}
