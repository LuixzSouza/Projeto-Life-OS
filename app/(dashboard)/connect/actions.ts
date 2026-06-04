"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { tagEntity, untagEntity, attach, getAttachments, removeAttachment, linkEntities, getLinkedEntities } from "@/lib/connect";
import { resolveEntities, type ResolvedEntity } from "@/lib/entity-resolver";
import { searchEntities } from "@/lib/entity-search";

export type { EntityHit } from "@/lib/entity-search";

// ----------------------------- TIPOS (cliente) -----------------------------

export interface TagOverview {
  id: string;
  name: string;
  color: string | null;
  count: number;
}

export interface SimpleTag {
  id: string;
  name: string;
  color: string | null;
}

export interface AttachmentRow {
  id: string;
  name: string | null;
  kind: string;
  url: string | null;
  hasBlob: boolean;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  entity: ResolvedEntity | null;
}

// ------------------------------- TAGS: CENTRAL -----------------------------

/** Todas as tags do usuário com a contagem de itens vinculados (cross-módulo). */
export async function getTagsOverview(): Promise<TagOverview[]> {
  const userId = await requireUserId();
  const tags = await prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { taggables: true } } },
  });
  return tags.map((t) => ({ id: t.id, name: t.name, color: t.color, count: t._count.taggables }));
}

/** Entidades (de qualquer módulo) vinculadas a uma tag, já resolvidas para exibição. */
export async function getTaggedEntities(tagId: string): Promise<ResolvedEntity[]> {
  const userId = await requireUserId();
  const links = await prisma.taggable.findMany({
    where: { userId, tagId },
    select: { entityType: true, entityId: true },
    orderBy: { createdAt: "desc" },
  });
  const resolved = await resolveEntities(links, userId);
  return links
    .map((l) => resolved.get(`${l.entityType}:${l.entityId}`))
    .filter((e): e is ResolvedEntity => Boolean(e));
}

export async function createTagAction(name: string, color?: string): Promise<TagOverview[]> {
  const userId = await requireUserId();
  const clean = name.trim();
  if (clean) {
    await prisma.tag.upsert({
      where: { userId_name: { userId, name: clean } },
      update: color ? { color } : {},
      create: { userId, name: clean, color: color ?? "#6366f1" },
    });
  }
  revalidatePath("/connect");
  return getTagsOverview();
}

export async function updateTagAction(id: string, data: { name?: string; color?: string }): Promise<TagOverview[]> {
  const userId = await requireUserId();
  const patch: { name?: string; color?: string } = {};
  if (data.name && data.name.trim()) patch.name = data.name.trim();
  if (data.color) patch.color = data.color;
  if (Object.keys(patch).length > 0) {
    await prisma.tag.updateMany({ where: { id, userId }, data: patch });
  }
  revalidatePath("/connect");
  return getTagsOverview();
}

export async function deleteTagAction(id: string): Promise<TagOverview[]> {
  const userId = await requireUserId();
  // Cascade no schema (Taggable.tag onDelete: Cascade) limpa os vínculos.
  await prisma.tag.deleteMany({ where: { id, userId } });
  revalidatePath("/connect");
  return getTagsOverview();
}

// -------------------------- TAGS: INLINE (por entidade) --------------------

/** Tags de uma entidade específica (para o editor inline `<EntityTags>`). */
export async function getEntityTagsAction(entityType: string, entityId: string): Promise<SimpleTag[]> {
  const userId = await requireUserId();
  const links = await prisma.taggable.findMany({
    where: { userId, entityType, entityId },
    include: { tag: true },
  });
  return links.map((l) => ({ id: l.tag.id, name: l.tag.name, color: l.tag.color }));
}

/** Sugestões: todas as tags do usuário (para autocomplete no editor inline). */
export async function listUserTags(): Promise<SimpleTag[]> {
  const userId = await requireUserId();
  const tags = await prisma.tag.findMany({ where: { userId }, orderBy: { name: "asc" } });
  return tags.map((t) => ({ id: t.id, name: t.name, color: t.color }));
}

