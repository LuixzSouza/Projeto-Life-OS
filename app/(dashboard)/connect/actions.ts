"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { tagEntity, untagEntity, attach, getAttachments, removeAttachment, linkEntities, getLinkedEntities } from "@/lib/connect";
import { resolveEntities, ENTITY_LABEL as ENTITY_LABEL_MAP, type ResolvedEntity } from "@/lib/entity-resolver";
import { searchEntities } from "@/lib/entity-search";
import { runOneShotAi } from "@/app/(dashboard)/ai/actions/oneshot";

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

// --------------------- CONTAGENS (badges de descoberta) --------------------

export interface ConnectionCounts {
  tags: number;
  attachments: number;
  links: number;
}

/**
 * Contagem leve de tags / anexos / conexões de UM item — para o cartão
 * `EntityConnections` mostrar badges no cabeçalho (mesmo fechado) e o usuário
 * perceber que há conteúdo ali. Três COUNTs em paralelo.
 */
export async function getConnectionCounts(entityType: string, entityId: string): Promise<ConnectionCounts> {
  const userId = await requireUserId();
  const [tags, attachments, links] = await Promise.all([
    prisma.taggable.count({ where: { userId, entityType, entityId } }),
    prisma.attachment.count({ where: { userId, entityType, entityId } }),
    prisma.entityLink.count({
      where: {
        userId,
        OR: [
          { fromType: entityType, fromId: entityId },
          { toType: entityType, toId: entityId },
        ],
      },
    }),
  ]);
  return { tags, attachments, links };
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

// ------------------- SUGESTÕES DE CONEXÃO (heurística + IA) ----------------

export interface SuggestedLink {
  entityType: string;
  entityId: string;
  title: string;
  actionUrl: string | null;
  reason: string;
  /** "ai" quando a IA confirmou/explicou; "heuristic" no fallback local. */
  source: "ai" | "heuristic";
}

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "para", "por", "com", "sem", "que", "uma", "um",
  "no", "na", "nos", "nas", "em", "os", "as", "ao", "aos", "e", "ou", "the", "and",
]);

function keywordsOf(title: string): string[] {
  return Array.from(
    new Set(
      title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
    ),
  ).slice(0, 4);
}

interface Candidate {
  key: string;
  entityType: string;
  entityId: string;
  sharedTags: string[];
  keyword: string | null;
  score: number;
}

/**
 * Sugere itens para conectar a este — SEM esperar o usuário buscar. Combina dois
 * sinais fortes: itens que compartilham uma TAG e itens cujo título casa com
 * PALAVRAS-CHAVE deste. A IA (opcional) reordena e escreve o "porquê"; se não
 * houver IA, cai numa explicação heurística. Disparado sob demanda (botão).
 */
