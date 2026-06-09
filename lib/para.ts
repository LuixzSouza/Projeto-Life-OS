// Taxonomia PARA (Roadmap Fase 2 — #10): Projects, Areas, Resources, Archives.
// Introduzida de forma ADITIVA: coluna `paraType` opcional (null = sem classificação)
// em Project, Notebook e SavedLink. Este módulo centraliza chaves, rótulos e cores
// para a UI inteira falar a mesma língua.

export const PARA_TYPES = ["PROJECT", "AREA", "RESOURCE", "ARCHIVE"] as const;
export type ParaType = (typeof PARA_TYPES)[number];

export interface ParaMeta {
  label: string;
  /** Frase curta do que pertence aqui (ajuda a classificar sem pensar). */
  hint: string;
  /** Classes de badge (estilo soft do design system). */
  badgeClass: string;
}

export const PARA_META: Record<ParaType, ParaMeta> = {
  PROJECT: {
    label: "Projeto",
    hint: "Esforço com objetivo e fim definidos",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  AREA: {
    label: "Área",
    hint: "Responsabilidade contínua (saúde, finanças…)",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  RESOURCE: {
    label: "Recurso",
    hint: "Material de interesse para consultar depois",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  ARCHIVE: {
    label: "Arquivo",
    hint: "Inativo — guardado por histórico",
    badgeClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  },
};

/** Valida texto livre (FormData/query) → ParaType ou null. */
export function asParaType(value: string | null | undefined): ParaType | null {
  const v = value?.trim().toUpperCase();
  return (PARA_TYPES as readonly string[]).includes(v ?? "") ? (v as ParaType) : null;
}
