"use server";

// ============================================================================
// MUDAR DE BANCO PELA UI (DATABASE_ROADMAP · Fase 3 — "o superpoder")
// ============================================================================
// "A pessoa escolhe onde deixar os dados" só é verdade se ela puder MUDAR DE
// IDEIA depois sem dor. Wizard de 3 passos: (a) conectar destino + schema,
// (b) copiar dados (motor Prisma de lib/db-copy.ts), (c) trocar o perfil e
// reconectar — sem reiniciar o servidor. O banco antigo fica INTACTO.
// Antes de TODA migração: export JSON completo forçado (sem opt-out).

import fs from "fs";
import path from "path";
import os from "os";
import type { PrismaClient } from "@prisma/client";
import { requireUserId } from "@/lib/auth";
import { prisma, reconnectPrisma, buildAdapterClient } from "@/lib/prisma";
import { ensureSchema } from "@/lib/db-bootstrap";
import { dialectOf } from "@/lib/db-dialect";
import {
  getDbProfile,
  setDbProfile,
  getDataDir,
  getDatabasePath,
  detectProviderFromUrl,
  maskDbUrl,
  type DbProfile,
} from "@/lib/db-config";
import { friendlyDbError } from "@/lib/db-errors";
import { copyDatabase, type CopyReport } from "@/lib/db-copy";
import { buildFullBackup } from "@/lib/full-backup";

export interface MigrationTargetInput {
  kind: "turso" | "postgres" | "mysql" | "local";
  /** turso: libsql://… · postgres: postgresql://… · mysql: mysql://user:senha@host:porta/db */
  url?: string;
  /** turso: JWT eyJ… */
  authToken?: string;
  /** local: pasta OU arquivo .db de destino */
  path?: string;
}

export interface MigrationTestResult {
  success: boolean;
  message: string;
  providerLabel?: string;
  /** Nº de usuários já existentes no destino (0 = vazio, o ideal). */
  userCount?: number;
}

export interface MigrationRunResult {
  success: boolean;
  message: string;
  report?: CopyReport;
}

const PROVIDER_LABELS: Record<string, string> = {
  turso: "Turso",
  postgres: "PostgreSQL",
  supabase: "Supabase",
  mysql: "MySQL",
};

/** Valida o formulário e o transforma num DbProfile de destino. */
function resolveTargetProfile(input: MigrationTargetInput): DbProfile {
  if (input.kind === "turso") {
    const url = (input.url ?? "").trim();
    const authToken = (input.authToken ?? "").trim() || undefined;
    if (!url) throw new Error("Informe a URL do Turso (libsql://…).");
    if (!/^(libsql|https?):\/\//.test(url)) {
      throw new Error("URL inválida. Use o formato libsql://... ou https://...");
    }
    if (authToken && /^(libsql|wss?|https?):\/\//i.test(authToken)) {
      throw new Error("O campo do token recebeu uma URL. O token é o JWT que começa com 'eyJ…'.");
    }
    return { mode: "cloud", provider: "turso", url, authToken };
  }

  if (input.kind === "postgres") {
    let url = (input.url ?? "").trim();
    if (!url) throw new Error("Informe a connection string do PostgreSQL.");
    if (/^eyJ/.test(url)) {
      throw new Error(
        "Isso é uma API key (JWT), não a connection string. No Supabase use Settings → Database → Connection string (URI).",
      );
    }
    if (!/^postgres(ql)?:\/\//i.test(url)) {
      throw new Error("URL inválida. Use o formato postgresql://usuario:senha@host:porta/banco.");
    }
    const isLocalHost = /@(localhost|127\.0\.0\.1)[:/]/i.test(url);
    if (!isLocalHost && !/sslmode=/i.test(url)) {
      url += (url.includes("?") ? "&" : "?") + "sslmode=require";
    }
    const detected = detectProviderFromUrl(url);
    const provider = detected === "supabase" || detected === "postgres" ? detected : "postgres";
    return { mode: "cloud", provider, url };
  }

  if (input.kind === "mysql") {
    const url = (input.url ?? "").trim();
    if (!url) throw new Error("Informe a connection string do MySQL (mysql://…).");
    if (/^eyJ/.test(url)) {
      throw new Error("Isso parece uma API key (JWT), não a connection string. Use mysql://usuario:senha@host:porta/banco.");
    }
    if (!/^mysql:\/\//i.test(url)) {
      throw new Error("URL inválida. Use o formato mysql://usuario:senha@host:porta/banco.");
    }
    return { mode: "cloud", provider: "mysql", url };
  }

  // local: pasta (cria life_os.db) ou arquivo .db direto.
  const raw = (input.path ?? "").trim();
  if (!raw) throw new Error("Informe a pasta ou o arquivo .db de destino.");
  const isDbFile = raw.toLowerCase().endsWith(".db");
  const folder = isDbFile ? path.dirname(raw) : raw;
  if (!fs.existsSync(folder)) {
    try {
      fs.mkdirSync(folder, { recursive: true });
    } catch {
      throw new Error(`Sem permissão para criar a pasta: ${folder}`);
    }
  }
  const databasePath = isDbFile ? raw : path.join(folder, "life_os.db");
  return { mode: "local", databasePath };
}

