"use client";

// Biblioteca local de mídia por exercício: o usuário cola um link do YouTube uma
// vez e fica salvo no projeto (localStorage). A capa vira a thumbnail do vídeo.
// Sem dependência de DB nem de IDs chumbados (que poderiam apontar pro vídeo errado).

const KEY = "lifeos:gym:exercise-media";

export interface ExerciseMedia {
  youtubeId?: string;
}
export type MediaMap = Record<string, ExerciseMedia>;

const norm = (name: string) => name.trim().toLowerCase();

export function getAllMedia(): MediaMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MediaMap) : {};
  } catch {
    return {};
  }
}

export function persistMedia(map: MediaMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignora quota */
  }
}

export function mediaFor(map: MediaMap, name: string): ExerciseMedia | undefined {
  return map[norm(name)];
}

export function setVideoFor(map: MediaMap, name: string, youtubeId: string | null): MediaMap {
  const next = { ...map };
  if (youtubeId) next[norm(name)] = { ...next[norm(name)], youtubeId };
  else delete next[norm(name)];
  return next;
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
