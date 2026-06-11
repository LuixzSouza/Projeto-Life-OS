"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { ensureInbox } from "./notebook-actions";

export interface NoteData {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  tags: string | null;
  isFavorite: boolean;
  notebookId: string | null;
  notebookName: string | null;
  notebookColor: string | null;
  subjectId: string | null;
  subjectTitle: string | null;
  subjectColor: string | null;
  projectId: string | null;
  projectTitle: string | null;
  projectColor: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface NoteSubject {
  id: string;
  title: string;
}

export interface NoteProject {
  id: string;
  title: string;
  color: string | null;
  slug: string;
}

export interface NoteVersionData {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

// Quantas versões manter por anotação (poda as mais antigas).
const MAX_VERSIONS_PER_NOTE = 30;

// Include padrão para resolver caderno/matéria/projeto numa nota.
const NOTE_INCLUDE = {
  subject: { select: { title: true, color: true } },
  notebook: { select: { name: true, color: true } },
  project: { select: { title: true, color: true } },
} as const;

type NoteRow = Awaited<ReturnType<typeof fetchNoteRow>>;
async function fetchNoteRow(id: string, userId: string) {
  return prisma.studyNote.findFirst({ where: { id, userId, deletedAt: null }, include: NOTE_INCLUDE });
}

// Converte uma linha do Prisma (com include) no DTO NoteData.
function mapNote(n: NonNullable<NoteRow>): NoteData {
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    summary: n.summary,
    tags: n.tags,
    isFavorite: n.isFavorite,
    notebookId: n.notebookId,
    notebookName: n.notebook?.name ?? null,
    notebookColor: n.notebook?.color ?? null,
    subjectId: n.subjectId,
    subjectTitle: n.subject?.title ?? null,
    subjectColor: n.subject?.color ?? null,
    projectId: n.projectId,
    projectTitle: n.project?.title ?? null,
    projectColor: n.project?.color ?? null,
    updatedAt: n.updatedAt.toISOString(),
    createdAt: n.createdAt.toISOString(),
  };
}

// Lê um campo do FormData, normaliza vazio para null.
function field(formData: FormData, key: string): string | null {
  const v = (formData.get(key) as string | null)?.trim();
  return v ? v : null;
}

// Resolve a matéria vinculada garantindo que pertence ao usuário (senão fica solta).
async function resolveSubjectId(formData: FormData, userId: string): Promise<string | null> {
  const subjectId = field(formData, "subjectId");
  if (!subjectId || subjectId === "none") return null;
  const owned = await prisma.studySubject.findFirst({ where: { id: subjectId, userId }, select: { id: true } });
  return owned ? subjectId : null;
}

// Resolve o projeto vinculado garantindo que pertence ao usuário.
async function resolveProjectId(formData: FormData, userId: string): Promise<string | null> {
  const projectId = field(formData, "projectId");
  if (!projectId || projectId === "none") return null;
  const owned = await prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null }, select: { id: true } });
  return owned ? projectId : null;
}

// Resolve o caderno; sem caderno válido cai na Entrada (Inbox).
async function resolveNotebookId(formData: FormData, userId: string): Promise<string> {
  const notebookId = field(formData, "notebookId");
  if (notebookId && notebookId !== "inbox") {
    const owned = await prisma.notebook.findFirst({ where: { id: notebookId, userId }, select: { id: true } });
    if (owned) return owned.id;
  }
  return ensureInbox(userId);
}

/** Lista as anotações vivas (não na lixeira) do usuário. */
export async function getNotes(): Promise<NoteData[]> {
  const userId = await requireUserId();
  const rows = await prisma.studyNote.findMany({
    where: { userId, deletedAt: null },
    orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    include: NOTE_INCLUDE,
  });
  return rows.map(mapNote);
}

/** Busca uma única nota (para a edição em tela cheia). */
export async function getNote(id: string): Promise<NoteData | null> {
  const userId = await requireUserId();
  const row = await fetchNoteRow(id, userId);
  return row ? mapNote(row) : null;
}

