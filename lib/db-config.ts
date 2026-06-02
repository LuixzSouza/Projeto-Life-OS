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
    };

interface ConfigShape {
  // Mantido por compatibilidade com instalações antigas (modo local).
  databasePath?: string;
  profile?: DbProfile;
  // Segredos auto-gerados para builds desktop (sem .env).
  secrets?: Record<string, string>;
}

function readConfig(): ConfigShape {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as ConfigShape;
  } catch (e) {
    console.error("⚠️ Erro ao ler config do banco:", e);
    return {};
  }
}

function writeConfig(config: ConfigShape) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// =========================================================
// PERFIL — leitura / escrita
// =========================================================

export function getDbProfile(): DbProfile | null {
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
  // Mantém o campo legado em sincronia para compatibilidade.
  config.databasePath =
    profile.mode === "local" ? profile.databasePath : undefined;
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
  if (profile.mode === "local") return `file:${profile.databasePath}`;
  return profile.url;
}

// =========================================================
// WRAPPERS COMPATÍVEIS (modo local)
// =========================================================

export function getDatabasePath(): string | null {
  const profile = getDbProfile();
  return profile?.mode === "local" ? profile.databasePath : null;
}

export function setDatabasePath(newPath: string) {
  setDbProfile({ mode: "local", databasePath: newPath });
}

export function isSystemInstalled(): boolean {
  return !!resolveDatabaseUrl();
}

// =========================================================
// SEGREDOS (auto-gerados quando ausentes no .env)
// =========================================================

/**
 * Retorna um segredo (ex.: JWT_SECRET) priorizando `process.env`.
 * Em builds desktop sem .env, gera um valor forte na 1ª vez e o persiste
 * no config, garantindo que sessões continuem válidas entre reinícios.
 */
export function getOrCreateSecret(name: string): string {
  const fromEnv = process.env[name];
  if (fromEnv) return fromEnv;

  const config = readConfig();
  const existing = config.secrets?.[name];
  if (existing) return existing;

  const generated = crypto.randomBytes(32).toString("hex");
  config.secrets = { ...config.secrets, [name]: generated };
  writeConfig(config);
  console.log(`🔐 Segredo "${name}" gerado e salvo no config local.`);
  return generated;
}