export async function addTagToEntity(entityType: string, entityId: string, name: string): Promise<SimpleTag[]> {
  await tagEntity(entityType, entityId, name);
  revalidatePath("/connect");
  return getEntityTagsAction(entityType, entityId);
}

export async function removeTagFromEntity(entityType: string, entityId: string, tagId: string): Promise<SimpleTag[]> {
  await untagEntity(entityType, entityId, tagId);
  revalidatePath("/connect");
  return getEntityTagsAction(entityType, entityId);
}

// ------------------------ ANEXOS: INLINE (por entidade) --------------------

export interface EntityAttachment {
  id: string;
  name: string | null;
  kind: string;
  url: string | null;
  hasBlob: boolean;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

function toEntityAttachment(a: {
  id: string; name: string | null; kind: string; url: string | null;
  blob: string | null; mimeType: string | null; sizeBytes: number | null; createdAt: Date;
}): EntityAttachment {
  return {
    id: a.id, name: a.name, kind: a.kind, url: a.url,
    hasBlob: Boolean(a.blob), mimeType: a.mimeType, sizeBytes: a.sizeBytes,
    createdAt: a.createdAt.toISOString(),
  };
}

/** Anexos de uma entidade específica (para o editor inline `<EntityAttachments>`). */
export async function getEntityAttachments(entityType: string, entityId: string): Promise<EntityAttachment[]> {
  const rows = await getAttachments(entityType, entityId);
  return rows.map(toEntityAttachment);
}

/**
 * Adiciona um anexo a uma entidade. `blob` é base64 (portável, sem bucket externo)
 * OU `url` para um link/imagem remota. Limite de ~4MB no blob para não estourar a row.
 */
export async function addEntityAttachment(
  entityType: string,
  entityId: string,
  data: { name?: string; url?: string; blob?: string; mimeType?: string; sizeBytes?: number; kind?: string }
): Promise<EntityAttachment[]> {
  if (data.blob && data.blob.length > 6_000_000) {
    throw new Error("Arquivo muito grande (máx. ~4MB).");
  }
  if (!data.url && !data.blob) {
    throw new Error("Forneça um arquivo ou um link.");
  }
  await attach(entityType, entityId, data);
  revalidatePath("/connect");
  return getEntityAttachments(entityType, entityId);
}

export async function removeEntityAttachment(
  entityType: string,
  entityId: string,
  id: string
): Promise<EntityAttachment[]> {
  await removeAttachment(id);
  revalidatePath("/connect");
  return getEntityAttachments(entityType, entityId);
}

// ------------------------------ ANEXOS: CENTRAL ----------------------------

/** Todos os anexos do usuário, com a entidade de origem resolvida. */
export async function getAttachmentsCenter(): Promise<AttachmentRow[]> {
  const userId = await requireUserId();
  const atts = await prisma.attachment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const resolved = await resolveEntities(
    atts.map((a) => ({ entityType: a.entityType, entityId: a.entityId })),
    userId
  );
  return atts.map((a) => ({
    id: a.id,
    name: a.name,
    kind: a.kind,
    url: a.url,
    hasBlob: Boolean(a.blob),
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    createdAt: a.createdAt.toISOString(),
    entity: resolved.get(`${a.entityType}:${a.entityId}`) ?? null,
  }));
}

export async function removeAttachmentAction(id: string): Promise<AttachmentRow[]> {
  const userId = await requireUserId();
  await prisma.attachment.deleteMany({ where: { id, userId } });
  revalidatePath("/connect");
  return getAttachmentsCenter();
}

// ------------------------ RELAÇÕES (EntityLink / grafo) --------------------

const LINK_KINDS = ["RELATED", "BLOCKS", "DERIVED_FROM", "REFERENCES"];

export interface LinkedEntity {
  linkId: string;
  kind: string;
  direction: "out" | "in"; // out = esta entidade aponta para a outra
  entityType: string;
  entityId: string;
  title: string;
  actionUrl: string | null;
}

/** Relações de uma entidade (em qualquer direção), com a contraparte resolvida. */
export async function getEntityLinks(entityType: string, entityId: string): Promise<LinkedEntity[]> {
  const userId = await requireUserId();
  const links = await getLinkedEntities(entityType, entityId);

  // A "contraparte" é o lado que não é a própria entidade.
  const counterpart = (l: (typeof links)[number]) => {
    const isFrom = l.fromType === entityType && l.fromId === entityId;
    return {
      isFrom,
      type: isFrom ? l.toType : l.fromType,
      id: isFrom ? l.toId : l.fromId,
    };
  };

  const resolved = await resolveEntities(
    links.map((l) => {
      const c = counterpart(l);
      return { entityType: c.type, entityId: c.id };
    }),
    userId
  );

  return links.map((l) => {
    const c = counterpart(l);
    const r = resolved.get(`${c.type}:${c.id}`);
    return {
      linkId: l.id,
      kind: l.kind,
      direction: c.isFrom ? "out" : "in",
      entityType: c.type,
      entityId: c.id,
      title: r?.title ?? "(removido)",
      actionUrl: r?.actionUrl ?? null,
    };
  });
}

/** Busca entidades candidatas para relacionar (exclui a própria entidade). */
export async function searchLinkableEntities(
  query: string,
  excludeType: string,
  excludeId: string
): Promise<{ entityType: string; entityId: string; title: string }[]> {
  const userId = await requireUserId();
  const hits = await searchEntities(query, userId);
  return hits.filter((h) => !(h.entityType === excludeType && h.entityId === excludeId));
}

export async function linkEntityAction(
  fromType: string,
  fromId: string,
  toType: string,
  toId: string,
  kind: string
): Promise<LinkedEntity[]> {
  const safeKind = (LINK_KINDS as readonly string[]).includes(kind) ? kind : "RELATED";
  await linkEntities({ type: fromType, id: fromId }, { type: toType, id: toId }, safeKind);
  revalidatePath("/connect");
  return getEntityLinks(fromType, fromId);
}

export async function unlinkEntityAction(
  entityType: string,
  entityId: string,
  linkId: string
): Promise<LinkedEntity[]> {
  const userId = await requireUserId();
  await prisma.entityLink.deleteMany({ where: { id: linkId, userId } });
  revalidatePath("/connect");
  return getEntityLinks(entityType, entityId);
}

// ------------------------- RELAÇÕES: CENTRAL (grafo todo) ------------------

export interface LinkRow {
  id: string;
  kind: string;
  from: ResolvedEntity | null;
  to: ResolvedEntity | null;
  createdAt: string;
}

/** Todas as relações do usuário, com as duas pontas resolvidas para exibição. */
export async function getAllLinksCenter(): Promise<LinkRow[]> {
  const userId = await requireUserId();
  const links = await prisma.entityLink.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  const resolved = await resolveEntities(
    links.flatMap((l) => [
      { entityType: l.fromType, entityId: l.fromId },
      { entityType: l.toType, entityId: l.toId },
    ]),
    userId
  );
  return links.map((l) => ({
    id: l.id,
    kind: l.kind,
    from: resolved.get(`${l.fromType}:${l.fromId}`) ?? null,
    to: resolved.get(`${l.toType}:${l.toId}`) ?? null,
    createdAt: l.createdAt.toISOString(),
  }));
}

export async function removeLinkCenter(id: string): Promise<LinkRow[]> {
  const userId = await requireUserId();
  await prisma.entityLink.deleteMany({ where: { id, userId } });
  revalidatePath("/connect");
  return getAllLinksCenter();
}
