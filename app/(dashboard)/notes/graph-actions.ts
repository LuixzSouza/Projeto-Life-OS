"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

// =========================================================
// GRAFO DE CONEXÕES (#2, Fase 2 — Segundo Cérebro)
// =========================================================
// Nós = notas vivas. Arestas vêm de DUAS fontes já existentes (nada novo no banco):
//   1. Links no texto: menções "/notes/{id}" dentro do conteúdo (mesma fonte dos backlinks)
//   2. EntityLink note↔note (o "tecido conectivo")

export interface GraphNode {
  id: string;
  title: string;
  /** Cor do caderno (agrupa visualmente). */
  color: string;
  notebookName: string | null;
  isFavorite: boolean;
  /** Grau (nº de conexões) — dimensiona o nó. */
  degree: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  /** "mention" = link no texto · "link" = EntityLink explícito */
  kind: "mention" | "link";
}

export interface NoteGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const NOTE_LINK_RE = /\/notes\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g;

export async function getNoteGraph(): Promise<NoteGraph> {
  const userId = await requireUserId();

  const [notes, entityLinks] = await Promise.all([
    prisma.studyNote.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true, title: true, content: true, isFavorite: true,
        notebook: { select: { name: true, color: true } },
      },
    }),
    prisma.entityLink.findMany({
      where: { userId, fromType: "note", toType: "note" },
      select: { fromId: true, toId: true },
    }),
  ]);

  const known = new Set(notes.map((n) => n.id));
  const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];

  const pushEdge = (source: string, target: string, kind: GraphEdge["kind"]) => {
    if (source === target || !known.has(source) || !known.has(target)) return;
    const key = edgeKey(source, target);
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ source, target, kind });
  };

  // 1) Menções no texto (mesma convenção dos backlinks: /notes/{uuid}).
  for (const n of notes) {
    for (const m of n.content.matchAll(NOTE_LINK_RE)) pushEdge(n.id, m[1], "mention");
  }
  // 2) Conexões explícitas do tecido conectivo.
  for (const l of entityLinks) pushEdge(l.fromId, l.toId, "link");

  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }

  const nodes: GraphNode[] = notes.map((n) => ({
    id: n.id,
    title: n.title,
    color: n.notebook?.color ?? "#64748b",
    notebookName: n.notebook?.name ?? null,
    isFavorite: n.isFavorite,
    degree: degree.get(n.id) ?? 0,
  }));

  return { nodes, edges };
}
