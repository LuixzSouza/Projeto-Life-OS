// Barrel das server actions de Projects.
// Mantém o caminho público `@/app/(dashboard)/projects/actions` estável
// após o split do antigo actions.ts (460 linhas) em módulos por domínio.
export * from "./project";
export * from "./task";
export * from "./job";
export * from "./meeting";
export * from "./portfolio";