/** Identidade simples do perfil para impedir migrar "para si mesmo". */
function profileIdentity(profile: DbProfile): string {
  switch (profile.mode) {
    case "local":
      return `local:${path.resolve(profile.databasePath).toLowerCase()}`;
    case "replica":
      return `sync:${profile.syncUrl.toLowerCase()}`;
    case "cloud":
      return profile.provider === "turso"
        ? `sync:${profile.url.toLowerCase()}`
        : `cloud:${profile.url.toLowerCase()}`;
  }
}

function targetLabel(profile: DbProfile): string {
  if (profile.mode === "local") return `SQLite local (${profile.databasePath})`;
  if (profile.mode === "cloud") {
    return `${PROVIDER_LABELS[profile.provider] ?? profile.provider} (${maskDbUrl(profile.url)})`;
  }
  return "réplica";
}

/**
 * Passo (a): conecta no destino, garante o schema e diz se ele está vazio.
 * Nada é copiado aqui — é o teste em camadas antes do botão de migrar.
 */
export async function testMigrationTarget(input: MigrationTargetInput): Promise<MigrationTestResult> {
  await requireUserId();
  let target: DbProfile;
  try {
    target = resolveTargetProfile(input);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) };
  }

  const current = getDbProfile();
  if (current && profileIdentity(current) === profileIdentity(target)) {
    return { success: false, message: "O destino é o MESMO banco que está em uso agora. Escolha outro." };
  }

  const built = buildAdapterClient(target);
  try {
    await ensureSchema(built.client, dialectOf(target));
    const userCount = await built.client.user.count();
    const providerLabel =
      target.mode === "cloud" ? PROVIDER_LABELS[target.provider] ?? target.provider : "SQLite local";
    return {
      success: true,
      providerLabel,
      userCount,
      message:
        userCount === 0
          ? `Destino pronto (${providerLabel}): conexão ok, schema criado, banco vazio.`
          : `Conexão ok, mas o destino já tem ${userCount} usuário(s). O ideal é migrar para um banco VAZIO — linhas com o mesmo id serão puladas.`,
    };
  } catch (error) {
    return { success: false, message: friendlyDbError(error, target) };
  } finally {
    await built.client.$disconnect().catch(() => {});
    if (built.libsql) {
      try { built.libsql.close(); } catch { /* noop */ }
    }
  }
}

/**
 * Rede de segurança da Fase 3: export JSON completo de TODOS os usuários +
 * snapshot do arquivo .db (quando houver), antes de qualquer cópia. Sem opt-out.
 */
