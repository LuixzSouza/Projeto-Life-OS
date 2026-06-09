// Serendipidade Ativa (Roadmap Fase 3 — #14).
// Dado a nota aberta e as demais notas do usuário, encontra "notas antigas que
// se conectam": mesmo assunto, tags em comum e sobreposição de vocabulário no
// título/conteúdo. Puro (sem IO) — a página alimenta com o que já buscou.

export interface SerendipityCandidate {
  id: string;
  title: string;
  tags: string | null;
  subjectId: string | null;
  content: string;
  updatedAt: string;
}

export interface RelatedNote {
  id: string;
  title: string;
  /** Por que ela apareceu (ex.: "2 tags em comum", "tema parecido"). */
  reason: string;
}

const STOPWORDS = new Set([
  "para", "como", "que", "com", "uma", "umas", "uns", "dos", "das", "nos", "nas",
  "por", "mais", "menos", "muito", "sobre", "este", "esta", "isso", "aquele",
  "aquela", "ser", "ter", "fazer", "quando", "onde", "porque", "entre", "depois",
  "antes", "ainda", "também", "tambem", "the", "and", "for", "with", "from",
  "this", "that", "nota", "notas", "anotação", "anotacao",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Extrai palavras significativas (≥4 letras, sem stopwords) de um texto. */
function keywords(text: string): Set<string> {
  const clean = normalize(text)
    .replace(/<[^>]+>/g, " ") // conteúdo é HTML do editor
    .replace(/[^a-z0-9à-ú]+/gi, " ");
  const words = new Set<string>();
  for (const w of clean.split(/\s+/)) {
    if (w.length >= 4 && !STOPWORDS.has(w)) words.add(w);
  }
  return words;
}

function tagSet(tags: string | null): Set<string> {
  return new Set(
    (tags ?? "")
      .split(",")
      .map((t) => normalize(t.trim()))
      .filter(Boolean),
  );
}

/**
 * Ranqueia as notas que "conversam" com a atual. Notas já mencionadas
 * explicitamente (link /notes/{id} em qualquer direção) ficam de fora — o
 * objetivo é REDESCOBERTA, não repetir o que o backlink já mostra.
 */
export function findRelatedNotes(
  current: SerendipityCandidate,
  others: SerendipityCandidate[],
  limit = 5,
): RelatedNote[] {
  const myTags = tagSet(current.tags);
  const myTitleWords = keywords(current.title);
  // Título pesa mais que corpo; o corpo entra limitado p/ não dominar o score.
  const myContentWords = keywords(current.content.slice(0, 4000));

  const scored: { note: SerendipityCandidate; score: number; reason: string }[] = [];

  for (const other of others) {
    if (other.id === current.id) continue;
    // Conexão explícita (menção) em qualquer direção: o backlink já cobre.
    if (other.content.includes(`/notes/${current.id}`) || current.content.includes(`/notes/${other.id}`)) {
      continue;
    }

    let score = 0;
    const reasons: string[] = [];

    const sharedTags = [...tagSet(other.tags)].filter((t) => myTags.has(t));
    if (sharedTags.length > 0) {
      score += sharedTags.length * 4;
      reasons.push(sharedTags.length === 1 ? `tag “${sharedTags[0]}”` : `${sharedTags.length} tags em comum`);
    }

    if (current.subjectId && other.subjectId === current.subjectId) {
      score += 2;
      reasons.push("mesma matéria");
    }

    const otherTitleWords = keywords(other.title);
    let titleOverlap = 0;
    for (const w of otherTitleWords) {
      if (myTitleWords.has(w)) titleOverlap += 3;
      else if (myContentWords.has(w)) titleOverlap += 1;
    }
    if (titleOverlap > 0) {
      score += titleOverlap;
      reasons.push("tema parecido");
    }

    if (score >= 3) scored.push({ note: other, score, reason: reasons.join(" · ") });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ note, reason }) => ({ id: note.id, title: note.title, reason }));
}
