// Fonte da verdade dos "enums" guardados como String no SQLite (o Prisma não tem
// enum nativo via provider sqlite). Defina/valide os valores aqui — especialmente
// em escritas vindas da IA, onde o valor é gerado por um LLM e pode chegar fora do
// domínio (ex.: "Concluído" no lugar de "DONE"), corrompendo filtros e contagens.
//
// Mantido enxuto de propósito: só os conjuntos com domínio FECHADO e CERTO. Status
// de domínio aberto/instável (ex.: Project/MediaItem) ficam fora para não coagir,
// por engano, um valor legítimo que não esteja listado aqui.

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const CLIENT_STATUSES = ["ACTIVE", "INACTIVE", "LEAD"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/**
 * Normaliza um valor para um membro válido do conjunto (match exato, case-insensitive),
 * ou retorna `null` se não pertencer. Use quando um valor inválido deve ser IGNORADO
 * (ex.: UPDATE — não sobrescrever o campo com um padrão).
 */
export function asEnum<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
): T | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  return (allowed as readonly string[]).includes(upper) ? (upper as T) : null;
}

/**
 * Como `asEnum`, mas retorna o `fallback` quando o valor é inválido/ausente.
 * Use no CREATE, onde sempre precisamos gravar um valor válido.
 */
export function coerceEnum<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return asEnum(value, allowed) ?? fallback;
}