async function forcedPreMigrationBackup(): Promise<string> {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const candidates = [
    path.join(getDataDir(), "backups", "pre-migration", stamp),
    path.join(os.tmpdir(), "lifeos-pre-migration", stamp),
  ];
  let dir: string | null = null;
  for (const candidate of candidates) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      dir = candidate;
      break;
    } catch {
      /* tenta o próximo */
    }
  }
  if (!dir) {
    throw new Error(
      "Não foi possível gravar o backup obrigatório pré-migração (filesystem somente-leitura?). Migração abortada por segurança.",
    );
  }

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  for (const user of users) {
    const backup = await buildFullBackup(user.id);
    const safeName = user.email.replace(/[^a-z0-9.@_-]/gi, "_");
    fs.writeFileSync(path.join(dir, `backup-${safeName}.json`), JSON.stringify(backup));
  }

  // Snapshot do arquivo físico (modos local/réplica) — restauração instantânea.
  const dbPath = getDatabasePath();
  if (dbPath && fs.existsSync(dbPath)) {
    try {
      fs.copyFileSync(dbPath, path.join(dir, path.basename(dbPath)));
    } catch (e) {
      console.warn("⚠️ Snapshot do .db pré-migração falhou (export JSON já garantido):", e);
    }
  }
  return dir;
}

/**
 * Passos (b)+(c): backup forçado → copia tudo via Prisma → troca o perfil e
 * reconecta. O banco de ORIGEM nunca é alterado — se algo der errado, o app
 * continua exatamente onde estava.
 */
export async function migrateToTarget(
  input: MigrationTargetInput,
  options?: { allowNonEmpty?: boolean },
): Promise<MigrationRunResult> {
  await requireUserId();
  let target: DbProfile;
  try {
    target = resolveTargetProfile(input);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) };
  }

  const current = getDbProfile();
  if (!current) return { success: false, message: "Nenhum banco de origem configurado." };
  if (profileIdentity(current) === profileIdentity(target)) {
    return { success: false, message: "O destino é o MESMO banco que está em uso agora." };
  }

  // Rede de segurança (sem opt-out).
  let backupDir: string;
  try {
    backupDir = await forcedPreMigrationBackup();
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) };
  }

  const built = buildAdapterClient(target);
  try {
    await ensureSchema(built.client, dialectOf(target));

    const existingUsers = await built.client.user.count();
    if (existingUsers > 0 && !options?.allowNonEmpty) {
      return {
        success: false,
        message: `O destino já tem ${existingUsers} usuário(s). Confirme "migrar mesmo assim" para mesclar (linhas com o mesmo id serão puladas).`,
      };
    }

    console.log(`🚚 Migrando banco: ${profileIdentity(current)} → ${targetLabel(target)}`);
    const report = await copyDatabase(prisma as PrismaClient, built.client, (model, copied, total) => {
      if (copied === total) console.log(`   ✓ ${model}: ${copied}/${total}`);
    });

    if (report.totalCopied === 0 && report.totalSource > 0) {
      return {
        success: false,
        message: "Nenhuma linha foi copiada — o perfil atual NÃO foi alterado. Veja o log do servidor.",
        report,
      };
    }

    // (c) Troca o perfil e reconecta — o banco antigo fica intacto.
    setDbProfile(target);
    await reconnectPrisma();

    const skippedNote =
      report.totalSkipped > 0 ? ` (${report.totalSkipped} linha(s) puladas — já existiam ou referência ausente)` : "";
    return {
      success: true,
      report,
      message: `Migração concluída: ${report.totalCopied} de ${report.totalSource} registros copiados para ${targetLabel(
        target,
      )}${skippedNote}. Backup de segurança em ${backupDir}. O banco antigo permanece intacto.`,
    };
  } catch (error) {
    console.error("❌ Erro na migração entre bancos:", error);
    return { success: false, message: friendlyDbError(error, target) };
  } finally {
    // Se a migração FALHOU, o client do destino é descartado; se deu certo, o
    // proxy global já reconectou com um client próprio — este aqui sempre fecha.
    await built.client.$disconnect().catch(() => {});
    if (built.libsql) {
      try { built.libsql.close(); } catch { /* noop */ }
    }
  }
}