/** Backlinks: notas cujo conteúdo menciona/linka esta nota (/notes/{id}). */
export async function getNoteBacklinks(noteId: string): Promise<{ id: string; title: string }[]> {
  const userId = await requireUserId();
  const rows = await prisma.studyNote.findMany({
    where: {
      userId,
      deletedAt: null,
      id: { not: noteId },
      content: { contains: `/notes/${noteId}` },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true },
  });
  return rows;
}

/** Backlinks de projeto: notas cujo conteúdo menciona/linka este projeto (/projects/{slug}). */
export async function getProjectBacklinks(slug: string): Promise<{ id: string; title: string }[]> {
  const userId = await requireUserId();
  if (!slug) return [];
  const rows = await prisma.studyNote.findMany({
    where: {
      userId,
      deletedAt: null,
      content: { contains: `/projects/${slug}` },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true },
  });
  return rows;
}

/** Notas vinculadas a um projeto (para a aba Notas do projeto). */
export async function getNotesForProject(projectId: string): Promise<NoteData[]> {
  const userId = await requireUserId();
  const rows = await prisma.studyNote.findMany({
    where: { userId, projectId, deletedAt: null },
    orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    include: NOTE_INCLUDE,
  });
  return rows.map(mapNote);
}

/** Matérias do usuário (para o seletor opcional ao criar/editar uma anotação). */
export async function getNoteSubjects(): Promise<NoteSubject[]> {
  const userId = await requireUserId();
  const subjects = await prisma.studySubject.findMany({
    where: { userId },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });
  return subjects;
}

/** Projetos do usuário (para vincular uma nota a um projeto). */
export async function getNoteProjects(): Promise<NoteProject[]> {
  const userId = await requireUserId();
  const projects = await prisma.project.findMany({
    where: { userId, deletedAt: null },
    orderBy: { title: "asc" },
    select: { id: true, title: true, color: true, slug: true },
  });
  return projects;
}

/**
 * Cria uma nota em branco e devolve o id — usado pelo fluxo "Nova nota" que
 * navega direto para a edição em tela cheia (/notes/[id]).
 */
export async function createBlankNote(
  opts?: { notebookId?: string; projectId?: string },
): Promise<{ success: boolean; id?: string; message: string }> {
  try {
    const userId = await requireUserId();
    let notebookId: string;
    if (opts?.notebookId && opts.notebookId !== "inbox") {
      const owned = await prisma.notebook.findFirst({ where: { id: opts.notebookId, userId }, select: { id: true } });
      notebookId = owned ? owned.id : await ensureInbox(userId);
    } else {
      notebookId = await ensureInbox(userId);
    }
    let projectId: string | null = null;
    if (opts?.projectId) {
      const owned = await prisma.project.findFirst({ where: { id: opts.projectId, userId, deletedAt: null }, select: { id: true } });
      projectId = owned ? owned.id : null;
    }
    const created = await prisma.studyNote.create({
      data: { userId, title: "Nova nota", content: "", notebookId, projectId },
    });
    revalidatePath("/notes");
    return { success: true, id: created.id, message: "Nota criada." };
  } catch (error) {
    console.error("Erro ao criar nota em branco:", error);
    return { success: false, message: "Falha ao criar a nota." };
  }
}

export async function createNote(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const title = field(formData, "title");
    if (!title) return { success: false, message: "O título é obrigatório." };

    const subjectId = await resolveSubjectId(formData, userId);
    const notebookId = await resolveNotebookId(formData, userId);
    const projectId = await resolveProjectId(formData, userId);
    const created = await prisma.studyNote.create({
      data: {
        userId,
        title,
        content: field(formData, "content") ?? "",
        tags: field(formData, "tags"),
        isFavorite: formData.get("isFavorite") === "true",
        subjectId,
        notebookId,
        projectId,
      },
    });

    await logActivity({
      action: "CREATE",
      module: "studies",
      entityType: "note",
      entityId: created.id,
      summary: `Criou a anotação "${created.title}"`,
    });

    revalidatePath("/notes");
    return { success: true, message: "Anotação criada." };
  } catch (error) {
    console.error("Erro ao criar anotação:", error);
    return { success: false, message: "Falha ao criar a anotação." };
  }
}

