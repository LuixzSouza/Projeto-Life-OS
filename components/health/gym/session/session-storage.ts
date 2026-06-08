"use client";

// Persistência local da sessão ao vivo e das rotinas (local-first, resumível
// após refresh/navegação, sem depender do servidor durante o treino).

import type { LiveSession, Routine, StartOptions } from "./session-types";

const ACTIVE_KEY = "lifeos:gym:active-session";
const ROUTINES_KEY = "lifeos:gym:routines";
const PENDING_START_KEY = "lifeos:gym:pending-start";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota/serialização — ignora silenciosamente */
  }
}

export function loadActiveSession(): LiveSession | null {
  const s = read<LiveSession>(ACTIVE_KEY);
  if (!s || typeof s.startedAt !== "number" || !Array.isArray(s.exercises)) return null;
  return s;
}

export function saveActiveSession(session: LiveSession): void {
  // Carimba o instante da última escrita — usado para detectar sessões abandonadas
  // (ex.: começou segunda, abriu quinta) e oferecer retomar/descartar.
  write(ACTIVE_KEY, { ...session, updatedAt: Date.now() });
}

export function clearActiveSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignora */
  }
}

export function loadRoutines(): Routine[] {
  return read<Routine[]>(ROUTINES_KEY) ?? [];
}

export function saveRoutines(routines: Routine[]): void {
  write(ROUTINES_KEY, routines);
}

// "Pending start": uma divisão de ficha escolhida no builder espera ser iniciada
// quando a tela de sessão abrir (passa exercícios + metas pro live).
export function savePendingStart(opts: StartOptions): void {
  write(PENDING_START_KEY, opts);
}

export function loadPendingStart(): StartOptions | null {
  const o = read<StartOptions>(PENDING_START_KEY);
  if (!o || !Array.isArray(o.exercises)) return null;
  return o;
}

export function clearPendingStart(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENDING_START_KEY);
  } catch {
    /* ignora */
  }
}
