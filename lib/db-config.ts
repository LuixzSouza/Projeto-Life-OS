import fs from "fs";
import path from "path";
import crypto from "crypto";

// Nome do arquivo de configuração salvo na raiz do projeto
const CONFIG_FILE_NAME = "life-os-config.json";
const CONFIG_PATH = path.join(process.cwd(), CONFIG_FILE_NAME);

// =========================================================
// PERFIL DE CONEXÃO (híbrido-ready)
// =========================================================
// Hoje só o modo "local" (SQLite em pasta escolhida pelo usuário) é
// implementado. O modo "cloud" já está modelado para a fase futura
// (Turso/Postgres) sem precisar reescrever o núcleo.

export type DbProfile =
  | { mode: "local"; databasePath: string }
  | {
      mode: "cloud";
      provider: "turso" | "postgres";
      url: string;
      authToken?: string;
    }
  | {
      // Réplica embarcada (libSQL): um arquivo SQLite local que SINCRONIZA com um
      // banco Turso "espelho". Leituras saem do arquivo local (rápidas, offline);
      // escritas vão para o primário (Turso) e refletem de volta no arquivo. É o
      // modo híbrido — trabalha no PC com cópia local E o celular acessa o mesmo
      // dado por uma instância na nuvem apontando para o mesmo Turso.
      mode: "replica";
      databasePath: string;
      syncUrl: string;
      authToken?: string;
      /** Pull periódico em background (segundos). Default em lib/prisma.ts. */
      syncInterval?: number;
    };

interface ConfigShape {
  // Mantido por compatibilidade com instalações antigas (modo local).
  databasePath?: string;
  profile?: DbProfile;
  // Segredos auto-gerados para builds desktop (sem .env).
  secrets?: Record<string, string>;
  // Política de instância: permite (ou não) o cadastro de novas contas em /register.
  // undefined = aberto (compatível com instalações existentes).
  registrationOpen?: boolean;
}

// Cache em memória do config em arquivo. O Proxy do Prisma resolve o perfil a
// CADA acesso de propriedade (`prisma.user`, `prisma.task`, ...); sem cache, o
// modo local fazia uma leitura síncrona de disco por query (dezenas por página,
// bloqueando o event loop). O único escritor em runtime é `writeConfig`, que
// invalida o cache abaixo — então a leitura em memória nunca fica stale.
let cachedConfig: ConfigShape | null = null;

function readConfig(): ConfigShape {
  if (cachedConfig) return cachedConfig;
  if (!fs.existsSync(CONFIG_PATH)) {
    cachedConfig = {};
    return cachedConfig;
  }
  try {
    cachedConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as ConfigShape;
  } catch (e) {
    console.error("⚠️ Erro ao ler config do banco:", e);
    cachedConfig = {};
  }
  return cachedConfig;
}

function writeConfig(config: ConfigShape) {
  // Mantém o cache em sincronia com o que acabou de ser gravado (mesmo se o
  // write falhar em FS read-only, o valor em memória reflete a intenção).
  cachedConfig = config;
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (e) {
    // Em ambientes serverless (Vercel) o FS é somente-leitura. Nesses casos a
    // configuração vem de variáveis de ambiente, então a falha aqui é esperada.
    console.warn("⚠️ Não foi possível gravar config local (FS read-only?):", e);
  }
}

/**
 * Perfil de banco vindo de variáveis de ambiente (prioridade máxima).
 * Essencial em deploy serverless (Vercel), onde o config em arquivo não persiste.
 *   - TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN): banco na nuvem (Turso/libSQL).
 */
export function getEnvProfile(): DbProfile | null {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    return {
      mode: "cloud",
      provider: "turso",
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    };
  }
  return null;
}

// =========================================================
// PERFIL — leitura / escrita
// =========================================================

export function getDbProfile(): DbProfile | null {
  // 1. Env vars têm prioridade (Vercel/serverless — config em arquivo não persiste).
  const envProfile = getEnvProfile();
  if (envProfile) return envProfile;

  // 2. Config local em arquivo (desktop/local-first).
  const config = readConfig();
  if (config.profile) return config.profile;
  // Migração suave: config antigo só tinha databasePath.
  if (config.databasePath) {
    return { mode: "local", databasePath: config.databasePath };
  }
  return null;
}

