import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient as createWebClient } from "@libsql/client/web";
import type { Client as LibsqlClient } from "@libsql/client";
import { getDbProfile, isEphemeralServerless, maskDbUrl, type DbProfile } from "./db-config";

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
  // Watchdog do sync da réplica: último pull manual bem-sucedido / último erro.
  lastSyncAt: number | null;
  lastSyncError: string | null;
}

// Estado guardado no globalThis para sobreviver ao HMR do Next.js em dev
// (evita abrir múltiplas conexões a cada reload).
declare global {
  var __prismaState: PrismaState | undefined;
}

const state: PrismaState =
  globalThis.__prismaState ?? {
    client: null, signature: null, libsql: null, lastSyncAt: null, lastSyncError: null,
  };
if (process.env.NODE_ENV !== "production") globalThis.__prismaState = state;

const logLevels: ("error" | "warn")[] =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

/** Assinatura usada para detectar mudança de perfil e reconectar. */
function signatureOf(profile: DbProfile): string {
  switch (profile.mode) {
    case "local":
      // "v2" = pool serializado (connection_limit=1) — força descartar clientes
      // antigos cacheados no globalThis que ainda usam o pool concorrente.
      return `local:v2:${profile.databasePath}`;
    case "replica":
      return `replica:${profile.databasePath}:${profile.syncUrl}`;
    case "cloud":
      return `cloud:${profile.provider}:${profile.url}`;
  }
}

/**
 * Assinatura SEGURA para logs: com Postgres a senha vive DENTRO da URL
 * (postgres://user:senha@host) — nunca logar a assinatura crua.
 */
function maskedSignature(profile: DbProfile): string {
  switch (profile.mode) {
    case "local":
      return `local:${profile.databasePath}`;
    case "replica":
      return `replica:${profile.databasePath}:${maskDbUrl(profile.syncUrl)}`;
    case "cloud":
      return `cloud:${profile.provider}:${maskDbUrl(profile.url)}`;
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
/**
 * Carrega em runtime as deps do Postgres (client derivado + adapter + driver),
 * fora do bundle (serverExternalPackages) — mesmo padrão do libsql nativo.
 * O client gerado em @lifeos/client-postgres é estruturalmente idêntico ao
 * canônico (mesmos models); o cast acontece SÓ aqui (DATABASE_ROADMAP).
 */
function loadPostgresDeps(): {
  PgPrismaClient: typeof PrismaClient;
  PrismaPg: typeof import("@prisma/adapter-pg").PrismaPg;
  Pool: typeof import("pg").Pool;
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const generated = require("@lifeos/client-postgres") as { PrismaClient: typeof PrismaClient };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const adapterPg = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pg = require("pg") as typeof import("pg");
  return { PgPrismaClient: generated.PrismaClient, PrismaPg: adapterPg.PrismaPg, Pool: pg.Pool };
}

/**
 * Carrega em runtime o client gerado de MySQL (@lifeos/client-mysql), fora do
 * bundle (serverExternalPackages). Diferente do Postgres, NÃO há driver adapter
 * de MySQL no Prisma 5.22 (o @prisma/adapter-mariadb só existe no Prisma 7) —
 * então este client roda pelo ENGINE NATIVO do Prisma, conectando direto pela
 * URL `mysql://…`, exatamente como o SQLite local. Funciona em processo Node
 * (desktop/VPS); o engine nativo não roda no Edge runtime (nem é o alvo aqui).
 */
function loadMysqlDeps(): { MysqlPrismaClient: typeof PrismaClient } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const generated = require("@lifeos/client-mysql") as { PrismaClient: typeof PrismaClient };
  return { MysqlPrismaClient: generated.PrismaClient };
}

/**
 * SSL do Postgres: bancos gerenciados (Supabase/Neon/...) exigem TLS, mas os
 * certificados de pooler costumam falhar na cadeia padrão do Node — o ajuste
 * de mercado é `rejectUnauthorized: false`. Local (localhost) fica sem SSL,
 * e `sslmode=disable` explícito é respeitado.
 */
function pgSslConfig(url: string): { rejectUnauthorized: boolean } | undefined {
  const low = url.toLowerCase();
  if (low.includes("sslmode=disable")) return undefined;
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(low) && !low.includes("sslmode=")) return undefined;
  return { rejectUnauthorized: false };
}

export function buildAdapterClient(profile: DbProfile): BuiltClient {
  if (profile.mode === "cloud" && (profile.provider === "postgres" || profile.provider === "supabase")) {
    const { PgPrismaClient, PrismaPg, Pool } = loadPostgresDeps();
    const pool = new Pool({
      connectionString: profile.url,
      // Serverless (Vercel): pool mínimo (cada invocação é efêmera; quem faz
      // pooling de verdade é o Supavisor/PgBouncer). Desktop: pool normal.
      max: isEphemeralServerless() ? 1 : 5,
      // Timeout por ambiente (Resiliência §5): serverless falha rápido (o banner
      // de erro aparece logo); desktop tolera rede doméstica mais lenta.
      connectionTimeoutMillis: isEphemeralServerless() ? 5_000 : 10_000,
      ssl: pgSslConfig(profile.url),
    });
    const adapter = new PrismaPg(pool);
    const client = new PgPrismaClient({ adapter, log: logLevels }) as PrismaClient;
    return { client, libsql: null };
  }

  if (profile.mode === "cloud" && profile.provider === "mysql") {
    const { MysqlPrismaClient } = loadMysqlDeps();
    // Engine nativo (sem adapter): a URL `mysql://…` vai direto ao datasource,
    // como o SQLite local. O pool/timeout fica a cargo do driver nativo do Prisma.
    const client = new MysqlPrismaClient({
      datasources: { db: { url: profile.url } },
      log: logLevels,
    }) as PrismaClient;
    return { client, libsql: null };
  }

  if (profile.mode === "cloud" && profile.provider === "mongodb") {
    throw new Error(
      `O provedor "mongodb" ainda não é suportado (roadmap multi-banco, fase 5). ` +
      `Use Turso, Postgres/Supabase, MySQL, ou o modo local/híbrido.`
    );
  }

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
      // SQLite local: 1 conexão no pool = zero contenção de lock entre as
      // queries paralelas do próprio app (Promise.all das páginas + escritas do
      // loop da IA). Com o pool padrão (vários conns no MESMO arquivo), escrita
      // concorrente em disco lento estoura "Timed out during query execution".
      // socket_timeout: espera quando OUTRO processo segura o lock (Studio,
      // backup); pool_timeout: fila interna mais tolerante que os 10s padrão.
      datasources: { db: { url: `file:${profile.databasePath}?connection_limit=1&socket_timeout=30&pool_timeout=30` } },
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
    // Assinatura mascarada: com Postgres a senha vive dentro da URL.
    console.log(`✅ [PRISMA] Conectado (${maskedSignature(profile)})`);
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
  try {
    await state.libsql.sync();
    state.lastSyncAt = Date.now();
    state.lastSyncError = null;
    return { synced: true };
  } catch (error) {
    state.lastSyncError = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

/** Watchdog do sync (modo réplica): última sincronização manual e último erro. */
export function getReplicaSyncInfo(): { lastSyncAt: number | null; lastSyncError: string | null } {
  return { lastSyncAt: state.lastSyncAt, lastSyncError: state.lastSyncError };
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
