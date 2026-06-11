// Checklist (subtarefas) dentro de uma Task — JSON tipado em Task.checklist.
// Mesmo padrão de WorkoutPlan.content: o cliente edita a lista inteira e o
// servidor valida/serializa aqui (um único ponto de (de)serialização).

export interface TaskChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export function parseChecklist(raw: string | null | undefined): TaskChecklistItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
        text: typeof item.text === "string" ? item.text : "",
        done: item.done === true,
      }))
      .filter((item) => item.text.trim().length > 0);
  } catch {
    return [];
  }
}

export function serializeChecklist(items: TaskChecklistItem[]): string | null {
  const clean = items
    .map((i) => ({ id: i.id, text: i.text.trim().slice(0, 500), done: i.done }))
    .filter((i) => i.text.length > 0)
    .slice(0, 100);
  return clean.length > 0 ? JSON.stringify(clean) : null;
}

export function checklistProgress(items: TaskChecklistItem[]): { done: number; total: number } {
  return { done: items.filter((i) => i.done).length, total: items.length };
}
