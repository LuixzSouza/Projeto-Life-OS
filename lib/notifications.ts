import { prisma } from "./prisma";
import { getCurrentUserId } from "./auth";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH";

export interface NotifyInput {
  type: string; // INVOICE_DUE | INVOICE_PAID | EVENT | BIRTHDAY | TASK_DUE | FLASHCARD_REVIEW | SYSTEM
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  priority?: NotificationPriority;
  dueAt?: Date;
}

export interface ClientNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  priority: string;
  dueAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationInbox {
  items: ClientNotification[];
  unreadCount: number;
}

function toClient(n: {
  id: string; type: string; title: string; body: string | null;
  entityType: string | null; entityId: string | null; actionUrl: string | null;
  priority: string; dueAt: Date | null; readAt: Date | null; createdAt: Date;
}): ClientNotification {
  return {
    id: n.id, type: n.type, title: n.title, body: n.body,
    entityType: n.entityType, entityId: n.entityId, actionUrl: n.actionUrl,
    priority: n.priority,
    dueAt: n.dueAt?.toISOString() ?? null,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

/** Cria uma notificação. Retorna null se não houver usuário logado. */
export async function notify(input: NotifyInput) {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return prisma.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      actionUrl: input.actionUrl ?? null,
      priority: input.priority ?? "NORMAL",
      dueAt: input.dueAt ?? null,
    },
  });
}

/**
 * Cria uma notificação SÓ se ainda não existir uma do mesmo (type, entityType,
 * entityId) para o usuário — evita duplicar lembretes a cada geração.
 */
async function notifyOnce(userId: string, input: NotifyInput) {
  const exists = await prisma.notification.findFirst({
    where: { userId, type: input.type, entityType: input.entityType ?? null, entityId: input.entityId ?? null },
    select: { id: true },
  });
  if (exists) return null;
  return prisma.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      actionUrl: input.actionUrl ?? null,
      priority: input.priority ?? "NORMAL",
      dueAt: input.dueAt ?? null,
    },
  });
}

export async function getNotificationInbox(limit = 30): Promise<NotificationInbox> {
  const userId = await getCurrentUserId();
  if (!userId) return { items: [], unreadCount: 0 };
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: [{ readAt: "asc" }, { createdAt: "desc" }], take: limit }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items: items.map(toClient), unreadCount };
}

export async function markRead(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
}

export async function markAllRead(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

/**
 * Deriva notificações a partir dos dados reais (faturas, eventos, aniversários,
 * tarefas atrasadas, flashcards a revisar). Idempotente via notifyOnce.
 */
export async function generateReminders(): Promise<number> {
  const userId = await getCurrentUserId();
  if (!userId) return 0;

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 3600 * 1000);
  const in7d = new Date(now.getTime() + 7 * 864e5);
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  let created = 0;
  const bump = (r: unknown) => { if (r) created++; };

  // 1. Faturas pendentes/atrasadas vencendo em até 7 dias
  const invoices = await prisma.invoice.findMany({
    where: { userId, status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lte: in7d } },
    include: { billing: { include: { client: true } } },
  });
  for (const inv of invoices) {
    const overdue = inv.dueDate < startToday;
    bump(await notifyOnce(userId, {
      type: "INVOICE_DUE",
      title: overdue ? `Fatura atrasada: ${inv.title}` : `Fatura vencendo: ${inv.title}`,
      body: inv.billing?.client?.name ? `Cliente: ${inv.billing.client.name}` : undefined,
      entityType: "invoice", entityId: inv.id, actionUrl: "/business",
      priority: overdue ? "HIGH" : "NORMAL", dueAt: inv.dueDate,
    }));
  }

  // 2. Eventos nas próximas 24h
  const events = await prisma.event.findMany({
    where: { userId, deletedAt: null, startTime: { gte: now, lte: in24h } },
  });
  for (const ev of events) {
    bump(await notifyOnce(userId, {
      type: "EVENT", title: `Em breve: ${ev.title}`,
      body: ev.location ?? undefined, entityType: "event", entityId: ev.id,
      actionUrl: "/agenda", dueAt: ev.startTime,
    }));
  }

  // 3. Aniversários nos próximos 7 dias
  const friends = await prisma.friend.findMany({
    where: { userId, deletedAt: null, birthday: { not: null } },
    select: { id: true, name: true, birthday: true },
  });
  for (const f of friends) {
    if (!f.birthday) continue;
    const b = f.birthday;
    const next = new Date(now.getFullYear(), b.getUTCMonth(), b.getUTCDate());
    if (next < startToday) next.setFullYear(now.getFullYear() + 1);
    if (next <= in7d) {
      bump(await notifyOnce(userId, {
        type: "BIRTHDAY", title: `Aniversário: ${f.name}`,
        body: next.getTime() === startToday.getTime() ? "É hoje! 🎉" : `Em ${Math.ceil((next.getTime() - startToday.getTime()) / 864e5)} dia(s)`,
        entityType: "friend", entityId: `${f.id}:${next.getFullYear()}`,
        actionUrl: "/social", dueAt: next,
      }));
    }
  }

  // 4. Tarefas atrasadas (vencidas e não concluídas)
  const tasks = await prisma.task.findMany({
    where: { userId, isDone: false, deletedAt: null, dueDate: { lt: now } },
    select: { id: true, title: true, dueDate: true },
  });
  for (const t of tasks) {
    bump(await notifyOnce(userId, {
      type: "TASK_DUE", title: `Tarefa atrasada: ${t.title}`,
      entityType: "task", entityId: t.id, actionUrl: "/projects",
      priority: "HIGH", dueAt: t.dueDate ?? undefined,
    }));
  }

  // 5. Flashcards a revisar hoje (resumo único do dia)
  const dueCards = await prisma.flashcard.count({ where: { userId, nextReview: { lte: now } } });
  if (dueCards > 0) {
    const dayKey = startToday.toISOString().slice(0, 10);
    bump(await notifyOnce(userId, {
      type: "FLASHCARD_REVIEW", title: `${dueCards} flashcard(s) para revisar`,
      body: "Mantenha a memória afiada.", entityType: "flashcards", entityId: dayKey,
      actionUrl: "/flashcards",
    }));
  }

  return created;
}
