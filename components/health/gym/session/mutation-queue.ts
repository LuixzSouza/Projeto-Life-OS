"use client";

// Fila de finalizações de treino que falharam por rede (academia com Wi-Fi instável).
// Ao "Concluir Treino" sem conexão, o payload final fica aqui no localStorage e a UI
// é liberada na hora; quando a rede volta, `PendingSessionsSync` despacha em background.
// Guardamos só o SaveGymSessionInput (JSON pequeno) — as fotos já vão pra galeria
// (IndexedDB) localmente, então não dependem desta fila e não estouram a cota.

import type { SaveGymSessionInput } from "./session-types";
import { uid } from "./session-types";

const KEY = "lifeos:gym:pending-sessions";

export interface PendingSession {
  id: string;
  input: SaveGymSessionInput;
  queuedAt: number;
}

function read(): PendingSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PendingSession[]) : [];
  } catch {
    return [];
  }
}

function write(items: PendingSession[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* quota — ignora */
  }
}

export function enqueueGymSession(input: SaveGymSessionInput): void {
  const items = read();
  items.push({ id: uid("pending"), input, queuedAt: Date.now() });
  write(items);
}

export function getPendingSessions(): PendingSession[] {
  return read();
}

export function removePendingSession(id: string): void {
  write(read().filter((p) => p.id !== id));
}

export function pendingCount(): number {
  return read().length;
}
