// Barrel das server actions de Health.
// Mantém o caminho público `@/app/(dashboard)/health/actions` estável
// após o split do antigo actions.ts (383 linhas) em módulos por domínio.
export * from "./workout";
export * from "./metrics";
export * from "./nutrition";
export * from "./body";
export * from "./challenge";
export * from "./food-api";
