"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";

export interface TrashItem {
  id: string;
  type: string; // "task" | "link" | "wishlist" | "media"
  title: string;
  deletedAt: string;
}

// Caminho a revalidar quando um item de cada tipo muda.
const REVALIDATE: Record<string, string> = {
  task: "/projects",
  link: "/links",
  wishlist: "/finance",
  media: "/entertainment",
};

/** Lista itens na lixeira (soft-deleted) de todos os modelos suportados. */
export async function getTrash(): Promise<TrashItem[]> {
  const userId = await requireUserId();
  const where = { userId, deletedAt: { not: null } };

  const [tasks, links, wishes, media] = await Promise.all([
    prisma.task.findMany({ where, select: { id: true, title: true, deletedAt: true } }),
    prisma.savedLink.findMany({ where, select: { id: true, title: true, deletedAt: true } }),
    prisma.wishlistItem.findMany({ where, select: { id: true, name: true, deletedAt: true } }),
    prisma.mediaItem.findMany({ where, select: { id: true, title: true, deletedAt: true } }),
  ]);

  const items: TrashItem[] = [
    ...tasks.map((t) => ({ id: t.id, type: "task", title: t.title, deletedAt: t.deletedAt!.toISOString() })),
    ...links.map((l) => ({ id: l.id, type: "link", title: l.title, deletedAt: l.deletedAt!.toISOString() })),
    ...wishes.map((w) => ({ id: w.id, type: "wishlist", title: w.name, deletedAt: w.deletedAt!.toISOString() })),
    ...media.map((m) => ({ id: m.id, type: "media", title: m.title, deletedAt: m.deletedAt!.toISOString() })),
  ];
  return items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
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
  ]);
  revalidatePath("/trash");
  return getTrash();
}
