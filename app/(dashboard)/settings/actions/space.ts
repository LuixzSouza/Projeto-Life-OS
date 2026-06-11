"use server";

// ============================================================================
// OTIMIZADOR DE ESPAÇO — "gastar o mínimo do plano grátis"
// ============================================================================
// O que pesa num banco do Life OS não são as linhas de texto (uma tarefa tem
// ~200 bytes), e sim:
//   1. IMAGENS em base64 (Conexões, Closet, fotos de treino, imagens coladas
//      em notas, avatar/capa) — de longe o maior consumidor;
//   2. o índice semântico da IA (vetores JSON — 100% regenerável);
//   3. logs/notificações/versões de nota que crescem sem parar;
//   4. a lixeira (soft-delete guarda a linha inteira).
// Este módulo mede cada um e oferece faxina seletiva + recompressão de
// imagens (a compressão em si roda no NAVEGADOR via canvas — o servidor não
// tem processador de imagem; ver space-optimizer-card.tsx).

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getDbProfile } from "@/lib/db-config";
import { isSqliteFamily } from "@/lib/db-dialect";
import { revalidatePath } from "next/cache";

// ----------------------------------------------------------------------------
// ANÁLISE
// ----------------------------------------------------------------------------

export type ImageKind = "friend" | "wardrobe" | "workoutPhoto" | "noteImage" | "avatar" | "cover";

export interface ImageGroup {
  kind: ImageKind;
  label: string;
  count: number;
  bytes: number;
}

export interface OptimizableImage {
  kind: ImageKind;
  id: string;
  bytes: number;
}

export interface CleanupLine {
  key: CleanupKey;
  label: string;
  count: number;
  bytes: number;
  hint: string;
}

export interface SpaceAnalysis {
  images: ImageGroup[];
  optimizable: OptimizableImage[];
  cleanups: CleanupLine[];
  totalBytes: number;
}

export type CleanupKey =
  | "logs90"
  | "readNotifications"
  | "backupLogs"
  | "noteVersions"
  | "trash30"
  | "embeddings"
  | "aiChats90";

const DAY_MS = 86_400_000;
// Abaixo disso a recompressão não compensa a viagem (thumbnail já é pequeno).
const MIN_OPTIMIZABLE_BYTES = 60_000;

const len = (s: string | null | undefined) => (s ? s.length : 0);
const isInlineImage = (s: string | null | undefined) => !!s && s.startsWith("data:image");

