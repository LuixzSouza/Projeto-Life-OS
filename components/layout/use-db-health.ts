"use client";

// Store compartilhado do GET /api/health (DATABASE_ROADMAP · Resiliência §1).
// Um ÚNICO poller alimenta todos os consumidores (ponto da sidebar + banner de
// erro) — sem isso cada componente abriria seu próprio setInterval contra a
// mesma rota. O primeiro assinante liga o poller; o último desliga.

import { useSyncExternalStore } from "react";

export interface DbHealth {
  db: "ok" | "down";
  mode: "local" | "replica" | "cloud" | "none";
  latencyMs: number | null;
  lastSyncAt: number | null;
  lastSyncError: string | null;
  /** false = leitura ok mas ESCRITA falhou (quota/disco) — somente leitura. */
  writable: boolean | null;
}

export interface HealthSnapshot {
  health: DbHealth | null;
  /** true quando nem o servidor respondeu (PC desligado / fora da rede). */
  failed: boolean;
  /** epoch ms da última checagem concluída (sucesso ou falha). */
  checkedAt: number | null;
}

export type HealthLevel = "ok" | "slow" | "down" | "unknown";

export function levelOf(snap: HealthSnapshot): HealthLevel {
  if (snap.failed) return "down";
  if (!snap.health) return "unknown";
  if (snap.health.db === "down") return "down";
  if (snap.health.writable === false) return "slow"; // lê mas não grava
  if (snap.health.lastSyncError) return "slow";
  if ((snap.health.latencyMs ?? 0) > 800) return "slow";
  return "ok";
}

const INITIAL: HealthSnapshot = { health: null, failed: false, checkedAt: null };

let snapshot: HealthSnapshot = INITIAL;
const listeners = new Set<() => void>();
let pollTimer: number | null = null;
let checking = false;

function emit() {
  for (const listener of listeners) listener();
}

async function check() {
  if (checking) return;
  checking = true;
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    const data = (await res.json()) as DbHealth;
    snapshot = { health: data, failed: false, checkedAt: Date.now() };
  } catch {
    snapshot = { ...snapshot, failed: true, checkedAt: Date.now() };
  } finally {
    checking = false;
    emit();
  }
}

function onVisible() {
  if (document.visibilityState === "visible") void check();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (pollTimer === null) {
    void check();
    pollTimer = window.setInterval(() => void check(), 60_000);
    document.addEventListener("visibilitychange", onVisible);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => INITIAL;

/** Snapshot reativo do health do banco (poller único e compartilhado). */
export function useDbHealth(): HealthSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Força uma checagem imediata (botão "Tentar de novo" do banner). */
export function recheckDbHealth(): void {
  void check();
}
