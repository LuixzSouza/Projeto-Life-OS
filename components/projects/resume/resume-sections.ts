// Fonte única da verdade das seções do PDF de currículo — usada pelo template
// (ordem de render) e pelo controle de ordem/visibilidade no builder.

export const RESUME_SECTIONS = [
    { key: "summary", label: "Resumo" },
    { key: "experience", label: "Experiência" },
    { key: "projects", label: "Projetos" },
    { key: "education", label: "Formação" },
    { key: "skills", label: "Competências" },
    { key: "certifications", label: "Certificações" },
    { key: "languages", label: "Idiomas" },
] as const;

export type ResumeSectionKey = (typeof RESUME_SECTIONS)[number]["key"];

export const DEFAULT_SECTION_ORDER = RESUME_SECTIONS.map((s) => s.key);

const VALID = new Set<string>(DEFAULT_SECTION_ORDER);

/**
 * Normaliza a ordem salva: mantém só chaves válidas/sem duplicata e ANEXA as
 * que faltarem (forward-compat: seção nova aparece mesmo em ordens antigas).
 */
export function resolveSectionOrder(order?: string[]): ResumeSectionKey[] {
    const seen = new Set<string>();
    const result: ResumeSectionKey[] = [];
    for (const k of order ?? []) {
        if (VALID.has(k) && !seen.has(k)) {
            result.push(k as ResumeSectionKey);
            seen.add(k);
        }
    }
    for (const k of DEFAULT_SECTION_ORDER) {
        if (!seen.has(k)) result.push(k);
    }
    return result;
}

export const sectionLabel = (key: string): string =>
    RESUME_SECTIONS.find((s) => s.key === key)?.label ?? key;
