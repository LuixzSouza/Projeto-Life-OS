"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";

export interface TrashItem {
  id: string;
  type: string; // task | link | wishlist | media | event | friend | client | wardrobeItem | transaction
  title: string;
  deletedAt: string;
}

// Caminho a revalidar quando um item de cada tipo muda.
const REVALIDATE: Record<string, string> = {
  task: "/projects",
  link: "/links",
  wishlist: "/finance",
  media: "/entertainment",
  event: "/agenda",
  friend: "/social",
  client: "/business",
  wardrobeItem: "/wardrobe",
  transaction: "/finance",
  project: "/projects",
  note: "/notes",
  goal: "/goals",
};

/** Lista itens na lixeira (soft-deleted) de todos os modelos suportados. */
export async function getTrash(): Promise<TrashItem[]> {
  const userId = await requireUserId();
  const where = { userId, deletedAt: { not: null } };

  const [tasks, links, wishes, media, events, friends, clients, wardrobe, transactions, projects, notes, goals] = await Promise.all([
    prisma.task.findMany({ where, select: { id: true, title: true, deletedAt: true } }),
    prisma.savedLink.findMany({ where, select: { id: true, title: true, deletedAt: true } }),
    prisma.wishlistItem.findMany({ where, select: { id: true, name: true, deletedAt: true } }),
    prisma.mediaItem.findMany({ where, select: { id: true, title: true, deletedAt: true } }),
    prisma.event.findMany({ where, select: { id: true, title: true, deletedAt: true } }),
    prisma.friend.findMany({ where, select: { id: true, name: true, deletedAt: true } }),
    prisma.client.findMany({ where, select: { id: true, name: true, deletedAt: true } }),
    prisma.wardrobeItem.findMany({ where, select: { id: true, name: true, deletedAt: true } }),
    prisma.transaction.findMany({ where, select: { id: true, description: true, deletedAt: true } }),
    prisma.project.findMany({ where, select: { id: true, title: true, deletedAt: true } }),
    prisma.studyNote.findMany({ where, select: { id: true, title: true, deletedAt: true } }),
    prisma.learningGoal.findMany({ where, select: { id: true, title: true, deletedAt: true } }),
  ]);

  const items: TrashItem[] = [
    ...tasks.map((t) => ({ id: t.id, type: "task", title: t.title, deletedAt: t.deletedAt!.toISOString() })),
    ...links.map((l) => ({ id: l.id, type: "link", title: l.title, deletedAt: l.deletedAt!.toISOString() })),
    ...wishes.map((w) => ({ id: w.id, type: "wishlist", title: w.name, deletedAt: w.deletedAt!.toISOString() })),
    ...media.map((m) => ({ id: m.id, type: "media", title: m.title, deletedAt: m.deletedAt!.toISOString() })),
    ...events.map((e) => ({ id: e.id, type: "event", title: e.title, deletedAt: e.deletedAt!.toISOString() })),
    ...friends.map((f) => ({ id: f.id, type: "friend", title: f.name, deletedAt: f.deletedAt!.toISOString() })),
    ...clients.map((c) => ({ id: c.id, type: "client", title: c.name, deletedAt: c.deletedAt!.toISOString() })),
    ...wardrobe.map((w) => ({ id: w.id, type: "wardrobeItem", title: w.name, deletedAt: w.deletedAt!.toISOString() })),
    ...transactions.map((t) => ({ id: t.id, type: "transaction", title: t.description, deletedAt: t.deletedAt!.toISOString() })),
    ...projects.map((p) => ({ id: p.id, type: "project", title: p.title, deletedAt: p.deletedAt!.toISOString() })),
    ...notes.map((n) => ({ id: n.id, type: "note", title: n.title, deletedAt: n.deletedAt!.toISOString() })),
    ...goals.map((g) => ({ id: g.id, type: "goal", title: g.title, deletedAt: g.deletedAt!.toISOString() })),
  ];
  return items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

/**
 * Restaura uma Transação: reaplica o impacto no saldo da conta (espelho exato do
 * que o soft-delete reverteu) e limpa deletedAt.
 * ⚠️ Modo réplica: leituras FORA da $transaction (na transação iriam ao primário,
 * onde datas INTEGER estouram a conversão do Prisma); escritas em lote atômico.
 */
async function restoreTransaction(userId: string, id: string) {
  const t = await prisma.transaction.findFirst({
    where: { id, userId, deletedAt: { not: null } },
    select: { id: true, accountId: true, type: true, amount: true },
  });
  if (!t) return;

  const ops = [];
  const account = await prisma.account.findFirst({
    where: { id: t.accountId, userId },
    select: { id: true, isConnected: true, balance: true },
  });
  if (account && !account.isConnected) {
    ops.push(prisma.account.update({
      where: { id: account.id },
      data: {
        balance: t.type === "INCOME"
          ? { increment: Number(t.amount) }
          : { decrement: Number(t.amount) },
      },
      select: { id: true },
    }));
  }
  ops.push(prisma.transaction.updateMany({ where: { id, userId }, data: { deletedAt: null } }));
  await prisma.$transaction(ops);
}

/** Restaura um item (limpa deletedAt). */
export async function restoreItem(type: string, id: string): Promise<TrashItem[]> {
  const userId = await requireUserId();
  const where = { id, userId };
  switch (type) {
    case "task": await prisma.task.updateMany({ where, data: { deletedAt: null } }); break;
    case "link": await prisma.savedLink.updateMany({ where, data: { deletedAt: null } }); break;
    case "wishlist": await prisma.wishlistItem.updateMany({ where, data: { deletedAt: null } }); break;
    case "media": await prisma.mediaItem.updateMany({ where, data: { deletedAt: null } }); break;
    case "event": await prisma.event.updateMany({ where, data: { deletedAt: null } }); break;
    case "friend": await prisma.friend.updateMany({ where, data: { deletedAt: null } }); break;
    case "client": await prisma.client.updateMany({ where, data: { deletedAt: null } }); break;
    case "wardrobeItem": await prisma.wardrobeItem.updateMany({ where, data: { deletedAt: null } }); break;
    case "transaction": await restoreTransaction(userId, id); break;
    case "project": await prisma.project.updateMany({ where, data: { deletedAt: null } }); break;
    case "note": await prisma.studyNote.updateMany({ where, data: { deletedAt: null } }); break;
    case "goal": await prisma.learningGoal.updateMany({ where, data: { deletedAt: null } }); break;
  }
  await logActivity({ action: "RESTORE", module: type, entityType: type, entityId: id, summary: "Restaurou um item da lixeira" });
  if (REVALIDATE[type]) revalidatePath(REVALIDATE[type]);
  revalidatePath("/trash");
  return getTrash();
}

/** Exclui em definitivo (hard delete) — só itens que já estão na lixeira. */
export async function purgeItem(type: string, id: string): Promise<TrashItem[]> {
  const userId = await requireUserId();
  const where = { id, userId, deletedAt: { not: null } };
  switch (type) {
    case "task": await prisma.task.deleteMany({ where }); break;
    case "link": await prisma.savedLink.deleteMany({ where }); break;
    case "wishlist": await prisma.wishlistItem.deleteMany({ where }); break;
    case "media": await prisma.mediaItem.deleteMany({ where }); break;
    case "event": await prisma.event.deleteMany({ where }); break;
    case "friend": await prisma.friend.deleteMany({ where }); break;
    case "client": await prisma.client.deleteMany({ where }); break; // cascateia billings/invoices
    case "wardrobeItem": await prisma.wardrobeItem.deleteMany({ where }); break;
    case "transaction": await prisma.transaction.deleteMany({ where }); break; // saldo já foi revertido no soft-delete
    case "project": await prisma.project.deleteMany({ where }); break; // tarefas/eventos viram SetNull (vão p/ Inbox)
    case "note": await prisma.studyNote.deleteMany({ where }); break;
    case "goal": await prisma.learningGoal.deleteMany({ where }); break; // cascateia LearningTask
  }
  revalidatePath("/trash");
  return getTrash();
}

/** Esvazia a lixeira (hard delete de tudo que está soft-deleted). */
export async function emptyTrash(): Promise<TrashItem[]> {
  const userId = await requireUserId();
  const where = { userId, deletedAt: { not: null } };
  await Promise.all([
    prisma.task.deleteMany({ where }),
    prisma.savedLink.deleteMany({ where }),
    prisma.wishlistItem.deleteMany({ where }),
    prisma.mediaItem.deleteMany({ where }),
    prisma.event.deleteMany({ where }),
    prisma.friend.deleteMany({ where }),
    prisma.client.deleteMany({ where }),
    prisma.wardrobeItem.deleteMany({ where }),
    prisma.transaction.deleteMany({ where }), // saldo já revertido no soft-delete
    prisma.project.deleteMany({ where }), // tarefas/eventos viram SetNull (vão p/ Inbox)
    prisma.studyNote.deleteMany({ where }),
    prisma.learningGoal.deleteMany({ where }), // cascateia LearningTask
  ]);
  revalidatePath("/trash");
  return getTrash();
}
