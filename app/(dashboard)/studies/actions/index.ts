// Barrel das server actions de Studies.
// Mantém o caminho público `@/app/(dashboard)/studies/actions` estável
// após o split do antigo actions.ts (320 linhas) em módulos por domínio.
export * from "./schemas";
export * from "./subject";
export * from "./session";
export * from "./redacao";
export * from "./questions";
export * from "./exams";
