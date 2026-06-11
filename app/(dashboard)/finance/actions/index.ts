// Barrel das server actions de Finance.
// Mantém o caminho público `@/app/(dashboard)/finance/actions` estável
// após o split do antigo actions.ts (559 linhas) em módulos por domínio.
export * from "./account";
export * from "./budget";
export * from "./transaction";
export * from "./wishlist";
export * from "./recurring";
export * from "./recurring-charge";
export * from "./recurring-payment";
export * from "./pluggy";
export * from "./product";
export * from "./investment-portfolio";
export * from "./import-statement";
export * from "./market";
