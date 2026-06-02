import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client/web";
import { getDbProfile, type DbProfile } from "./db-config";

// Perfil de fallback quando o sistema ainda não foi instalado (/setup).
// Mantém o build/start do Next.js de pé sem um banco real configurado.
const FALLBACK_PROFILE: DbProfile = { mode: "local", databasePath: "./setup_needed.db" };

interface PrismaState {
  client: PrismaClient | null;
  signature: string | null;
}

// Estado guardado no globalThis para sobreviver ao HMR do Next.js em dev
// (evita abrir múltiplas conexões a cada reload).
declare global {
  var __prismaState: PrismaState | undefined;
}

const state: PrismaState = globalThis.__prismaState ?? { client: null, signature: null };
if (process.env.NODE_ENV !== "production") globalThis.__prismaState = state;

const logLevels: ("error" | "warn")[] =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

/** Assinatura usada para detectar mudança de perfil e reconectar. */
function signatureOf(profile: DbProfile): string {
  return profile.mode === "local"
    ? `local:${profile.databasePath}`
    : `cloud:${profile.provider}:${profile.url}`;
}

/**
 * Constrói um PrismaClient para o perfil informado.
 * - local: SQLite em arquivo (datasource URL direta).
 * - cloud: Turso/libSQL via driver adapter (HTTP, serverless-safe).
 * Exportada para o /setup criar um client temporário consistente.
 */
export function buildClient(profile: DbProfile): PrismaClient {
  if (profile.mode === "cloud") {
    const libsql = createClient({ url: profile.url, authToken: profile.authToken });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter, log: logLevels });
  }
  return new PrismaClient({
    datasources: { db: { url: `file:${profile.databasePath}` } },
    log: logLevels,
  });
}

/**
 * Retorna o PrismaClient apontando para o banco ATUAL. Se o perfil mudou desde
 * a última chamada (ex.: logo após o /setup ou ao mover a pasta / migrar p/ nuvem),
 * descarta o cliente antigo e cria um novo — sem precisar reiniciar o servidor.
 */
function getClient(): PrismaClient {
  const profile = getDbProfile() ?? FALLBACK_PROFILE;
  const signature = signatureOf(profile);

  if (state.client && state.signature === signature) {
    return state.client;
  }

  if (state.client) {
    const old = state.client;
    void old.$disconnect().catch(() => {});
  }

  if (profile === FALLBACK_PROFILE) {
    console.warn("⚠️ [PRISMA] Sistema não instalado. Aguardando configuração em /setup...");
  } else {
    console.log(`✅ [PRISMA] Conectado (${signature})`);
  }

  state.client = buildClient(profile);
  state.signature = signature;
  return state.client;
}

/**
 * Força o descarte do cliente atual. A próxima query reconecta usando o perfil
 * mais recente. Chamar após gravar um novo perfil (setup / mover pasta / nuvem).
 */
export async function reconnectPrisma(): Promise<void> {
  if (state.client) {
    await state.client.$disconnect().catch(() => {});
  }
  state.client = null;
  state.signature = null;
}

// Proxy que delega cada acesso ao cliente vivo resolvido por getClient().
// Mantém o uso `prisma.user`, `prisma.$transaction`, etc. idêntico ao anterior,
// então nenhum dos imports espalhados pelo app precisa mudar.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
