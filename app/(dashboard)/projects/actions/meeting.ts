"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import {
  parseMeetingImages,
  serializeMeetingImages,
  splitMeetingDataUrl,
  meetingImageRef,
  meetingImageIdFromRef,
  type MeetingImage,
} from "@/lib/meeting-images";
import { createHash } from "crypto";
import { parseActionItems } from "@/lib/meeting-summary";
import { parseStringList, serializeStringList } from "@/lib/meeting-meta";
import { callAIProvider } from "@/app/(dashboard)/ai/actions/providers";
import { getAiCallConfig } from "@/app/(dashboard)/ai/actions/oneshot";

// Resolve o projeto garantindo que pertence ao usuário (senão fica sem projeto = Inbox).
async function resolveProjectId(projectId: string | null | undefined, userId: string): Promise<string | null> {
  if (!projectId || projectId === "inbox") return null;
  const owned = await prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null }, select: { id: true } });
  return owned ? projectId : null;
}

// Externaliza a galeria de uma reunião: base64 inline (data URLs) viram linhas em
// MeetingImage e o JSON guarda só a REFERÊNCIA (/api/meeting-image/[id]) — linha do
// Meeting enxuta e imagens servidas com cache. Idempotente: dedup por sha256 do
// conteúdo, então o reenvio do autosave não cria duplicatas. Imagens sumidas da
// galeria têm a linha apagada (libera espaço). Data URLs de reuniões antigas
// migram de forma preguiçosa no 1º save. Pré-condição: o meeting é do userId.
async function reconcileMeetingImages(
  meetingId: string,
  userId: string,
  incoming: MeetingImage[],
): Promise<MeetingImage[]> {
  const existing = await prisma.meetingImage.findMany({
    where: { meetingId, userId },
    select: { id: true, hash: true },
  });
  const idByHash = new Map(existing.map((r) => [r.hash, r.id]));
  const existingIds = new Set(existing.map((r) => r.id));
  const keptIds = new Set<string>();
  const result: MeetingImage[] = [];

  for (const img of incoming) {
    const parsed = splitMeetingDataUrl(img.src);
    if (parsed) {
      // Nova imagem base64 → externaliza (ou reusa linha idêntica por hash).
      const hash = createHash("sha256").update(parsed.data).digest("hex");
      let id = idByHash.get(hash);
      if (!id) {
        const row = await prisma.meetingImage.create({
          data: { meetingId, userId, mime: parsed.mime, data: parsed.data, hash },
          select: { id: true },
        });
        id = row.id;
        idByHash.set(hash, id);
      }
      keptIds.add(id);
      result.push({ src: meetingImageRef(id), caption: img.caption });
    } else {
      // Referência a uma linha existente (mantém) ou URL externa/legado (preserva).
      const refId = meetingImageIdFromRef(img.src);
      if (refId && existingIds.has(refId)) keptIds.add(refId);
      result.push({ src: img.src, caption: img.caption });
    }
  }

  const toDelete = existing.filter((r) => !keptIds.has(r.id)).map((r) => r.id);
  if (toDelete.length > 0) {
    await prisma.meetingImage.deleteMany({ where: { id: { in: toDelete }, userId } });
  }

  return result;
}

export async function createMeeting(input: { title: string; rawNotes?: string; projectId?: string | null }) {
  try {
    const title = input.title?.trim();
    if (!title) return { success: false, message: "Dê um título à reunião." };

    const userId = await requireUserId();
    const projectId = await resolveProjectId(input.projectId, userId);

    const meeting = await prisma.meeting.create({
      data: { title, rawNotes: input.rawNotes?.trim() || "", projectId, userId },
    });

    revalidatePath("/projects");
    return { success: true, message: "Reunião criada!", meetingId: meeting.id };
  } catch (error) {
    console.error("Erro ao criar reunião:", error);
    return { success: false, message: "Falha ao criar reunião." };
  }
}