export async function getSpaceAnalysis(): Promise<SpaceAnalysis> {
  const userId = await requireUserId();
  const now = Date.now();
  const cut90 = new Date(now - 90 * DAY_MS);
  const cut30 = new Date(now - 30 * DAY_MS);

  // Imagens: carregamos só o campo da imagem para medir (volume single-user;
  // SUM(LENGTH(...)) em SQL cru exigiria placeholder por dialeto — não vale).
  const [friends, wardrobe, workoutPhotos, noteImages, me] = await Promise.all([
    prisma.friend.findMany({ where: { userId }, select: { id: true, imageUrl: true } }),
    prisma.wardrobeItem.findMany({ where: { userId }, select: { id: true, imageUrl: true } }),
    prisma.workoutPhoto.findMany({ where: { userId }, select: { id: true, dataUrl: true } }),
    prisma.noteImage.findMany({ where: { userId }, select: { id: true, data: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true, coverUrl: true } }),
  ]);

  const images: ImageGroup[] = [];
  const optimizable: OptimizableImage[] = [];

  const collect = (
    kind: ImageKind,
    label: string,
    rows: { id: string; value: string | null }[],
    inlineOnly = true,
  ) => {
    const inline = rows.filter((r) => (inlineOnly ? isInlineImage(r.value) : !!r.value));
    const bytes = inline.reduce((sum, r) => sum + len(r.value), 0);
    images.push({ kind, label, count: inline.length, bytes });
    for (const r of inline) {
      if (len(r.value) >= MIN_OPTIMIZABLE_BYTES) {
        optimizable.push({ kind, id: r.id, bytes: len(r.value) });
      }
    }
  };

  collect("friend", "Fotos de Conexões", friends.map((f) => ({ id: f.id, value: f.imageUrl })));
  collect("wardrobe", "Fotos do Closet", wardrobe.map((w) => ({ id: w.id, value: w.imageUrl })));
  collect("workoutPhoto", "Fotos de treino", workoutPhotos.map((w) => ({ id: w.id, value: w.dataUrl })));
  // NoteImage guarda base64 PURO (sem prefixo data:) — conta tudo que tiver valor.
  collect("noteImage", "Imagens em notas", noteImages.map((n) => ({ id: n.id, value: n.data })), false);
  collect("avatar", "Avatar do perfil", me?.avatarUrl ? [{ id: userId, value: me.avatarUrl }] : []);
  collect("cover", "Capa do perfil", me?.coverUrl ? [{ id: userId, value: me.coverUrl }] : []);

  // Maiores primeiro: o usuário vê o ganho logo no começo da fila.
  optimizable.sort((a, b) => b.bytes - a.bytes);

  // ---- Faxinas ----
  const [
    oldLogs,
    readNotifs,
    backupLogs,
    versions,
    embeddings,
    oldChats,
    trashCounts,
  ] = await Promise.all([
    // action CONTACT fica de fora: é o "último contato" do CRM social (dado, não auditoria).
    prisma.activityLog.findMany({ where: { userId, createdAt: { lt: cut90 }, action: { not: "CONTACT" } }, select: { id: true, summary: true, meta: true } }),
    prisma.notification.count({ where: { userId, readAt: { not: null } } }),
    prisma.backupLog.count({ where: { userId } }),
    prisma.studyNoteVersion.findMany({ where: { userId }, select: { id: true, noteId: true, content: true, createdAt: true } }),
    prisma.aiEmbedding.findMany({ where: { userId }, select: { id: true, vector: true, text: true } }),
    prisma.aiChat.findMany({
      where: { userId, createdAt: { lt: cut90 } },
      select: { id: true, messages: { select: { content: true } } },
    }),
    Promise.all([
      prisma.task.count({ where: { userId, deletedAt: { lt: cut30 } } }),
      prisma.savedLink.count({ where: { userId, deletedAt: { lt: cut30 } } }),
      prisma.wishlistItem.count({ where: { userId, deletedAt: { lt: cut30 } } }),
      prisma.mediaItem.count({ where: { userId, deletedAt: { lt: cut30 } } }),
      prisma.event.count({ where: { userId, deletedAt: { lt: cut30 } } }),
      prisma.friend.count({ where: { userId, deletedAt: { lt: cut30 } } }),
      prisma.client.count({ where: { userId, deletedAt: { lt: cut30 } } }),
      prisma.wardrobeItem.count({ where: { userId, deletedAt: { lt: cut30 } } }),
      prisma.transaction.count({ where: { userId, deletedAt: { lt: cut30 } } }),
      prisma.project.count({ where: { userId, deletedAt: { lt: cut30 } } }),
      prisma.studyNote.count({ where: { userId, deletedAt: { lt: cut30 } } }),
      prisma.learningGoal.count({ where: { userId, deletedAt: { lt: cut30 } } }),
    ]),
  ]);

  // Versões de nota: o que passa das 10 mais recentes POR NOTA é podável.
  const byNote = new Map<string, { id: string; bytes: number; createdAt: Date }[]>();
  for (const v of versions) {
    const list = byNote.get(v.noteId) ?? [];
    list.push({ id: v.id, bytes: len(v.content), createdAt: v.createdAt });
    byNote.set(v.noteId, list);
  }
  let prunableVersions = 0;
  let prunableVersionBytes = 0;
  for (const list of byNote.values()) {
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    for (const v of list.slice(10)) {
      prunableVersions++;
      prunableVersionBytes += v.bytes;
    }
  }

  const trashTotal = trashCounts.reduce((sum, n) => sum + n, 0);
  const chatMsgBytes = oldChats.reduce(
    (sum, c) => sum + c.messages.reduce((s, m) => s + len(m.content), 0),
    0,
  );

  const cleanups: CleanupLine[] = [
    {
      key: "embeddings",
      label: "Índice semântico da IA",
      count: embeddings.length,
      bytes: embeddings.reduce((sum, e) => sum + len(e.vector) + len(e.text), 0),
      hint: "100% regenerável — a IA reindexa sozinha conforme você usa a busca.",
    },
    {
      key: "logs90",
      label: "Logs de atividade com +90 dias",
      count: oldLogs.length,
      bytes: oldLogs.reduce((sum, l) => sum + len(l.summary) + len(l.meta) + 120, 0),
      hint: "Auditoria antiga; os últimos 90 dias ficam.",
    },
    {
      key: "noteVersions",
      label: "Versões antigas de notas (além das 10 últimas)",
      count: prunableVersions,
      bytes: prunableVersionBytes,
      hint: "Cada versão guarda o texto INTEIRO da nota daquela época.",
    },
    {
      key: "trash30",
      label: "Lixeira com +30 dias",
      count: trashTotal,
      bytes: 0,
      hint: "Itens excluídos há mais de 30 dias são apagados de vez.",
    },
    {
      key: "aiChats90",
      label: "Conversas de IA com +90 dias",
      count: oldChats.length,
      bytes: chatMsgBytes,
      hint: "Apaga o histórico antigo do chat (memórias salvas da IA ficam).",
    },
    {
      key: "readNotifications",
      label: "Notificações já lidas",
      count: readNotifs,
      bytes: readNotifs * 200,
      hint: "Só as lidas — as pendentes ficam.",
    },
    {
      key: "backupLogs",
      label: "Histórico de backups (além dos 20 últimos)",
      count: Math.max(0, backupLogs - 20),
      bytes: Math.max(0, backupLogs - 20) * 150,
      hint: "Só o REGISTRO do histórico — nenhum arquivo de backup é tocado.",
    },
  ];

  const totalBytes =
    images.reduce((sum, g) => sum + g.bytes, 0) + cleanups.reduce((sum, c) => sum + c.bytes, 0);

  return { images, optimizable, cleanups, totalBytes };
}

