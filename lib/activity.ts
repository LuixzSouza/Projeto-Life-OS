import { prisma } from "./prisma";
import { getCurrentUserId } from "./auth";

/**
 * Registro de atividade (auditoria / linha do tempo) — escreve no ActivityLog.
 * É best-effort: NUNCA lança (não pode derrubar a mutação que o chamou).
 *
 * Ex.: await logActivity({ action: "CREATE", module: "tasks",
 *        entityType: "task", entityId: t.id, summary: `Criou "${t.title}"` })
 */
export async function logActivity(input: {
  action: string; // CREATE | UPDATE | DELETE | COMPLETE | ...
  module: string; // finance | tasks | studies | ...
  summary?: string;
  entityType?: string;
  entityId?: string;
  meta?: unknown; // serializado em JSON
}): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await prisma.activityLog.create({
      data: {
        userId,
        action: input.action,
        module: input.module,
        summary: input.summary ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        meta: input.meta != null ? JSON.stringify(input.meta) : null,
      },
    });
  } catch (e) {
    console.error("[activity] falha ao registrar:", e);
  }
}

export interface ClientActivity {
  id: string;
  action: string;
  module: string;
  summary: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

export async function getRecentActivity(limit = 30): Promise<ClientActivity[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const rows = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((a) => ({
    id: a.id,
    action: a.action,
    module: a.module,
    summary: a.summary,
    entityType: a.entityType,
    entityId: a.entityId,
    createdAt: a.createdAt.toISOString(),
  }));
}