/**
 * Sobe uma imagem (data URL) para a tabela NoteImage e devolve uma URL curta
 * (/api/note-image/{id}). Mantém o Base64 fora do texto da nota.
 */
export async function uploadNoteImage(
  dataUrl: string,
  noteId?: string,
): Promise<{ success: boolean; url?: string; message: string }> {
  try {
    const userId = await requireUserId();
    const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
    if (!m) return { success: false, message: "Formato de imagem inválido." };
    const [, mime, data] = m;

    let ownedNoteId: string | null = null;
    if (noteId) {
      const owned = await prisma.studyNote.findFirst({ where: { id: noteId, userId }, select: { id: true } });
      ownedNoteId = owned ? owned.id : null;
    }

    const img = await prisma.noteImage.create({
      data: { mime, data, userId, noteId: ownedNoteId },
      select: { id: true },
    });
    return { success: true, url: `/api/note-image/${img.id}`, message: "Imagem salva." };
  } catch (error) {
    console.error("Erro ao subir imagem da nota:", error);
    return { success: false, message: "Falha ao salvar a imagem." };
  }
}

export interface NoteFlashcardsResult {
  success: boolean;
  message: string;
  /** Deck onde os cards entraram (deep-link p/ estudar na hora). */
  deckId: string | null;
  created: number;
}

/**
 * Gera flashcards desta nota com a IA (mesmo motor do chat, generateFlashcards)
 * e devolve o deck para o editor oferecer "Estudar agora". Sem IA configurada,
 * a mensagem orienta — nada quebra.
 */
export async function generateNoteFlashcards(noteId: string): Promise<NoteFlashcardsResult> {
  try {
    const userId = await requireUserId();
    const { generateFlashcards } = await import("@/lib/ai-creative");
    const res = await generateFlashcards(userId, noteId, 8);

    if (typeof res.erro === "string") {
      return { success: false, message: res.erro, deckId: null, created: 0 };
    }
    const created = typeof res.cards_criados === "number" ? res.cards_criados : 0;
    const deckId = typeof res.deck_id === "string" ? res.deck_id : null;

    await logActivity({
      action: "CREATE",
      module: "studies",
      entityType: "flashcard-deck",
      entityId: deckId ?? noteId,
      summary: `Gerou ${created} flashcards a partir de uma nota`,
    });

    revalidatePath("/flashcards");
    return {
      success: true,
      message: `${created} flashcard${created > 1 ? "s" : ""} criado${created > 1 ? "s" : ""} no deck "${String(res.deck ?? "")}".`,
      deckId,
      created,
    };
  } catch (error) {
    console.error("Erro ao gerar flashcards da nota:", error);
    return { success: false, message: "Falha ao gerar os flashcards.", deckId: null, created: 0 };
  }
}

/**
 * Reincorpora as imagens (/api/note-image/{id}) como data:base64 no conteúdo.
 * Usado na exportação Markdown, para o arquivo ser portátil fora do app.
 */
export async function inlineNoteImages(content: string): Promise<string> {
  try {
    const userId = await requireUserId();
    const ids = Array.from(content.matchAll(/\/api\/note-image\/([^)\s]+)/g)).map((m) => m[1]);
    if (ids.length === 0) return content;

    const imgs = await prisma.noteImage.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true, mime: true, data: true },
    });
    let out = content;
    for (const img of imgs) {
      out = out.split(`/api/note-image/${img.id}`).join(`data:${img.mime};base64,${img.data}`);
    }
    return out;
  } catch (error) {
    console.error("Erro ao reincorporar imagens:", error);
    return content;
  }
}

/**
 * Varre todas as notas vivas e move imagens base64 inline (data:) do texto para
 * a tabela NoteImage, trocando por URLs curtas. Deixa as notas antigas leves.
 */
