"use client";

// Biblioteca local de mídia por exercício: o usuário cola um link do YouTube
// e/ou envia uma FOTO própria uma vez e fica salvo no projeto (localStorage).
// A capa vira a foto (prioridade) ou a thumbnail do vídeo. Sem dependência de
// DB nem de IDs chumbados (que poderiam apontar pro vídeo errado).

const KEY = "lifeos:gym:exercise-media";

export interface ExerciseMedia {
  youtubeId?: string;
  /** Imagem própria do usuário (dataURL comprimida) — vence qualquer outra capa. */
  image?: string;
}
export type MediaMap = Record<string, ExerciseMedia>;

const norm = (name: string) => name.trim().toLowerCase();

// Cache do parse (o mapa pode carregar imagens base64 — parsear por thumb pesa).
let cached: MediaMap | null = null;

export function getAllMedia(): MediaMap {
  if (typeof window === "undefined") return {};
  if (cached) return cached;
  try {
    const raw = window.localStorage.getItem(KEY);
    cached = raw ? (JSON.parse(raw) as MediaMap) : {};
  } catch {
    cached = {};
  }
  return cached;
}

/** Evento disparado quando a mídia por exercício muda (as capas re-renderizam). */
export const MEDIA_EVENT = "lifeos:gym:exercise-media";

export function persistMedia(map: MediaMap): void {
  cached = map;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignora quota */
  }
  window.dispatchEvent(new Event(MEDIA_EVENT));
}

export function mediaFor(map: MediaMap, name: string): ExerciseMedia | undefined {
  return map[norm(name)];
}

// Atualiza um campo preservando o outro (vídeo e imagem coexistem); entrada
// vazia é removida do mapa.
function patchMedia(map: MediaMap, name: string, patch: Partial<ExerciseMedia>): MediaMap {
  const next = { ...map };
  const key = norm(name);
  const cur: ExerciseMedia = { ...next[key], ...patch };
  if (!cur.youtubeId) delete cur.youtubeId;
  if (!cur.image) delete cur.image;
  if (cur.youtubeId || cur.image) next[key] = cur;
  else delete next[key];
  return next;
}

export function setVideoFor(map: MediaMap, name: string, youtubeId: string | null): MediaMap {
  return patchMedia(map, name, { youtubeId: youtubeId ?? undefined });
}

export function setImageFor(map: MediaMap, name: string, image: string | null): MediaMap {
  return patchMedia(map, name, { image: image ?? undefined });
}

/** Extrai o ID de várias formas de URL do YouTube (watch, youtu.be, shorts, embed) ou ID puro. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s; // já é um ID
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.slice(1).split("/")[0];
      return id.length === 11 ? id : null;
    }
    const v = url.searchParams.get("v");
    if (v && v.length === 11) return v;
    const m = url.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
  } catch {
    /* não é URL válida */
  }
  return null;
}

export function youtubeThumb(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeEmbed(id: string): string {
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}

export function youtubeSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`como fazer ${name} academia`)}`;
}