// ----------------------------------------------------------------------------
// FAXINA SELETIVA
// ----------------------------------------------------------------------------

export async function runSpaceCleanup(
  keys: CleanupKey[],
): Promise<{ success: boolean; message: string; removed: Record<string, number> }> {
  const userId = await requireUserId();
  const selected = new Set(keys);
  const removed: Record<string, number> = {};
  const now = Date.now();
  const cut90 = new Date(now - 90 * DAY_MS);
  const cut30 = new Date(now - 30 * DAY_MS);

  try {
    if (selected.has("embeddings")) {
      const r = await prisma.aiEmbedding.deleteMany({ where: { userId } });
      removed.embeddings = r.count;
    }
    if (selected.has("logs90")) {
      const r = await prisma.activityLog.deleteMany({ where: { userId, createdAt: { lt: cut90 }, action: { not: "CONTACT" } } });
      removed.logs90 = r.count;
    }
    if (selected.has("readNotifications")) {
      const r = await prisma.notification.deleteMany({ where: { userId, readAt: { not: null } } });
      removed.readNotifications = r.count;
    }
    if (selected.has("backupLogs")) {
      const keep = await prisma.backupLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true },
      });
      const r = await prisma.backupLog.deleteMany({
        where: { userId, id: { notIn: keep.map((k) => k.id) } },
      });
      removed.backupLogs = r.count;
    }
    if (selected.has("noteVersions")) {
      const versions = await prisma.studyNoteVersion.findMany({
        where: { userId },
        select: { id: true, noteId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
      const seen = new Map<string, number>();
      const toDelete: string[] = [];
      for (const v of versions) {
        const n = (seen.get(v.noteId) ?? 0) + 1;
        seen.set(v.noteId, n);
        if (n > 10) toDelete.push(v.id);
      }
      let count = 0;
      for (let i = 0; i < toDelete.length; i += 200) {
        const r = await prisma.studyNoteVersion.deleteMany({
          where: { userId, id: { in: toDelete.slice(i, i + 200) } },
        });
        count += r.count;
      }
      removed.noteVersions = count;
    }
    if (selected.has("trash30")) {
      const where = { userId, deletedAt: { lt: cut30 } };
      const results = await Promise.all([
        prisma.task.deleteMany({ where }),
        prisma.savedLink.deleteMany({ where }),
        prisma.wishlistItem.deleteMany({ where }),
        prisma.mediaItem.deleteMany({ where }),
        prisma.event.deleteMany({ where }),
        prisma.friend.deleteMany({ where }),
        prisma.client.deleteMany({ where }),
        prisma.wardrobeItem.deleteMany({ where }),
        // saldo já foi revertido no soft-delete (mesma regra do esvaziar lixeira)
        prisma.transaction.deleteMany({ where }),
        prisma.project.deleteMany({ where }),
        prisma.studyNote.deleteMany({ where }),
        prisma.learningGoal.deleteMany({ where }),
      ]);
      removed.trash30 = results.reduce((sum, r) => sum + r.count, 0);
    }
    if (selected.has("aiChats90")) {
      // Mensagens cascateiam pela FK do chat.
      const r = await prisma.aiChat.deleteMany({ where: { userId, createdAt: { lt: cut90 } } });
      removed.aiChats90 = r.count;
    }

    // No modo Local dá para compactar o ARQUIVO na hora (VACUUM). No Turso o
    // espaço lógico liberado é reutilizado pelo serviço.
    let vacuumNote = "";
    if (getDbProfile()?.mode === "local" && isSqliteFamily()) {
      try {
        await prisma.$executeRawUnsafe("VACUUM;");
        vacuumNote = " Arquivo compactado (VACUUM).";
      } catch {
        vacuumNote = " (VACUUM falhou — rode a Otimização na Manutenção.)";
      }
    }

    revalidatePath("/settings");
    const total = Object.values(removed).reduce((sum, n) => sum + n, 0);
    return {
      success: true,
      removed,
      message: `Faxina concluída: ${total} registro(s) removidos.${vacuumNote}`,
    };
  } catch (error) {
    console.error("Erro na faxina de espaço:", error);
    return { success: false, removed, message: "Falha na faxina. Veja o log do servidor." };
  }
}

// ----------------------------------------------------------------------------
// RECOMPRESSÃO DE IMAGENS (dados servidos 1 a 1; o canvas roda no navegador)
// ----------------------------------------------------------------------------

/** Devolve a imagem de um item como data-URL para o cliente recomprimir. */
export async function getImagePayload(
  kind: ImageKind,
  id: string,
): Promise<{ dataUrl: string } | null> {
  const userId = await requireUserId();
  switch (kind) {
    case "friend": {
      const row = await prisma.friend.findFirst({ where: { id, userId }, select: { imageUrl: true } });
      return isInlineImage(row?.imageUrl) ? { dataUrl: row!.imageUrl! } : null;
    }
    case "wardrobe": {
      const row = await prisma.wardrobeItem.findFirst({ where: { id, userId }, select: { imageUrl: true } });
      return isInlineImage(row?.imageUrl) ? { dataUrl: row!.imageUrl! } : null;
    }
    case "workoutPhoto": {
      const row = await prisma.workoutPhoto.findFirst({ where: { id, userId }, select: { dataUrl: true } });
      return isInlineImage(row?.dataUrl) ? { dataUrl: row!.dataUrl } : null;
    }
    case "noteImage": {
      const row = await prisma.noteImage.findFirst({ where: { id, userId }, select: { mime: true, data: true } });
      return row?.data ? { dataUrl: `data:${row.mime};base64,${row.data}` } : null;
    }
    case "avatar": {
      const row = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
      return isInlineImage(row?.avatarUrl) ? { dataUrl: row!.avatarUrl! } : null;
    }
    case "cover": {
      const row = await prisma.user.findUnique({ where: { id: userId }, select: { coverUrl: true } });
      return isInlineImage(row?.coverUrl) ? { dataUrl: row!.coverUrl! } : null;
    }
  }
}

/**
 * Grava a versão recomprimida — SÓ se for realmente menor que a atual
 * (o cliente já filtra, mas o servidor confere de novo).
 */
export async function saveOptimizedImage(
  kind: ImageKind,
  id: string,
  dataUrl: string,
): Promise<{ success: boolean; savedBytes: number }> {
  const userId = await requireUserId();
  if (!isInlineImage(dataUrl)) return { success: false, savedBytes: 0 };

  const current = await getImagePayload(kind, id);
  if (!current || dataUrl.length >= current.dataUrl.length) {
    return { success: false, savedBytes: 0 };
  }
  const savedBytes = current.dataUrl.length - dataUrl.length;

  switch (kind) {
    case "friend":
      await prisma.friend.updateMany({ where: { id, userId }, data: { imageUrl: dataUrl } });
      break;
    case "wardrobe":
      await prisma.wardrobeItem.updateMany({ where: { id, userId }, data: { imageUrl: dataUrl } });
      break;
    case "workoutPhoto":
      await prisma.workoutPhoto.updateMany({ where: { id, userId }, data: { dataUrl } });
      break;
    case "noteImage": {
      const comma = dataUrl.indexOf(",");
      const mime = dataUrl.slice(5, dataUrl.indexOf(";"));
      await prisma.noteImage.updateMany({
        where: { id, userId },
        data: { mime, data: dataUrl.slice(comma + 1) },
      });
      break;
    }
    case "avatar":
      await prisma.user.update({ where: { id: userId }, data: { avatarUrl: dataUrl } });
      break;
    case "cover":
      await prisma.user.update({ where: { id: userId }, data: { coverUrl: dataUrl } });
      break;
  }
  return { success: true, savedBytes };
}
