"use server";

// Memórias da IA — privacidade em 1º lugar: o usuário vê e apaga tudo o que a
// IA lembra dele (tabela AiMemory), direto nas Configurações.

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface AiMemoryItem {
  id: string;
  content: string;
  createdAt: Date;
}

const MEMORY_MAX = 50;
const MEMORY_MAX_LEN = 280;

export async function listAiMemories(): Promise<AiMemoryItem[]> {
  const userId = await requireUserId();
  return prisma.aiMemory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, content: true, createdAt: true },
  });
}

export async function addAiMemory(content: string): Promise<{ success: boolean; error?: string; memory?: AiMemoryItem }> {
  const userId = await requireUserId();
  const clean = content.trim().replace(/\s+/g, " ").slice(0, MEMORY_MAX_LEN);
  if (!clean) return { success: false, error: "Escreva o fato a lembrar." };

  const count = await prisma.aiMemory.count({ where: { userId } });
  if (count >= MEMORY_MAX) return { success: false, error: `Limite de ${MEMORY_MAX} memórias atingido.` };

  const m = await prisma.aiMemory.create({
    data: { content: clean, userId },
    select: { id: true, content: true, createdAt: true },
  });
  revalidatePath("/settings");
  return { success: true, memory: m };
}

export async function deleteAiMemory(id: string): Promise<{ success: boolean }> {
  const userId = await requireUserId();
  const r = await prisma.aiMemory.deleteMany({ where: { id, userId } });
  revalidatePath("/settings");
  return { success: r.count > 0 };
}

export async function clearAiMemories(): Promise<{ success: boolean; removed: number }> {
  const userId = await requireUserId();
  const r = await prisma.aiMemory.deleteMany({ where: { userId } });
  revalidatePath("/settings");
  return { success: true, removed: r.count };
}