export async function optimizeAllNoteImages(): Promise<{ success: boolean; movedImages: number; affectedNotes: number; message: string }> {
  try {
    const userId = await requireUserId();
    const notes = await prisma.studyNote.findMany({
      where: { userId, deletedAt: null, content: { contains: "data:image" } },
      select: { id: true, content: true },
    });

    let movedImages = 0;
    let affectedNotes = 0;
    for (const note of notes) {
      let content = note.content;
      let changed = false;
      const matches = Array.from(content.matchAll(/!\[[^\]]*\]\((data:image\/[^)]+)\)/g));
      for (const mt of matches) {
        const dataUrl = mt[1];
        const parsed = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
        if (!parsed) continue;
        if (!content.includes(dataUrl)) continue; // já substituída (imagem repetida)
        const img = await prisma.noteImage.create({
          data: { mime: parsed[1], data: parsed[2], userId, noteId: note.id },
          select: { id: true },
        });
        content = content.split(dataUrl).join(`/api/note-image/${img.id}`);
        movedImages++;
        changed = true;
      }
      if (changed) {
        await prisma.studyNote.update({ where: { id: note.id }, data: { content } });
        affectedNotes++;
      }
    }

    revalidatePath("/notes");
    const message = movedImages > 0
      ? `${movedImages} ${movedImages === 1 ? "imagem movida" : "imagens movidas"} em ${affectedNotes} ${affectedNotes === 1 ? "nota" : "notas"}.`
      : "Nenhuma imagem inline para otimizar.";
    return { success: true, movedImages, affectedNotes, message };
  } catch (error) {
    console.error("Erro ao otimizar imagens em massa:", error);
    return { success: false, movedImages: 0, affectedNotes: 0, message: "Falha ao otimizar imagens." };
  }
}

/** Remove uma imagem incorporada (registro NoteImage). */
export async function deleteNoteImage(id: string): Promise<{ success: boolean }> {
  try {
    const userId = await requireUserId();
    await prisma.noteImage.deleteMany({ where: { id, userId } });
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Captura rápida: cria uma nota a partir de um texto solto. O título é a
 * primeira linha (truncada) e o restante vira o conteúdo. Cai no caderno
 * indicado ou na Entrada (Inbox).
 */
export async function quickCaptureNote(
  text: string,
  notebookId?: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const clean = text.trim();
    if (!clean) return { success: false, message: "Escreva algo para capturar." };

    const firstLine = clean.split("\n")[0].trim();
    const title = (firstLine.length > 80 ? firstLine.slice(0, 80) + "…" : firstLine) || "Nota rápida";
    const content = clean.slice(firstLine.length).trim();

    let targetNotebook: string;
    if (notebookId && notebookId !== "inbox") {
      const owned = await prisma.notebook.findFirst({ where: { id: notebookId, userId }, select: { id: true } });
      targetNotebook = owned ? owned.id : await ensureInbox(userId);
    } else {
      targetNotebook = await ensureInbox(userId);
    }

    const created = await prisma.studyNote.create({
      data: { userId, title, content, notebookId: targetNotebook },
    });

    await logActivity({
      action: "CREATE",
      module: "studies",
      entityType: "note",
      entityId: created.id,
      summary: `Captura rápida: "${created.title}"`,
    });

    revalidatePath("/notes");
    return { success: true, message: "Nota capturada." };
  } catch (error) {
    console.error("Erro na captura rápida:", error);
    return { success: false, message: "Falha ao capturar a nota." };
  }
}

export async function updateNote(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const id = field(formData, "id");
    const title = field(formData, "title");
    if (!id || !title) return { success: false, message: "Dados inválidos." };

    const subjectId = await resolveSubjectId(formData, userId);
    const notebookId = await resolveNotebookId(formData, userId);
    const projectId = await resolveProjectId(formData, userId);
    const newContent = field(formData, "content") ?? "";

    // Snapshot da versão anterior antes de sobrescrever (só se algo mudou no texto).
    const current = await prisma.studyNote.findFirst({
      where: { id, userId },
      select: { title: true, content: true },
    });
    if (current && (current.content !== newContent || current.title !== title)) {
      await snapshotNoteVersion(id, userId, current.title, current.content);
    }

    await prisma.studyNote.updateMany({
      where: { id, userId },
      data: {
        title,
        content: newContent,
        tags: field(formData, "tags"),
        isFavorite: formData.get("isFavorite") === "true",
        subjectId,
        notebookId,
        projectId,
      },
    });

    revalidatePath("/notes");
    if (projectId) revalidatePath(`/projects`);
    return { success: true, message: "Anotação atualizada." };
  } catch (error) {
    console.error("Erro ao atualizar anotação:", error);
    return { success: false, message: "Falha ao atualizar a anotação." };
  }
}

