// Extrai os "itens de ação" de um resumo de reunião (linhas em bullet ou numeradas).
// Usado tanto para criar tarefas quanto para montar a ata em PDF — fonte única.
export function parseActionItems(summary: string | null | undefined, limit = 30): string[] {
  if (!summary) return [];
  return summary
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^([-*•]|\d+[.)])\s+/.test(l))
    .map((l) => l.replace(/^([-*•]|\d+[.)])\s+/, "").replace(/\*\*/g, "").trim())
    .filter((l) => l.length > 1)
    .slice(0, limit);
}