export async function updateMeeting(input: {
  id: string;
  title?: string;
  rawNotes?: string;
  image?: string | null;
  images?: MeetingImage[];
  participants?: string[];
  tags?: string[];
  decisions?: string[];
}) {
  try {
    if (!input.id) return { success: false, message: "ID inválido." };
    const userId = await requireUserId();

    // Galeria: externaliza base64 → MeetingImage e guarda só as referências.
    // Checa posse ANTES (o reconcile grava linhas atreladas a este meeting).
    let imagesData: { images: string; image: string | null } | null = null;
    if (input.images !== undefined) {
      const owns = await prisma.meeting.findFirst({ where: { id: input.id, userId }, select: { id: true } });
      if (!owns) return { success: false, message: "Reunião não encontrada." };
      const reconciled = await reconcileMeetingImages(input.id, userId, input.images);
      imagesData = { images: serializeMeetingImages(reconciled), image: reconciled[0]?.src ?? null };
    }

    await prisma.meeting.updateMany({
      where: { id: input.id, userId },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.rawNotes !== undefined ? { rawNotes: input.rawNotes } : {}),
        ...(input.image !== undefined ? { image: input.image || null } : {}),
        // Galeria: refs em `images` (base64 externalizado) + espelho da 1ª em `image`.
        ...(imagesData ?? {}),
        ...(input.participants !== undefined ? { participants: serializeStringList(input.participants) } : {}),
        ...(input.tags !== undefined ? { tags: serializeStringList(input.tags) } : {}),
        ...(input.decisions !== undefined ? { decisions: serializeStringList(input.decisions) } : {}),
      },
    });

    revalidatePath("/projects");
    return { success: true, message: "Reunião salva." };
  } catch (error) {
    console.error("Erro ao atualizar reunião:", error);
    return { success: false, message: "Falha ao salvar reunião." };
  }
}

