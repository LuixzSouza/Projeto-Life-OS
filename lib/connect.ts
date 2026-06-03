import { prisma } from "./prisma";
import { getCurrentUserId } from "./auth";

/**
 * Helpers do "tecido conectivo" (Módulo 12 do schema): Tags, EntityLink e
 * Attachment. Referência polimórfica = `entityType` + `entityId`.
 *
 * `entityType` canônico (ver docs/DATABASE.md): task, note, transaction, account,
 * project, event, friend, client, invoice, media, link, flashcardDeck,
 * studySubject, goal, wardrobeItem, workout, meal.
 */

// ----------------------------- TAGS ---------------------------------------

/** Garante uma tag (por nome) e a vincula a uma entidade. Idempotente. */
export async function tagEntity(entityType: string, entityId: string, tagName: string, color?: string) {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const name = tagName.trim();
  if (!name) return null;

  const tag = await prisma.tag.upsert({
    where: { userId_name: { userId, name } },
    update: {},
    create: { userId, name, color: color ?? "#6366f1" },
  });

  return prisma.taggable.upsert({
    where: { tagId_entityType_entityId: { tagId: tag.id, entityType, entityId } },
    update: {},
    create: { tagId: tag.id, entityType, entityId, userId },
  });
}

export async function untagEntity(entityType: string, entityId: string, tagId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await prisma.taggable.deleteMany({ where: { tagId, entityType, entityId, userId } });
}

/** Tags de uma entidade. */
export async function getEntityTags(entityType: string, entityId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const links = await prisma.taggable.findMany({
    where: { userId, entityType, entityId },
    include: { tag: true },
  });
  return links.map((l) => l.tag);
}

/** IDs de entidades de um tipo que têm a tag (filtro cross-módulo). */
export async function getEntitiesByTag(tagId: string, entityType: string): Promise<string[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const links = await prisma.taggable.findMany({
    where: { userId, tagId, entityType },
    select: { entityId: true },
  });
  return links.map((l) => l.entityId);
}

// --------------------------- ENTITY LINKS ----------------------------------

/** Liga duas entidades quaisquer (grafo flexível). Idempotente. */
export async function linkEntities(
  from: { type: string; id: string },
  to: { type: string; id: string },
  kind = "RELATED"
) {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return prisma.entityLink.upsert({
    where: {
      fromType_fromId_toType_toId_kind: {
        fromType: from.type, fromId: from.id, toType: to.type, toId: to.id, kind,
      },
    },
    update: {},
    create: { userId, fromType: from.type, fromId: from.id, toType: to.type, toId: to.id, kind },
  });
}

/** Entidades ligadas a uma dada entidade (em qualquer direção). */
export async function getLinkedEntities(type: string, id: string) {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return prisma.entityLink.findMany({
    where: { userId, OR: [{ fromType: type, fromId: id }, { toType: type, toId: id }] },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------- ATTACHMENTS ----------------------------------

/** Anexa um arquivo/imagem (URL ou base64) a uma entidade. */
export async function attach(
  entityType: string,
  entityId: string,
  data: { url?: string; blob?: string; name?: string; mimeType?: string; sizeBytes?: number; kind?: string }
) {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return prisma.attachment.create({
    data: {
      userId, entityType, entityId,
      kind: data.kind ?? "IMAGE",
      url: data.url ?? null, blob: data.blob ?? null,
      name: data.name ?? null, mimeType: data.mimeType ?? null, sizeBytes: data.sizeBytes ?? null,
    },
  });
}

export async function getAttachments(entityType: string, entityId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return prisma.attachment.findMany({
    where: { userId, entityType, entityId },
    orderBy: { createdAt: "desc" },
  });
}

export async function removeAttachment(id: string) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await prisma.attachment.deleteMany({ where: { id, userId } });
}
