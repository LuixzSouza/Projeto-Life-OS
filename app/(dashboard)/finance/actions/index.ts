// Barrel das server actions de Finance.
// Mantém o caminho público `@/app/(dashboard)/finance/actions` estável
// após o split do antigo actions.ts (559 linhas) em módulos por domínio.
export * from "./account";
export * from "./transaction";
export * from "./wishlist";
export * from "./recurring";
export * from "./pluggy";
export * from "./product";
