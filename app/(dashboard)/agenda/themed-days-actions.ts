"use server";

// Server actions dos Dias Temáticos (Fase 1). Um tema por (userId, weekday).
// Tudo isolado por userId, com upsert idempotente na chave única.

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId, getCurrentUserId } from "@/lib/auth";

export interface ThemedDayData {
  id: string;
  weekday: number;
  name: string;
  color: string;
  icon: string | null;
  focus: string | null;
}

export async function getThemedDays(): Promise<ThemedDayData[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const rows = await prisma.themedDay.findMany({
    where: { userId },
    orderBy: { weekday: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    weekday: r.weekday,
    name: r.name,
    color: r.color,
    icon: r.icon,
    focus: r.focus,
  }));
}

export interface UpsertThemedDayInput {
  weekday: number;
  name: string;
  color?: string;
  icon?: string | null;
  focus?: string | null;
}

export async function upsertThemedDay(
  input: UpsertThemedDayInput
): Promise<{ success: boolean; message?: string }> {
  const userId = await requireUserId();

  const weekday = Math.trunc(input.weekday);
  if (weekday < 0 || weekday > 6) return { success: false, message: "Dia inválido." };

  const name = input.name?.trim();
  if (!name) return { success: false, message: "Dê um nome ao tema." };

  const color = input.color?.trim() || "#6366f1";
  const icon = input.icon?.trim() || null;
  const focus = input.focus?.trim() || null;

  // upsert na chave única (userId, weekday) — cria ou atualiza o tema do dia.
  await prisma.themedDay.upsert({
    where: { userId_weekday: { userId, weekday } },
    create: { userId, weekday, name, color, icon, focus },
    update: { name, color, icon, focus },
  });

  revalidatePath("/agenda");
  return { success: true };
}

export async function deleteThemedDay(weekday: number): Promise<{ success: boolean }> {
  const userId = await requireUserId();
  await prisma.themedDay.deleteMany({ where: { userId, weekday: Math.trunc(weekday) } });
  revalidatePath("/agenda");
  return { success: true };
}
