"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ensureInbox } from "./notebook-actions";

// =========================================================
// MAPAS DE CONTEÚDO (#9, Fase 2 — Zettelkasten)
// =========================================================
// Um Mapa de Conteúdo (MOC) é uma nota-sumário que agrupa as notas atômicas de
// um tema (tag ou matéria). Gerado automaticamente com links /notes/{id} — que
// já alimentam backlinks e o Grafo de Conexões. O mapa nasce favorito (nunca
// "apodrece" no Digital Rot e fica no topo da listagem).

export interface MapSource {
  kind: "tag" | "subject";
  value: string; // tag normalizada ou subjectId
  label: string;
  count: number;
}

function parseTags(tags: string | null): string[] {
  return tags ? tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) : [];
}

/** Temas disponíveis para virar mapa (tags e matérias com 2+ notas). */
export async function getMapSources(): Promise<MapSource[]> {
  const userId = await requireUserId();
  const notes = await prisma.studyNote.findMany({
    where: { userId, deletedAt: null },
    select: { tags: true, subjectId: true, subject: { select: { title: true } } },
  });

  const tagCount = new Map<string, number>();
  const subjCount = new Map<string, { label: string; count: number }>();
  for (const n of notes) {
    for (const t of parseTags(n.tags)) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    if (n.subjectId && n.subject) {
      const cur = subjCount.get(n.subjectId);
      subjCount.set(n.subjectId, { label: n.subject.title, count: (cur?.count ?? 0) + 1 });
    }
  }

  const sources: MapSource[] = [
    ...Array.from(tagCount, ([value, count]): MapSource => ({ kind: "tag", value, label: `#${value}`, count })),
    ...Array.from(subjCount, ([value, v]): MapSource => ({ kind: "subject", value, label: v.label, count: v.count })),
  ];
  return sources.filter((s) => s.count >= 2 && s.label !== "#mapa" && s.label !== "#diário").sort((a, b) => b.count - a.count);
}

/** Cria (ou atualiza) o Mapa de Conteúdo de um tema e devolve o id da nota. */
export async function createContentMap(source: MapSource): Promise<{ success: boolean; id?: string; message: string }> {
  try {
    const userId = await requireUserId();

    const notes = await prisma.studyNote.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(source.kind === "subject"
          ? { subjectId: source.value }
          : { tags: { contains: source.value } }),
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, tags: true, summary: true },
    });

    // "contains" do SQLite é frouxo p/ tags (ex.: "ia" acha "diaria") — refina em memória.
    const matched = source.kind === "tag"
      ? notes.filter((n) => parseTags(n.tags).includes(source.value))
      : notes;
    if (matched.length < 2) return { success: false, message: "Tema com poucas notas para um mapa (mínimo 2)." };

    const mapTitle = `🗺️ Mapa — ${source.kind === "tag" ? `#${source.value}` : source.label}`;
    const lines = matched
      .filter((n) => !n.title.startsWith("🗺️"))
      .map((n) => `- [${n.title}](/notes/${n.id})${n.summary ? ` — ${n.summary}` : ""}`);
    const content = [
      `> Mapa de Conteúdo: o ponto de entrada do tema **${source.label}**. `,
      `> Atualize com **Mapa de Conteúdo** na página de Notas (regenera a lista).`,
      ``,
      `## Notas do tema (${lines.length})`,
      ...lines,
      ``,
      `## Síntese`,
      `_O que essas notas dizem juntas? Escreva aqui a visão de cima._`,
    ].join("\n");

    // Regenerar: se o mapa já existe, atualiza a lista preservando o título.
    const existing = await prisma.studyNote.findFirst({
      where: { userId, deletedAt: null, title: mapTitle },
      select: { id: true },
    });
    if (existing) {
      await prisma.studyNote.updateMany({ where: { id: existing.id, userId }, data: { content } });
      revalidatePath("/notes");
      return { success: true, id: existing.id, message: "Mapa atualizado com as notas atuais." };
    }

    const inbox = await ensureInbox(userId);
    const created = await prisma.studyNote.create({
      data: { userId, title: mapTitle, content, tags: "mapa", isFavorite: true, notebookId: inbox },
      select: { id: true },
    });
    revalidatePath("/notes");
    return { success: true, id: created.id, message: "Mapa de Conteúdo criado." };
  } catch (error) {
    console.error("Erro ao criar Mapa de Conteúdo:", error);
    return { success: false, message: "Falha ao criar o mapa." };
  }
}