/** Nomes das Conexões (CRM social) — autocomplete dos participantes da reunião. */
export async function getConnectionNames(): Promise<string[]> {
  try {
    const userId = await requireUserId();
    const friends = await prisma.friend.findMany({
      where: { userId, deletedAt: null },
      select: { name: true },
      orderBy: { name: "asc" },
      take: 300,
    });
    return friends.map((f) => f.name).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Polimento da transcrição: a IA corrige pontuação, capitalização e erros
 * ÓBVIOS de transcrição pelo contexto — preservando os carimbos [mm:ss] e sem
 * resumir nem inventar. As notas são substituídas (o chamador oferece desfazer).
 */
export async function polishMeetingTranscript(id: string) {
  try {
    const userId = await requireUserId();
    const meeting = await prisma.meeting.findFirst({ where: { id, userId }, select: { rawNotes: true, participants: true } });
    if (!meeting) return { success: false as const, message: "Reunião não encontrada." };
    const notes = meeting.rawNotes.trim();
    if (!notes) return { success: false as const, message: "Não há notas para polir." };
    if (notes.length > 28000) {
      return { success: false as const, message: "Notas longas demais para polir de uma vez (limite ~28k caracteres)." };
    }

    const config = await getAiCallConfig(userId);
    if (!config.configured) return { success: false as const, message: config.error ?? "IA não configurada." };

    const participants = parseStringList(meeting.participants);
    const systemPrompt = `Você revisa transcrições automáticas de reunião em português.
Corrija APENAS: pontuação, capitalização, palavras claramente mal transcritas (deduzíveis pelo contexto) e quebras de parágrafo.
PRESERVE: os carimbos de tempo [mm:ss] exatamente onde estão, a ordem das falas, gírias e o conteúdo integral — NÃO resuma, NÃO omita, NÃO invente.
${participants.length ? `Nomes citados na reunião (grafia correta): ${participants.join(", ")}.` : ""}
Responda SOMENTE com o texto corrigido, sem comentários.`;

    const { text: polished } = await callAIProvider(
      config.provider,
      config.model,
      systemPrompt,
      notes,
      [],
      config.keys,
    );

    const clean = polished?.trim();
    if (!clean) return { success: false as const, message: "A IA não devolveu o texto polido." };
    // Guarda-corpo: se o resultado encolheu demais, a IA resumiu — rejeita.
    if (clean.length < notes.length * 0.55) {
      return { success: false as const, message: "O polimento encurtou demais o texto — mantive o original." };
    }

    await prisma.meeting.updateMany({ where: { id, userId }, data: { rawNotes: clean } });
    revalidatePath("/projects");
    return { success: true as const, message: "Transcrição polida!", polished: clean, previous: meeting.rawNotes };
  } catch (error) {
    console.error("Erro ao polir transcrição:", error);
    const message = error instanceof Error ? error.message : "Falha ao polir a transcrição.";
    return { success: false as const, message };
  }
}

export async function deleteMeeting(id: string) {
  try {
    const userId = await requireUserId();
    await prisma.meeting.deleteMany({ where: { id, userId } });
    revalidatePath("/projects");
    return { success: true, message: "Reunião removida." };
  } catch (error) {
    console.error("Erro ao deletar reunião:", error);
    return { success: false, message: "Falha ao remover reunião." };
  }
}

// Anexa um trecho transcrito às notas (usado quando a gravação roda com o modal fechado).
export async function appendMeetingTranscript(meetingId: string, text: string) {
  try {
    if (!text?.trim()) return { success: false };
    const userId = await requireUserId();
    const m = await prisma.meeting.findFirst({ where: { id: meetingId, userId }, select: { rawNotes: true } });
    if (!m) return { success: false };
    const updated = (m.rawNotes ? m.rawNotes + "\n" : "") + text.trim();
    await prisma.meeting.updateMany({ where: { id: meetingId, userId }, data: { rawNotes: updated } });
    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    console.error("Erro ao anexar transcrição:", error);
    return { success: false };
  }
}

// Lê as notas mais recentes (para o editor abrir já sincronizado com o servidor).
export async function getMeetingNotes(id: string) {
  try {
    const userId = await requireUserId();
    const m = await prisma.meeting.findFirst({
      where: { id, userId },
      select: { rawNotes: true, summary: true, image: true, images: true, participants: true, tags: true, decisions: true },
    });
    if (!m) return { success: false as const };
    return {
      success: true as const,
      rawNotes: m.rawNotes,
      summary: m.summary,
      images: parseMeetingImages(m.images, m.image),
      participants: parseStringList(m.participants),
      tags: parseStringList(m.tags),
      decisions: parseStringList(m.decisions),
    };
  } catch (error) {
    console.error("Erro ao carregar reunião:", error);
    return { success: false as const };
  }
}

// Resume as notas da reunião usando a IA configurada pelo usuário.
export async function summarizeMeeting(id: string) {
  try {
    const userId = await requireUserId();
    const meeting = await prisma.meeting.findFirst({ where: { id, userId }, select: { rawNotes: true, title: true } });
    if (!meeting) return { success: false, message: "Reunião não encontrada." };
    if (!meeting.rawNotes.trim()) return { success: false, message: "Escreva as notas antes de resumir." };

    const config = await getAiCallConfig(userId);
    if (!config.configured) return { success: false, message: config.error ?? "IA não configurada." };

    const systemPrompt = `Você é um assistente que organiza notas de reunião do Life OS.
Receba as anotações cruas e produza, em português:
1. Um resumo curto (2-4 linhas) do que foi tratado.
2. Uma seção "Itens de ação:" listando as próximas tarefas, UMA POR LINHA começando com "- " (verbo no infinitivo, objetivas e curtas).
Não invente informações que não estejam nas notas. Não use ferramentas.`;

    // Reuniões longas (horas de transcrição) podem estourar o limite de tokens do
    // modelo. Se as notas forem muito grandes, mantemos início + fim (onde costumam
    // estar contexto e conclusões/decisões) e omitimos o miolo.
    const MAX_SUMMARY_CHARS = 24000;
    let notesForAI = meeting.rawNotes;
    let truncatedNote = "";
    if (notesForAI.length > MAX_SUMMARY_CHARS) {
      const head = notesForAI.slice(0, Math.floor(MAX_SUMMARY_CHARS * 0.4));
      const tail = notesForAI.slice(notesForAI.length - Math.floor(MAX_SUMMARY_CHARS * 0.55));
      notesForAI = `${head}\n\n[...trecho intermediário omitido por tamanho...]\n\n${tail}`;
      truncatedNote = " (notas longas: resumo baseado no início e no fim da reunião)";
    }

    const { text: summary } = await callAIProvider(
      config.provider,
      config.model,
      systemPrompt,
      `Notas da reunião "${meeting.title}":\n\n${notesForAI}`,
      [],
      config.keys,
    );

    await prisma.meeting.updateMany({ where: { id, userId }, data: { summary } });

    revalidatePath("/projects");
    return { success: true, message: `Resumo gerado!${truncatedNote}`, summary };
  } catch (error) {
    console.error("Erro ao resumir reunião:", error);
    const message = error instanceof Error ? error.message : "Falha ao resumir.";
    return { success: false, message };
  }
}

// Converte os "Itens de ação" do resumo em tarefas no projeto da reunião (ou Inbox).
export async function createTasksFromMeeting(id: string) {
  try {
    const userId = await requireUserId();
    const meeting = await prisma.meeting.findFirst({ where: { id, userId }, select: { summary: true, projectId: true } });
    if (!meeting) return { success: false, message: "Reunião não encontrada." };
    if (!meeting.summary) return { success: false, message: "Gere o resumo primeiro." };

    // Extrai linhas que parecem itens de ação (bullets ou numeradas).
    const items = parseActionItems(meeting.summary);

    if (items.length === 0) return { success: false, message: "Nenhum item de ação encontrado no resumo." };

    await prisma.task.createMany({
      data: items.map((title) => ({
        title,
        projectId: meeting.projectId,
        userId,
        priority: "MEDIUM",
        status: "TODO",
        progress: 0,
        isPinned: false,
        isStarred: false,
      })),
    });

    revalidatePath("/projects");
    return { success: true, message: `${items.length} tarefa(s) criada(s) a partir da reunião!`, count: items.length };
  } catch (error) {
    console.error("Erro ao gerar tarefas da reunião:", error);
    return { success: false, message: "Falha ao gerar tarefas." };
  }
}
