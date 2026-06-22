"use server";

// Orquestra a página "Celebrar": carrega o amigo, monta as fotos, gera a
// homenagem (IA do usuário com fallback local) e assina o link público.
// A geração da IA é cacheada por amigo+ano (best-effort, em memória) para não
// chamar o provedor a cada recarga — e o botão "gerar outra" ignora o cache.

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { runOneShotAi } from "@/app/(dashboard)/ai/actions/oneshot";
import {
  type CelebrationTheme,
  type FriendForMessage,
  makeCelebrationToken,
  parseCelebrationToken,
  verifyCelebrationSignature,
  pickTheme,
  turningAge,
  isBirthdayToday,
  displayNameOf,
  localCelebrationMessage,
  celebrationAiPrompt,
  splitParagraphs,
} from "@/lib/celebration";

const MAX_PHOTOS = 8;

// Dados próprios da celebração (texto editado + fotos escolhidas) vivem no
// Attachment com entityType="celebration" (entityId = id do amigo). Assim NÃO
// poluem os anexos gerais do amigo e persistem sem migração de schema.
const CELEB_ENTITY = "celebration";
const MSG_KIND = "MESSAGE";
const MAX_SRC_LEN = 6_000_000; // ~4MB de imagem já comprimida (data URL)

export type CelebrationSource = "ai" | "local" | "custom";

export interface CelebrationData {
  friendId: string;
  fullName: string;
  displayName: string;
  age: number | null;
  isToday: boolean;
  photos: string[];
  paragraphs: string[];
  source: CelebrationSource;
  theme: CelebrationTheme;
  /** Só preenchido na visão do dono (para compartilhar). */
  shareUrl: string | null;
}

interface GeneratedMessage {
  paragraphs: string[];
  source: CelebrationSource;
}

/** Foto da celebração com id (para remover) e src pronto para <img>. */
export interface CelebrationPhoto {
  id: string;
  src: string;
}

/** Dados para o editor do dono (texto atual + fotos + sugestões rápidas). */
export interface CelebrationEditData {
  message: string;
  hasCustom: boolean;
  photos: CelebrationPhoto[];
  suggestions: { label: string; src: string }[];
}

// Cache em memória: friendId:ano → mensagem. Sobrevive entre requisições no
// processo longo (desktop/dev). Best-effort: se reiniciar, regenera.
const messageCache = new Map<string, GeneratedMessage>();

function cacheKey(friendId: string): string {
  return `${friendId}:${new Date().getFullYear()}`;
}

function srcOf(a: { url: string | null; blob: string | null; mimeType: string | null }): string | null {
  if (a.url) return a.url;
  if (a.blob) return `data:${a.mimeType ?? "image/jpeg"};base64,${a.blob}`;
  return null;
}

/**
 * Fotos da celebração: foto principal do amigo + anexos de imagem dele
 * (entityType="friend") + as fotos escolhidas só para esta página
 * (entityType="celebration", inclui fotos do dono / dos dois juntos).
 */
async function collectPhotos(userId: string, friendId: string, mainImage: string | null): Promise<string[]> {
  const photos: string[] = [];
  if (mainImage) photos.push(mainImage);

  const attachments = await prisma.attachment.findMany({
    where: { userId, entityType: { in: ["friend", CELEB_ENTITY] }, entityId: friendId, kind: "IMAGE" },
    orderBy: { createdAt: "asc" },
    select: { url: true, blob: true, mimeType: true },
    take: MAX_PHOTOS,
  });
  for (const a of attachments) {
    const src = srcOf(a);
    if (src) photos.push(src);
  }

  // Sem duplicar a foto principal e limitando o total.
  return Array.from(new Set(photos)).slice(0, MAX_PHOTOS);
}

/** Texto personalizado salvo pelo dono (null se ainda usa o automático). */
async function getCustomMessage(userId: string, friendId: string): Promise<string | null> {
  const row = await prisma.attachment.findFirst({
    where: { userId, entityType: CELEB_ENTITY, entityId: friendId, kind: MSG_KIND },
    orderBy: { createdAt: "desc" },
    select: { blob: true },
  });
  return row?.blob && row.blob.trim() ? row.blob : null;
}

