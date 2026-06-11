// Gates de dialeto (DATABASE_ROADMAP Fase 0.2): UM lugar para responder
// "que SQL o banco ativo fala?". Todo código que emite SQL cru (PRAGMA,
// sqlite_master, VACUUM, information_schema...) deve decidir por AQUI —
// nunca pelo `mode` do perfil, que não distingue Turso de Postgres.

import { getDbProfile, type CloudProvider, type DbProfile } from "./db-config";

export type DbDialect = "sqlite" | "postgres" | "mysql" | "mongodb";

/** Dialeto falado por cada provedor de nuvem. */
export function dialectOfProvider(provider: CloudProvider): DbDialect {
  switch (provider) {
    case "turso":
      return "sqlite"; // libSQL é SQLite na rede
    case "postgres":
    case "supabase":
      return "postgres";
    case "mysql":
      return "mysql";
    case "mongodb":
      return "mongodb";
  }
}

/** Dialeto de um perfil (local e réplica são sempre SQLite/libSQL). */
export function dialectOf(profile: DbProfile | null | undefined): DbDialect {
  if (!profile) return "sqlite";
  if (profile.mode === "local" || profile.mode === "replica") return "sqlite";
  return dialectOfProvider(profile.provider);
}

/** Dialeto do banco ATIVO (perfil resolvido por env/config). */
export function getDialect(): DbDialect {
  return dialectOf(getDbProfile());
}

/**
 * O banco ativo entende a família SQLite (PRAGMA, sqlite_master, VACUUM)?
 * Gate para: lib/db-migrate.ts, maintenance.ts (integrity_check/VACUUM),
 * e o dedupe por `typeof(createdAt)` do sync.
 */
export function isSqliteFamily(): boolean {
  return getDialect() === "sqlite";
}

/**
 * O banco ativo passa pelo ADAPTER libSQL (réplica embarcada ou Turso)?
 * Os workarounds documentados nas memórias do projeto são bugs DO ADAPTER,
 * não do dialeto — não levar a gambiarra para o Postgres (Fase 0.4):
 *   - não usar _max/_min de DateTime em groupBy/aggregate;
 *   - não LER DateTime dentro de $transaction interativa.
 */
export function usesLibsqlAdapter(): boolean {
  const profile = getDbProfile();
  if (!profile) return false;
  if (profile.mode === "replica") return true;
  return profile.mode === "cloud" && profile.provider === "turso";
}
