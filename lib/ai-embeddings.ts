// RAG local (#3 do roadmap de IA): busca semântica sobre os dados do próprio
// Life OS. Embeddings via Ollama (nomic-embed-text, grátis e local) ou OpenAI
// (text-embedding-3-small) quando houver chave. SQLite não tem pgvector —
// vetores ficam como JSON em AiEmbedding e o cosseno roda em memória, o que
// resolve com folga a escala pessoal (<50k registros).
//
// Princípios: índice BOUNDED (top-N recentes por tipo), falha graciosa (sem
// provedor de embedding → o tool explica e o modelo cai na busca por texto).

import { prisma } from "@/lib/prisma";
import { decryptKey } from "@/lib/settings-crypto";
import { isEphemeralServerless } from "@/lib/db-config";

const INDEX_PER_TYPE = 150;   // registros recentes indexados por tipo
const BATCH = 16;             // textos por lote de embedding
const TOP_K_DEFAULT = 8;

export type EmbeddableType = "TRANSACTION" | "NOTE" | "TASK" | "MEAL" | "WORKOUT";

interface EmbeddingProvider {
  name: string;
  embed: (texts: string[]) => Promise<number[][]>;
}

/* ----------------------------------------------------------------------------
   Provedor de embedding: Ollama local primeiro; OpenAI como alternativa.
   ---------------------------------------------------------------------------- */

