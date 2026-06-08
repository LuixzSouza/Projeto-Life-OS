"use client";

// Import/Export de rotinas de treino — independente de servidor (arquitetura
// "cada usuário com seu banco": não há tabela central pra compartilhar). Uma rotina
// vira um código Base64 (URL-safe) que entra num link; o amigo abre o link e a
// rotina cai direto no localStorage dele. Versionado e sanitizado na importação.

import type { Routine } from "./session-types";
import { uid } from "./session-types";

interface RoutineBundle {
  v: 1;
  routines: Routine[];
}

// Base64 URL-safe e UTF-8-safe (sem escape/unescape depreciados).
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64: string): string {
  const norm = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(norm);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function sanitizeExercise(e: unknown): Routine["exercises"][number] | null {
  if (typeof e !== "object" || e === null) return null;
  const r = e as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (!name) return null;
  const sets = Math.max(1, Math.min(20, Math.round(Number(r.sets) || 3)));
  return {
    name,
    group: typeof r.group === "string" ? r.group : undefined,
    sets,
    reps: typeof r.reps === "string" ? r.reps : String(r.reps ?? "12"),
    weight: typeof r.weight === "string" ? r.weight : String(r.weight ?? ""),
  };
}

function sanitizeRoutine(r: unknown): Routine | null {
  if (typeof r !== "object" || r === null) return null;
  const rec = r as Record<string, unknown>;
  const name = typeof rec.name === "string" ? rec.name.trim() : "";
  if (!name) return null;
  const muscleGroups = Array.isArray(rec.muscleGroups) ? rec.muscleGroups.filter((g): g is string => typeof g === "string") : [];
  const exercises = Array.isArray(rec.exercises)
    ? rec.exercises.map(sanitizeExercise).filter((x): x is Routine["exercises"][number] => x !== null)
    : [];
  if (exercises.length === 0) return null;
  // ID novo no destino — evita colisão com rotinas locais do importador.
  return { id: uid("rt"), name, muscleGroups, exercises };
}

/** Codifica uma ou mais rotinas num token Base64 compartilhável. */
export function encodeRoutines(routines: Routine[]): string {
  const bundle: RoutineBundle = { v: 1, routines };
  return toBase64Url(JSON.stringify(bundle));
}

/** Decodifica e SANITIZA um token (ou link com ?import=...). Null se inválido. */
export function decodeRoutines(input: string): Routine[] | null {
  try {
    let code = input.trim();
    // Aceita colar o link inteiro: extrai o parâmetro ?import= / &import=.
    const m = code.match(/[?&]import=([^&\s]+)/);
    if (m) code = m[1];
    code = code.replace(/\s+/g, "");
    if (!code) return null;
    const json = fromBase64Url(code);
    const parsed = JSON.parse(json) as unknown;
    const rec = parsed as Record<string, unknown>;
    const list = Array.isArray(rec?.routines) ? rec.routines : Array.isArray(parsed) ? (parsed as unknown[]) : null;
    if (!list) return null;
    const out = list.map(sanitizeRoutine).filter((x): x is Routine => x !== null);
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/** Monta o link compartilhável que abre o app e importa a rotina. */
export function buildShareLink(routines: Routine[]): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/health/gym/session?import=${encodeRoutines(routines)}`;
}
