import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient as createWebClient } from "@libsql/client/web";
import type { Client as LibsqlClient } from "@libsql/client";
import { getDbProfile, type DbProfile } from "./db-config";

// Perfil de fallback quando o sistema ainda não foi instalado (/setup).
// Mantém o build/start do Next.js de pé sem um banco real configurado.
const FALLBACK_PROFILE: DbProfile = { mode: "local", databasePath: "./setup_needed.db" };

/** Pull automático padrão (segundos) da réplica embarcada com o Turso espelho. */
export const DEFAULT_SYNC_INTERVAL = 60;

interface PrismaState {
  client: PrismaClient | null;
  signature: string | null;
  // Cliente libSQL bruto quando o perfil é "replica" — guardado para chamar
  // `.sync()` (o PrismaClient não expõe o cliente libSQL por baixo do adapter).
  libsql: LibsqlClient | null;
}

// Estado guardado no globalThis para sobreviver ao HMR do Next.js em dev
// (evita abrir múltiplas conexões a cada reload).
declare global {
  var __prismaState: PrismaState | undefined;
}

const state: PrismaState =
  globalThis.__prismaState ?? { client: null, signature: null, libsql: null };
if (process.env.NODE_ENV !== "production") globalThis.__prismaState = state;

const logLevels: ("error" | "warn")[] =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

/** Assinatura usada para detectar mudança de perfil e reconectar. */
function signatureOf(profile: DbProfile): string {
  switch (profile.mode) {
    case "local":
      return `local:${profile.databasePath}`;
    case "replica":
      return `replica:${profile.databasePath}:${profile.syncUrl}`;
    case "cloud":
      return `cloud:${profile.provider}:${profile.url}`;
  }
}

/**
 * Carrega o build NODE do `@libsql/client` em RUNTIME, fora do bundle do webpack.
 *
 * Por quê: o entry node desse pacote faz `import Database from "libsql"` no topo
 * — puxando o binário NATIVO. Um import estático arrastaria esse nativo para o
 * bundle serverless (Vercel), onde ele não roda. A réplica embarcada só existe no
 * PC (processo node longo); a nuvem usa `@libsql/client/web` e NUNCA chega aqui.
 * `__non_webpack_require__` é o require real do Node que o webpack não rastreia,
 * mantendo o nativo 100% externo.
 */
export function loadNodeLibsql(): typeof import("@libsql/client") {
  // `@libsql/client` + `libsql` estão em `serverExternalPackages` (next.config),
  // então este require literal NÃO é empacotado pelo webpack — resolve do
  // node_modules em runtime, de forma síncrona. Só roda no PC (modo réplica);
  // a nuvem usa `@libsql/client/web` e nunca chega aqui.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@libsql/client") as typeof import("@libsql/client");
}

interface BuiltClient {
  client: PrismaClient;
  /** Não-nulo apenas no modo "replica" (precisa de `.sync()`). */
  libsql: LibsqlClient | null;
}

/**
 * Constrói um PrismaClient para o perfil informado, devolvendo também o cliente
 * libSQL bruto quando há sincronização (modo réplica).
 * - local: SQLite em arquivo (datasource URL direta, sem libSQL).
 * - replica: arquivo local libSQL sincronizado com o Turso (lê local, escreve no
 *   primário e reflete localmente; pull periódico via `syncInterval`).
 * - cloud: Turso/libSQL remoto via driver adapter (HTTP, serverless-safe).
 */
export function buildAdapterClient(profile: DbProfile): BuiltClient {
  if (profile.mode === "cloud") {
    const libsql = createWebClient({ url: profile.url, authToken: profile.authToken });
    const adapter = new PrismaLibSQL(libsql);
    return { client: new PrismaClient({ adapter, log: logLevels }), libsql: null };
  }

  if (profile.mode === "replica") {
    const { createClient } = loadNodeLibsql();
    const libsql = createClient({
      url: `file:${profile.databasePath}`,
      syncUrl: profile.syncUrl,
      authToken: profile.authToken,
      // Pull periódico em background: traz para o arquivo local o que foi escrito
      // por OUTRO dispositivo (ex.: o celular via instância na nuvem).
      syncInterval: profile.syncInterval ?? DEFAULT_SYNC_INTERVAL,
    });
    const adapter = new PrismaLibSQL(libsql);
    return { client: new PrismaClient({ adapter, log: logLevels }), libsql };
  }

  return {
    client: new PrismaClient({
      datasources: { db: { url: `file:${profile.databasePath}` } },
      log: logLevels,
    }),
    libsql: null,
  };
}

/**
 * Compat: devolve apenas o PrismaClient. Exportada para o /setup criar um client
 * temporário consistente. Quando precisar do `.sync()` (réplica), use
 * `buildAdapterClient` e guarde o `libsql` retornado.
 */
export function buildClient(profile: DbProfile): PrismaClient {
  return buildAdapterClient(profile).client;
}

/** Fecha o cliente libSQL bruto da réplica (para o timer de syncInterval). */
function closeLibsql() {
  if (state.libsql) {
    try {
      state.libsql.close();
    } catch {
      /* noop */
    }
    state.libsql = null;
  }
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
  closeLibsql();

  if (profile === FALLBACK_PROFILE) {
    console.warn("⚠️ [PRISMA] Sistema não instalado. Aguardando configuração em /setup...");
  } else {
    console.log(`✅ [PRISMA] Conectado (${signature})`);
  }

  const built = buildAdapterClient(profile);
  state.client = built.client;
  state.libsql = built.libsql;
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
  closeLibsql();
  state.client = null;
  state.signature = null;
}

/** true quando o banco ativo é uma réplica embarcada (tem o que sincronizar). */
export function isReplicaActive(): boolean {
  return getDbProfile()?.mode === "replica";
}

/**
 * Força um sync imediato da réplica embarcada com o Turso espelho (pull do que
 * mudou no primário; as escritas locais já vão ao primário na hora). No-op
 * (`synced: false`) quando o banco ativo NÃO é uma réplica.
 */
export async function syncReplica(): Promise<{ synced: boolean }> {
  // Garante que o cliente (e o libsql bruto) estejam vivos para o perfil atual.
  getClient();
  if (!state.libsql) return { synced: false };
  await state.libsql.sync();
  return { synced: true };
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