/** Fotos próprias da celebração (entityType="celebration"), com id para remover. */
async function listCelebrationPhotos(userId: string, friendId: string): Promise<CelebrationPhoto[]> {
  const rows = await prisma.attachment.findMany({
    where: { userId, entityType: CELEB_ENTITY, entityId: friendId, kind: "IMAGE" },
    orderBy: { createdAt: "asc" },
    select: { id: true, url: true, blob: true, mimeType: true },
  });
  return rows
    .map((r) => ({ id: r.id, src: srcOf(r) }))
    .filter((p): p is CelebrationPhoto => p.src !== null);
}

/** Gera (ou reaproveita) a homenagem para o amigo. */
async function buildMessage(
  userId: string,
  friend: FriendForMessage,
  force: boolean,
): Promise<GeneratedMessage> {
  const key = cacheKey(friend.id);
  if (!force) {
    // Texto personalizado pelo dono SEMPRE vence o automático.
    const custom = await getCustomMessage(userId, friend.id);
    if (custom) return { paragraphs: splitParagraphs(custom), source: "custom" };
    const cached = messageCache.get(key);
    if (cached) return cached;
  }

  const { system, user } = celebrationAiPrompt(friend);
  const aiText = await runOneShotAi(userId, system, user);
  const aiParagraphs = aiText ? splitParagraphs(aiText) : [];

  const result: GeneratedMessage =
    aiParagraphs.length >= 2
      ? { paragraphs: aiParagraphs, source: "ai" }
      : { paragraphs: localCelebrationMessage(friend), source: "local" };

  messageCache.set(key, result);
  return result;
}

/** Monta o objeto completo da celebração a partir do amigo já carregado. */
async function assemble(
  userId: string,
  friend: FriendForMessage & { imageUrl: string | null },
  shareUrl: string | null,
  force = false,
): Promise<CelebrationData> {
  const [photos, message] = await Promise.all([
    collectPhotos(userId, friend.id, friend.imageUrl),
    buildMessage(userId, friend, force),
  ]);

  return {
    friendId: friend.id,
    fullName: friend.name,
    displayName: displayNameOf(friend),
    age: turningAge(friend.birthday),
    isToday: isBirthdayToday(friend.birthday),
    photos,
    paragraphs: message.paragraphs,
    source: message.source,
    theme: pickTheme(friend.id),
    shareUrl,
  };
}

/** Base pública (https em produção/atrás de proxy; http no local). */
async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const FRIEND_SELECT = {
  id: true, name: true, nickname: true, proximity: true,
  notes: true, tags: true, birthday: true, imageUrl: true,
} as const;

/** Visão do DONO (autenticada): inclui o link compartilhável. */
export async function getCelebrationForFriend(friendId: string): Promise<CelebrationData | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const [friend, user] = await Promise.all([
    prisma.friend.findFirst({ where: { id: friendId, userId, deletedAt: null }, select: FRIEND_SELECT }),
    prisma.user.findUnique({ where: { id: userId }, select: { tokenVersion: true } }),
  ]);
  if (!friend) return null;

  const token = makeCelebrationToken(userId, friendId, user?.tokenVersion ?? 0);
  const shareUrl = token ? `${await baseUrl()}/celebrar/${token}` : null;

  return assemble(userId, friend, shareUrl);
}

/** Regenera a homenagem com a IA (botão "gerar outra"). Não salva. Apenas o dono. */
export async function regenerateCelebration(friendId: string): Promise<GeneratedMessage | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const friend = await prisma.friend.findFirst({
    where: { id: friendId, userId, deletedAt: null },
    select: FRIEND_SELECT,
  });
  if (!friend) return null;

  return buildMessage(userId, friend, true);
}

// ----------------------- EDIÇÃO (texto + fotos) — só o dono ------------------

/** Garante que o amigo é do usuário; devolve userId + amigo (ou null). */
async function ownFriend(friendId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const friend = await prisma.friend.findFirst({
    where: { id: friendId, userId, deletedAt: null },
    select: FRIEND_SELECT,
  });
  return friend ? { userId, friend } : null;
}

/** Dados para abrir o editor: texto atual, fotos da celebração e sugestões rápidas. */
export async function getCelebrationEditData(friendId: string): Promise<CelebrationEditData | null> {
  const owned = await ownFriend(friendId);
  if (!owned) return null;
  const { userId, friend } = owned;

  const [custom, photos, user] = await Promise.all([
    getCustomMessage(userId, friendId),
    listCelebrationPhotos(userId, friendId),
    prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true, coverUrl: true } }),
  ]);

  // Texto inicial do editor: o personalizado, ou o automático já montado.
  const message = custom ?? (await buildMessage(userId, friend, false)).paragraphs.join("\n\n");

  const suggestions: { label: string; src: string }[] = [];
  if (friend.imageUrl) suggestions.push({ label: `Foto de ${displayNameOf(friend)}`, src: friend.imageUrl });
  if (user?.avatarUrl) suggestions.push({ label: "Minha foto", src: user.avatarUrl });
  if (user?.coverUrl) suggestions.push({ label: "Minha capa", src: user.coverUrl });

  return { message, hasCustom: Boolean(custom), photos, suggestions };
}

