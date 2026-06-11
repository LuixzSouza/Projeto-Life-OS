// Barrel das server actions de Settings.
// Mantém o caminho público `@/app/(dashboard)/settings/actions` estável
// após o split do antigo actions.ts (851 linhas) em módulos por domínio.
export * from "./backup";
export * from "./import-export";
export * from "./storage";
export * from "./maintenance";
export * from "./profile";
export * from "./security";
export * from "./test-connection";
export * from "./windows-integration";
export * from "./migrate-db";
export * from "./space";
