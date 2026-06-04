import { prisma } from "./prisma";

/**
 * Busca leve cross-módulo: dado um texto, varre os modelos principais e devolve
 * entidades candidatas (para o seletor "relacionar com…" do EntityLink).
 * Escopado ao usuário; respeita soft-delete onde existe.
 */
export interface EntityHit {
  entityType: string;
  entityId: string;
  title: string;
}

export async function searchEntities(query: string, userId: string, limit = 8): Promise<EntityHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const like = { contains: q }; // SQLite LIKE é case-insensitive p/ ASCII

  const [tasks, projects, events, friends, clients, transactions, notes, goals, media, links, wardrobe] =
    await Promise.all([
      prisma.task.findMany({ where: { userId, deletedAt: null, title: like }, select: { id: true, title: true }, take: 4 }),
      prisma.project.findMany({ where: { userId, deletedAt: null, title: like }, select: { id: true, title: true }, take: 4 }),
      prisma.event.findMany({ where: { userId, deletedAt: null, title: like }, select: { id: true, title: true }, take: 4 }),
      prisma.friend.findMany({ where: { userId, deletedAt: null, name: like }, select: { id: true, name: true }, take: 4 }),
      prisma.client.findMany({ where: { userId, deletedAt: null, name: like }, select: { id: true, name: true }, take: 4 }),
      prisma.transaction.findMany({ where: { userId, deletedAt: null, description: like }, select: { id: true, description: true }, take: 4 }),
      prisma.studyNote.findMany({ where: { userId, deletedAt: null, title: like }, select: { id: true, title: true }, take: 4 }),
      prisma.learningGoal.findMany({ where: { userId, title: like }, select: { id: true, title: true }, take: 4 }),
      prisma.mediaItem.findMany({ where: { userId, deletedAt: null, title: like }, select: { id: true, title: true }, take: 4 }),
      prisma.savedLink.findMany({ where: { userId, deletedAt: null, title: like }, select: { id: true, title: true }, take: 4 }),
      prisma.wardrobeItem.findMany({ where: { userId, deletedAt: null, name: like }, select: { id: true, name: true }, take: 4 }),
    ]);

  const hits: EntityHit[] = [
    ...tasks.map((t) => ({ entityType: "task", entityId: t.id, title: t.title })),
    ...projects.map((t) => ({ entityType: "project", entityId: t.id, title: t.title })),
    ...events.map((t) => ({ entityType: "event", entityId: t.id, title: t.title })),
    ...friends.map((t) => ({ entityType: "friend", entityId: t.id, title: t.name })),
    ...clients.map((t) => ({ entityType: "client", entityId: t.id, title: t.name })),
    ...transactions.map((t) => ({ entityType: "transaction", entityId: t.id, title: t.description })),
    ...notes.map((t) => ({ entityType: "note", entityId: t.id, title: t.title })),
    ...goals.map((t) => ({ entityType: "goal", entityId: t.id, title: t.title })),
    ...media.map((t) => ({ entityType: "media", entityId: t.id, title: t.title })),
    ...links.map((t) => ({ entityType: "link", entityId: t.id, title: t.title })),
    ...wardrobe.map((t) => ({ entityType: "wardrobeItem", entityId: t.id, title: t.name })),
  ];

  // Ranqueia: títulos que começam com a busca primeiro, depois alfabético.
  const lq = q.toLowerCase();
  hits.sort((a, b) => {
    const as = a.title.toLowerCase().startsWith(lq) ? 0 : 1;
    const bs = b.title.toLowerCase().startsWith(lq) ? 0 : 1;
    if (as !== bs) return as - bs;
    return a.title.localeCompare(b.title);
  });

  return hits.slice(0, limit);
}
