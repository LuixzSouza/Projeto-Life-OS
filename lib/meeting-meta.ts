// Helpers para os metadados de reunião guardados como JSON (participantes, tags,
// decisões). Tudo fica como array de strings simples — portátil e fácil de editar.

export function parseStringList(value?: string | null): string[] {
  if (!value) return [];
  try {
    const arr = JSON.parse(value);
    if (Array.isArray(arr)) {
      return arr
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter((x): x is string => x.length > 0);
    }
  } catch {
    /* json inválido → lista vazia */
  }
  return [];
}

export function serializeStringList(list: string[], limit = 50): string {
  const clean = Array.from(
    new Set(list.map((x) => x.trim()).filter((x) => x.length > 0)),
  ).slice(0, limit);
  return JSON.stringify(clean);
}
