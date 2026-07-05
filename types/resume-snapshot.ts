// Envelope do currículo CONGELADO no momento do envio a uma vaga (Fase 3).
// Guardado como JSON string em JobApplication.resumeSnapshot. Além do PortfolioData,
// carrega o nome/idioma/template da versão para que a aba "Currículo Enviado"
// mostre "o que a empresa recebeu" mesmo que a versão viva seja editada ou EXCLUÍDA.

import type { PortfolioData } from "./portfolio";

export interface ResumeSnapshot {
  /** id da versão viva na hora do envio (pode não existir mais depois). */
  resumeId: string;
  /** Nome da versão no momento do envio (ex.: "Front-end · Nubank"). */
  resumeName: string;
  locale: string;
  template: string;
  /** Cópia integral e imutável dos dados do currículo. */
  data: PortfolioData;
  /** ISO do congelamento. */
  capturedAt: string;
}

/** Metadados leves do snapshot — o que a LISTA precisa sem carregar o JSON inteiro. */
export interface ResumeSnapshotMeta {
  resumeId: string;
  resumeName: string;
  locale: string;
  template: string;
}

/** Extrai só os metadados do snapshot serializado (para não trafegar o data pesado). */
export function parseSnapshotMeta(raw: string | null): ResumeSnapshotMeta | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<ResumeSnapshot>;
    if (!s || typeof s !== "object" || !s.data) return null;
    return {
      resumeId: s.resumeId ?? "",
      resumeName: s.resumeName ?? "Currículo",
      locale: s.locale ?? "pt-BR",
      template: s.template ?? "ATS",
    };
  } catch {
    return null;
  }
}

/** Parse completo e tolerante do snapshot serializado. */
export function parseSnapshot(raw: string | null): ResumeSnapshot | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<ResumeSnapshot>;
    if (!s || typeof s !== "object" || !s.data) return null;
    return s as ResumeSnapshot;
  } catch {
    return null;
  }
}