/** Soft-delete: a anotação vai para a Lixeira. Restaurar/excluir: ver /trash. */
export async function deleteNote(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const note = await prisma.studyNote.findFirst({ where: { id, userId, deletedAt: null }, select: { title: true } });
    await prisma.studyNote.updateMany({ where: { id, userId }, data: { deletedAt: new Date() } });

    await logActivity({
      action: "DELETE",
      module: "studies",
      entityType: "note",
      entityId: id,
      summary: note ? `Moveu "${note.title}" para a lixeira` : "Removeu uma anotação",
    });

    revalidatePath("/notes");
    return { success: true, message: "Anotação movida para a lixeira." };
  } catch (error) {
    console.error("Erro ao excluir anotação:", error);
    return { success: false, message: "Falha ao excluir a anotação." };
  }
}

export async function toggleNoteFavorite(id: string, current: boolean): Promise<{ success: boolean }> {
  try {
    const userId = await requireUserId();
    await prisma.studyNote.updateMany({ where: { id, userId }, data: { isFavorite: !current } });
    revalidatePath("/notes");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ───────────────────────────── Histórico de versões ─────────────────────────────

/** Salva um snapshot e poda o histórico para no máximo MAX_VERSIONS_PER_NOTE. */
async function snapshotNoteVersion(noteId: string, userId: string, title: string, content: string) {
  await prisma.studyNoteVersion.create({ data: { noteId, userId, title, content } });

  const old = await prisma.studyNoteVersion.findMany({
    where: { noteId, userId },
    orderBy: { createdAt: "desc" },
    skip: MAX_VERSIONS_PER_NOTE,
    select: { id: true },
  });
  if (old.length > 0) {
    await prisma.studyNoteVersion.deleteMany({ where: { id: { in: old.map((v) => v.id) } } });
  }
}

/** Lista o histórico de versões de uma anotação (mais recente primeiro). */
export async function getNoteVersions(noteId: string): Promise<NoteVersionData[]> {
  const userId = await requireUserId();
  const rows = await prisma.studyNoteVersion.findMany({
    where: { noteId, userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, content: true, createdAt: true },
  });
  return rows.map((v) => ({
    id: v.id,
    title: v.title,
    content: v.content,
    createdAt: v.createdAt.toISOString(),
  }));
}

/** Restaura uma versão: guarda a atual como nova versão e aplica o snapshot na nota. */
export async function restoreNoteVersion(
  noteId: string,
  versionId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const version = await prisma.studyNoteVersion.findFirst({
      where: { id: versionId, noteId, userId },
      select: { title: true, content: true },
    });
    if (!version) return { success: false, message: "Versão não encontrada." };

    const current = await prisma.studyNote.findFirst({
      where: { id: noteId, userId },
      select: { title: true, content: true },
    });
    if (!current) return { success: false, message: "Anotação não encontrada." };

    // Preserva o estado atual antes de sobrescrever, para a restauração ser reversível.
    if (current.content !== version.content || current.title !== version.title) {
      await snapshotNoteVersion(noteId, userId, current.title, current.content);
    }

    await prisma.studyNote.updateMany({
      where: { id: noteId, userId },
      data: { title: version.title, content: version.content },
    });

    await logActivity({
      action: "UPDATE",
      module: "studies",
      entityType: "note",
      entityId: noteId,
      summary: `Restaurou uma versão de "${version.title}"`,
    });

    revalidatePath("/notes");
    return { success: true, message: "Versão restaurada." };
  } catch (error) {
    console.error("Erro ao restaurar versão:", error);
    return { success: false, message: "Falha ao restaurar a versão." };
  }
}
