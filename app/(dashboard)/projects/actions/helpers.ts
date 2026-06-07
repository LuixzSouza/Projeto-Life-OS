// Helpers e enums compartilhados pelas server actions de projects.
import { prisma } from "@/lib/prisma";

// =========================================================
// HELPERS (Utilitários para ler FormData)
// =========================================================

export function getString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : null;
}

export function getBoolean(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  if (typeof value === "string") {
    // Checkbox envia "on" ou "true"
    return value === "true" || value === "on";
  }
  return false;
}

export function getNumber(formData: FormData, key: string): number | null {
  const value = formData.get(key);
  if (typeof value === "string") {
    const num = parseInt(value);
    return isNaN(num) ? null : num;
  }
  return null;
}

export function getEnumValue<T extends readonly string[]>(
  value: string | null,
  allowed: T,
  fallback?: T[number]
): T[number] | undefined {
  if (value && allowed.includes(value)) return value as T[number];
  return fallback;
}

export function getDate(value: string | null): Date | null {
  if (!value) return null;
  // Datas de <input type="date"> chegam como "YYYY-MM-DD" (sem hora). O JS
  // interpreta isso como meia-noite UTC → em fusos negativos (ex.: Brasil UTC-3)
  // vira o DIA ANTERIOR. Ancorar ao meio-dia UTC mantém o mesmo dia do calendário
  // em qualquer fuso (-12..+14). Strings com hora (datetime) passam intactas.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Date(isDateOnly ? `${value}T12:00:00Z` : value);
}

// =========================================================
// SLUG GENERATOR
// =========================================================

function createSlug(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function generateUniqueSlug(title: string, projectId?: string) {
  const base = createSlug(title);
  let slug = base;
  let count = 1;

  while (true) {
    const existing = await prisma.project.findUnique({
      where: { slug },
    });

    // Se não existe, ou se é o próprio projeto que estamos editando, o slug é válido
    if (!existing || existing.id === projectId) break;

    slug = `${base}-${count++}`;
  }

  return slug;
}

// =========================================================
// ENUMS (Configurações fixas)
// =========================================================

export const TASK_PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
export const JOB_STATUS = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "TEST",
  "OFFER",
  "ACTIVE",
  "REJECTED",
] as const;
export const JOB_TYPES = ["JOB", "FREELANCE"] as const;
export const JOB_PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
