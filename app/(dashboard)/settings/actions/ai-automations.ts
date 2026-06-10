"use server";

// CRUD das automações agendadas da IA (Configurações → Inteligência).
// O runner vive em lib/ai-automations.ts (pega carona nos lembretes do sino).

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface AiAutomationItem {
  id: string;
  title: string;
  prompt: string;
  schedule: string; // DAILY | WEEKLY:<0-6> | MONTHLY:<1-28>
  hour: number;
  enabled: boolean;
  lastRunAt: Date | null;
}

const MAX_AUTOMATIONS = 10;
const SCHEDULE_RE = /^(DAILY|WEEKLY:[0-6]|MONTHLY:([1-9]|1\d|2[0-8]))$/;

export async function listAiAutomations(): Promise<AiAutomationItem[]> {
  const userId = await requireUserId();
  return prisma.aiAutomation.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, prompt: true, schedule: true, hour: true, enabled: true, lastRunAt: true },
  });
}

export async function createAiAutomation(input: { title: string; prompt: string; schedule: string; hour: number }): Promise<{ success: boolean; error?: string; automation?: AiAutomationItem }> {
  const userId = await requireUserId();
  const title = input.title.trim().slice(0, 60);
  const prompt = input.prompt.trim().slice(0, 500);
  const hour = Math.min(Math.max(Math.floor(input.hour), 0), 23);

  if (!title || !prompt) return { success: false, error: "Título e pedido são obrigatórios." };
  if (!SCHEDULE_RE.test(input.schedule)) return { success: false, error: "Agenda inválida." };

  const count = await prisma.aiAutomation.count({ where: { userId } });
  if (count >= MAX_AUTOMATIONS) return { success: false, error: `Limite de ${MAX_AUTOMATIONS} automações.` };

  const a = await prisma.aiAutomation.create({
    data: { title, prompt, schedule: input.schedule, hour, userId },
    select: { id: true, title: true, prompt: true, schedule: true, hour: true, enabled: true, lastRunAt: true },
  });
  revalidatePath("/settings");
  return { success: true, automation: a };
}

export async function toggleAiAutomation(id: string, enabled: boolean): Promise<{ success: boolean }> {
  const userId = await requireUserId();
  const r = await prisma.aiAutomation.updateMany({ where: { id, userId }, data: { enabled } });
  revalidatePath("/settings");
  return { success: r.count > 0 };
}

export async function deleteAiAutomation(id: string): Promise<{ success: boolean }> {
  const userId = await requireUserId();
  const r = await prisma.aiAutomation.deleteMany({ where: { id, userId } });
  revalidatePath("/settings");
  return { success: r.count > 0 };
}