export function setDbProfile(profile: DbProfile) {
  const config = readConfig();
  config.profile = profile;
  // Mantém o campo legado em sincronia para compatibilidade (local e réplica
  // têm arquivo local; nuvem pura não).
  config.databasePath =
    profile.mode === "local" || profile.mode === "replica"
      ? profile.databasePath
      : undefined;
  writeConfig(config);
  console.log(`✅ Perfil de banco salvo (${profile.mode}) em: ${CONFIG_PATH}`);
}

/**
 * Resolve a URL de conexão que o Prisma deve usar a partir do perfil ativo.
 * Retorna null quando o sistema ainda não foi instalado.
 */
export function resolveDatabaseUrl(): string | null {
  const profile = getDbProfile();
  if (!profile) return null;
  if (profile.mode === "local" || profile.mode === "replica") {
    return `file:${profile.databasePath}`;
  }
  return profile.url;
}

// =========================================================
// WRAPPERS COMPATÍVEIS (modo local)
// =========================================================

export function getDatabasePath(): string | null {
  const profile = getDbProfile();
  if (profile?.mode === "local" || profile?.mode === "replica") {
    return profile.databasePath;
  }
  return null;
}

export function setDatabasePath(newPath: string) {
  setDbProfile({ mode: "local", databasePath: newPath });
}

export function isSystemInstalled(): boolean {
  return !!resolveDatabaseUrl();
}

// =========================================================
// POLÍTICA DE CADASTRO (instância pessoal vs. compartilhada)
// =========================================================

/**
 * Indica se o cadastro de novas contas (/register) está liberado nesta instância.
 * Prioridade: variável de ambiente `LIFEOS_REGISTRATION` (útil em serverless de FS
 * efêmero, onde o config não persiste) > flag no config em arquivo > default ABERTO
 * (compatível com instalações existentes).
 */
export function isRegistrationOpen(): boolean {
  const env = process.env.LIFEOS_REGISTRATION?.trim().toLowerCase();
  if (env === "off" || env === "false" || env === "0") return false;
  if (env === "on" || env === "true" || env === "1") return true;
  return readConfig().registrationOpen !== false;
}

/** Liga/desliga o cadastro aberto (persiste no config local). */
export function setRegistrationOpen(open: boolean) {
  const config = readConfig();
  config.registrationOpen = open;
  writeConfig(config);
}

// =========================================================
// SEGREDOS (auto-gerados quando ausentes no .env)
// =========================================================

/**
 * Indica se estamos em um ambiente serverless de filesystem efêmero (ex.: Vercel),
 * onde NÃO é possível gerar e persistir um segredo estável: cada cold start teria
 * um valor novo, invalidando sessões (JWT) e tornando ilegível o cofre (ENCRYPTION).
 * Sinais: a flag automática `VERCEL` ou o uso de banco na nuvem (TURSO_*).
 */
export function isEphemeralServerless(): boolean {
  return process.env.VERCEL === "1" || !!process.env.TURSO_DATABASE_URL;
}

/**
 * Retorna um segredo (ex.: JWT_SECRET, ENCRYPTION_KEY) priorizando `process.env`.
 * Em builds desktop sem .env, gera um valor forte na 1ª vez e o persiste no config,
 * garantindo estabilidade entre reinícios.
 *
 * Em deploy serverless (Vercel) SEM a env definida, lança erro claro em vez de
 * gerar um segredo volátil — porque um valor que muda a cada invocação quebraria
 * o login e a leitura do cofre de chaves de forma silenciosa e perigosa.
 */
export function getOrCreateSecret(name: string): string {
  const fromEnv = process.env[name]?.trim();
  if (fromEnv) return fromEnv;

  if (isEphemeralServerless()) {
    throw new Error(
      `${name} não está definido. Em deploy serverless (Vercel) o filesystem é efêmero ` +
      `e não permite gerar um segredo estável — defina ${name} nas variáveis de ambiente. ` +
      `Gere um valor forte com: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
    );
  }

  const config = readConfig();
  const existing = config.secrets?.[name];
  if (existing) return existing;

  const generated = crypto.randomBytes(32).toString("hex");
  config.secrets = { ...config.secrets, [name]: generated };
  writeConfig(config);
  console.log(`🔐 Segredo "${name}" gerado e salvo no config local.`);
  return generated;
}