export async function suggestEntityLinks(entityType: string, entityId: string): Promise<SuggestedLink[]> {
  const userId = await requireUserId();
  const selfKey = `${entityType}:${entityId}`;

  // Título do próprio item + tags + conexões existentes (para excluir).
  const [selfResolved, myTags, existing] = await Promise.all([
    resolveEntities([{ entityType, entityId }], userId),
    prisma.taggable.findMany({ where: { userId, entityType, entityId }, select: { tagId: true, tag: { select: { name: true } } } }),
    prisma.entityLink.findMany({
      where: { userId, OR: [{ fromType: entityType, fromId: entityId }, { toType: entityType, toId: entityId }] },
      select: { fromType: true, fromId: true, toType: true, toId: true },
    }),
  ]);

  const selfTitle = selfResolved.get(selfKey)?.title ?? "";
  const excluded = new Set<string>([selfKey]);
  for (const l of existing) {
    excluded.add(`${l.fromType}:${l.fromId}`);
    excluded.add(`${l.toType}:${l.toId}`);
  }

  const candidates = new Map<string, Candidate>();
  const bump = (entityType: string, entityId: string): Candidate => {
    const key = `${entityType}:${entityId}`;
    let c = candidates.get(key);
    if (!c) {
      c = { key, entityType, entityId, sharedTags: [], keyword: null, score: 0 };
      candidates.set(key, c);
    }
    return c;
  };

  // 1) Itens que compartilham alguma tag (sinal forte).
  const tagIds = myTags.map((t) => t.tagId);
  if (tagIds.length > 0) {
    const tagName = new Map(myTags.map((t) => [t.tagId, t.tag.name]));
    const shared = await prisma.taggable.findMany({
      where: { userId, tagId: { in: tagIds } },
      select: { entityType: true, entityId: true, tagId: true },
      take: 60,
    });
    for (const row of shared) {
      const key = `${row.entityType}:${row.entityId}`;
      if (excluded.has(key)) continue;
      const c = bump(row.entityType, row.entityId);
      const name = tagName.get(row.tagId);
      if (name && !c.sharedTags.includes(name)) c.sharedTags.push(name);
    }
  }

  // 2) Itens cujo título casa com palavras-chave deste.
  const keywords = keywordsOf(selfTitle);
  for (const kw of keywords) {
    const hits = await searchEntities(kw, userId, 6);
    for (const h of hits) {
      const key = `${h.entityType}:${h.entityId}`;
      if (excluded.has(key)) continue;
      const c = bump(h.entityType, h.entityId);
      if (!c.keyword) c.keyword = kw;
    }
  }

  // Pontuação e corte do "pool".
  for (const c of candidates.values()) {
    c.score = c.sharedTags.length * 3 + (c.keyword ? 1 : 0);
  }
  const pool = [...candidates.values()].sort((a, b) => b.score - a.score).slice(0, 6);
  if (pool.length === 0) return [];

  // Títulos/rotas dos candidatos.
  const resolved = await resolveEntities(pool.map((c) => ({ entityType: c.entityType, entityId: c.entityId })), userId);
  const enriched = pool
    .map((c) => ({ c, r: resolved.get(c.key) }))
    .filter((x): x is { c: Candidate; r: ResolvedEntity } => Boolean(x.r));

  // Motivo heurístico (fallback e base).
  const heuristicReason = (c: Candidate): string => {
    if (c.sharedTags.length === 1) return `Compartilha a tag "${c.sharedTags[0]}"`;
    if (c.sharedTags.length > 1) return `Compartilha as tags "${c.sharedTags[0]}" +${c.sharedTags.length - 1}`;
    if (c.keyword) return `Menciona "${c.keyword}"`;
    return "Pode ter relação";
  };

  // Refinamento por IA (opcional): reordena e escreve um "porquê" curto.
  const aiReasons = await refineSuggestionsWithAi(userId, selfTitle, entityType, enriched.map((e) => ({ title: e.r.title, type: e.c.entityType })));

  const out: SuggestedLink[] = enriched.map((e, i) => {
    const ai = aiReasons?.get(i);
    return {
      entityType: e.c.entityType,
      entityId: e.c.entityId,
      title: e.r.title,
      actionUrl: e.r.actionUrl,
      reason: ai ?? heuristicReason(e.c),
      source: ai ? "ai" : "heuristic",
    };
  });

  // Se a IA opinou, mostra primeiro os que ela confirmou.
  if (aiReasons) {
    out.sort((a, b) => Number(b.source === "ai") - Number(a.source === "ai"));
  }
  return out.slice(0, 5);
}

/** Pergunta à IA quais candidatos têm relação real e um motivo curto. Índice → motivo. */
async function refineSuggestionsWithAi(
  userId: string,
  selfTitle: string,
  selfType: string,
  candidates: { title: string; type: string }[],
): Promise<Map<number, string> | null> {
  if (!selfTitle || candidates.length === 0) return null;
  const label = (t: string) => ENTITY_LABEL_MAP[t] ?? t;
  const system =
    "Você conecta itens de um sistema pessoal (Life OS). Dado um item e candidatos, diga quais têm relação real e por quê. " +
    'Responda APENAS um array JSON: [{"i": <índice>, "motivo": "<até 5 palavras>"}], só com os relacionados (máx 4). Se nenhum, responda [].';
  const list = candidates.map((c, i) => `${i}. "${c.title}" (${label(c.type)})`).join("\n");
  const user = `Item: "${selfTitle}" (${label(selfType)}).\nCandidatos:\n${list}`;

  const raw = await runOneShotAi(userId, system, user);
  if (!raw) return null;
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return null;
    const map = new Map<number, string>();
    for (const item of parsed) {
      if (item && typeof item === "object" && "i" in item) {
        const i = Number((item as { i: unknown }).i);
        const motivo = String((item as { motivo?: unknown }).motivo ?? "").trim();
        if (Number.isInteger(i) && i >= 0 && i < candidates.length && motivo) {
          map.set(i, motivo.slice(0, 60));
        }
      }
    }
    return map.size > 0 ? map : null;
  } catch {
    return null;
  }
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