/** Salva o texto editado pelo dono (substitui o anterior). */
export async function saveCelebrationMessage(
  friendId: string,
  text: string,
): Promise<GeneratedMessage | null> {
  const owned = await ownFriend(friendId);
  if (!owned) return null;
  const { userId } = owned;

  const clean = text.trim();
  if (!clean) return clearCelebrationMessage(friendId);
  if (clean.length > 8000) throw new Error("Texto muito longo.");

  await prisma.attachment.deleteMany({ where: { userId, entityType: CELEB_ENTITY, entityId: friendId, kind: MSG_KIND } });
  await prisma.attachment.create({
    data: { userId, entityType: CELEB_ENTITY, entityId: friendId, kind: MSG_KIND, blob: clean, mimeType: "text/plain" },
  });

  return { paragraphs: splitParagraphs(clean), source: "custom" };
}

/** Volta a usar o texto automático (remove o personalizado). */
export async function clearCelebrationMessage(friendId: string): Promise<GeneratedMessage | null> {
  const owned = await ownFriend(friendId);
  if (!owned) return null;
  const { userId, friend } = owned;

  await prisma.attachment.deleteMany({ where: { userId, entityType: CELEB_ENTITY, entityId: friendId, kind: MSG_KIND } });
  return buildMessage(userId, friend, true);
}

interface PhotoUpdate {
  photos: CelebrationPhoto[]; // fotos próprias da celebração (para o editor)
  allPhotos: string[];        // conjunto completo exibido no palco
}

async function photoUpdate(userId: string, friendId: string, mainImage: string | null): Promise<PhotoUpdate> {
  const [photos, allPhotos] = await Promise.all([
    listCelebrationPhotos(userId, friendId),
    collectPhotos(userId, friendId, mainImage),
  ]);
  return { photos, allPhotos };
}

/** Adiciona uma foto (data URL já comprimida, ou URL externa) à celebração. */
export async function addCelebrationPhoto(friendId: string, src: string): Promise<PhotoUpdate | null> {
  const owned = await ownFriend(friendId);
  if (!owned) return null;
  const { userId, friend } = owned;

  const value = src.trim();
  if (!value) throw new Error("Foto inválida.");
  if (value.length > MAX_SRC_LEN) throw new Error("Imagem muito grande (máx. ~4MB).");

  const count = await prisma.attachment.count({
    where: { userId, entityType: CELEB_ENTITY, entityId: friendId, kind: "IMAGE" },
  });
  if (count >= MAX_PHOTOS) throw new Error(`Máximo de ${MAX_PHOTOS} fotos.`);

  await prisma.attachment.create({
    data: { userId, entityType: CELEB_ENTITY, entityId: friendId, kind: "IMAGE", url: value },
  });

  return photoUpdate(userId, friendId, friend.imageUrl);
}

/** Remove uma foto da celebração. */
export async function removeCelebrationPhoto(friendId: string, attachmentId: string): Promise<PhotoUpdate | null> {
  const owned = await ownFriend(friendId);
  if (!owned) return null;
  const { userId, friend } = owned;

  await prisma.attachment.deleteMany({ where: { id: attachmentId, userId, entityType: CELEB_ENTITY } });
  return photoUpdate(userId, friendId, friend.imageUrl);
}

/** Visão PÚBLICA (link assinado): sem login, sem shareUrl. */
export async function resolveCelebrationToken(rawToken: string): Promise<CelebrationData | null> {
  const parsed = parseCelebrationToken(decodeURIComponent(rawToken));
  if (!parsed) return null;

  // Token inválido responde igual a inexistente — nada a enumerar.
  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    select: { tokenVersion: true },
  });
  if (!user || !verifyCelebrationSignature(parsed.userId, parsed.friendId, user.tokenVersion, parsed.sig)) {
    return null;
  }

  const friend = await prisma.friend.findFirst({
    where: { id: parsed.friendId, userId: parsed.userId, deletedAt: null },
    select: FRIEND_SELECT,
  });
  if (!friend) return null;

  return assemble(parsed.userId, friend, null);
}