async function ollamaProvider(): Promise<EmbeddingProvider | null> {
  if (isEphemeralServerless()) return null; // sem Ollama em serverless
  const base = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
  try {
    const ping = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!ping.ok) return null;
  } catch {
    return null;
  }
  return {
    name: "ollama/nomic-embed-text",
    embed: async (texts) => {
      const out: number[][] = [];
      for (const text of texts) {
        const res = await fetch(`${base}/api/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
        });
        if (!res.ok) throw new Error("Falha no embedding do Ollama (rode: ollama pull nomic-embed-text).");
        const data = (await res.json()) as { embedding?: number[] };
        if (!data.embedding?.length) throw new Error("Embedding vazio do Ollama.");
        out.push(data.embedding);
      }
      return out;
    },
  };
}

function openAiProvider(apiKey: string): EmbeddingProvider {
  return {
    name: "openai/text-embedding-3-small",
    embed: async (texts) => {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
      });
      if (!res.ok) throw new Error("Falha no embedding da OpenAI.");
      const data = (await res.json()) as { data?: { index: number; embedding: number[] }[] };
      const rows = [...(data.data ?? [])].sort((a, b) => a.index - b.index);
      if (rows.length !== texts.length) throw new Error("Resposta de embedding incompleta.");
      return rows.map((r) => r.embedding);
    },
  };
}

/** Resolve o provedor disponível para o usuário (null = recurso indisponível). */
async function resolveProvider(userId: string): Promise<EmbeddingProvider | null> {
  const local = await ollamaProvider();
  if (local) return local;
  const settings = await prisma.settings.findUnique({ where: { userId }, select: { openaiKey: true } });
  const key = decryptKey(settings?.openaiKey) || process.env.OPENAI_API_KEY;
  return key ? openAiProvider(key) : null;
}

/* ----------------------------------------------------------------------------
   Projeções: o texto compacto que representa cada registro no índice.
   ---------------------------------------------------------------------------- */

interface IndexCandidate {
  entityType: EmbeddableType;
  entityId: string;
  text: string;
}

async function collectCandidates(userId: string): Promise<IndexCandidate[]> {
  const [transactions, notes, tasks, meals, workouts] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, deletedAt: null }, orderBy: { date: "desc" }, take: INDEX_PER_TYPE,
      select: { id: true, description: true, category: true, type: true, amount: true, date: true },
    }),
    prisma.studyNote.findMany({
      where: { userId }, orderBy: { updatedAt: "desc" }, take: INDEX_PER_TYPE,
      select: { id: true, title: true, content: true },
    }),
    prisma.task.findMany({
      where: { userId, deletedAt: null }, orderBy: { createdAt: "desc" }, take: INDEX_PER_TYPE,
      select: { id: true, title: true, description: true, status: true },
    }),
    prisma.meal.findMany({
      where: { userId }, orderBy: { date: "desc" }, take: INDEX_PER_TYPE,
      select: { id: true, title: true, items: true, type: true, calories: true, date: true },
    }),
    prisma.workout.findMany({
      where: { userId }, orderBy: { date: "desc" }, take: INDEX_PER_TYPE,
      select: { id: true, title: true, type: true, notes: true, date: true },
    }),
  ]);

  const day = (d: Date) => d.toISOString().slice(0, 10);
  const out: IndexCandidate[] = [];
  for (const t of transactions) {
    out.push({ entityType: "TRANSACTION", entityId: t.id, text: `${t.type === "INCOME" ? "Receita" : "Gasto"} de R$${Number(t.amount).toFixed(2)} em ${t.category}: ${t.description} (${day(t.date)})` });
  }
  for (const n of notes) {
    out.push({ entityType: "NOTE", entityId: n.id, text: `Nota "${n.title}": ${n.content.replace(/<[^>]+>/g, " ").slice(0, 400)}` });
  }
  for (const t of tasks) {
    out.push({ entityType: "TASK", entityId: t.id, text: `Tarefa [${t.status}] ${t.title}${t.description ? `: ${t.description.slice(0, 200)}` : ""}` });
  }
  for (const m of meals) {
    out.push({ entityType: "MEAL", entityId: m.id, text: `Refeição ${m.type} "${m.title}"${m.items ? `: ${m.items.slice(0, 200)}` : ""}${m.calories ? ` (${m.calories} kcal)` : ""} em ${day(m.date)}` });
  }
  for (const w of workouts) {
    out.push({ entityType: "WORKOUT", entityId: w.id, text: `Treino ${w.type} "${w.title}"${w.notes ? `: ${w.notes.slice(0, 200)}` : ""} em ${day(w.date)}` });
  }
  return out;
}

/* ----------------------------------------------------------------------------
   Indexação incremental (só o que ainda não tem vetor) + busca por cosseno
   ---------------------------------------------------------------------------- */

async function syncIndex(userId: string, provider: EmbeddingProvider): Promise<number> {
  const candidates = await collectCandidates(userId);
  const existing = await prisma.aiEmbedding.findMany({
    where: { userId },
    select: { entityType: true, entityId: true },
  });
  const have = new Set(existing.map((e) => `${e.entityType}:${e.entityId}`));
  const missing = candidates.filter((c) => !have.has(`${c.entityType}:${c.entityId}`));
  if (missing.length === 0) return 0;

  let indexed = 0;
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    const vectors = await provider.embed(batch.map((b) => b.text));
    await prisma.$transaction(
      batch.map((b, j) =>
        prisma.aiEmbedding.upsert({
          where: { userId_entityType_entityId: { userId, entityType: b.entityType, entityId: b.entityId } },
          update: { text: b.text, vector: JSON.stringify(vectors[j]) },
          create: { userId, entityType: b.entityType, entityId: b.entityId, text: b.text, vector: JSON.stringify(vectors[j]) },
        })
      )
    );
    indexed += batch.length;
  }
  return indexed;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export interface SemanticHit {
  tipo: EmbeddableType;
  id: string;
  trecho: string;
  similaridade: number;
}

/**
 * Busca semântica: garante o índice (incremental) e ranqueia por cosseno.
 * Retorno pronto para a tool — inclui erro amigável quando não há provedor.
 */
export async function semanticSearch(userId: string, query: string, topK = TOP_K_DEFAULT): Promise<Record<string, unknown>> {
  const q = query.trim();
  if (!q) return { erro: "Informe a consulta (query)." };

  const provider = await resolveProvider(userId);
  if (!provider) {
    return {
      erro: "Busca semântica indisponível: requer Ollama local (ollama pull nomic-embed-text) ou uma API key da OpenAI. Use query_system_data com search como alternativa.",
    };
  }

  const indexed = await syncIndex(userId, provider);
  const [qVector] = await provider.embed([q]);

  const rows = await prisma.aiEmbedding.findMany({
    where: { userId },
    select: { entityType: true, entityId: true, text: true, vector: true },
  });

  const hits: SemanticHit[] = [];
  for (const r of rows) {
    let v: number[];
    try { v = JSON.parse(r.vector) as number[]; } catch { continue; }
    hits.push({
      tipo: r.entityType as EmbeddableType,
      id: r.entityId,
      trecho: r.text,
      similaridade: Number(cosine(qVector, v).toFixed(3)),
    });
  }
  hits.sort((a, b) => b.similaridade - a.similaridade);

  return {
    provedor: provider.name,
    indexados_agora: indexed,
    total_no_indice: rows.length,
    resultados: hits.slice(0, Math.min(Math.max(topK, 1), 15)),
  };
}
