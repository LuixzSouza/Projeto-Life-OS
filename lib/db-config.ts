import fs from "fs";
import path from "path";
import crypto from "crypto";

// Nome do arquivo de configuração salvo no diretório de dados
const CONFIG_FILE_NAME = "life-os-config.json";

/**
 * Diretório de DADOS do Life OS (config, banco padrão, backups). Em builds
 * instalados (DISTRIBUICAO Fase 0) aponta para %LOCALAPPDATA%\LifeOS\data via
 * env LIFE_OS_DATA_DIR; sem a env, mantém o comportamento histórico (cwd).
 */
export function getDataDir(): string {
  const env = process.env.LIFE_OS_DATA_DIR?.trim();
  if (env) {
    try {
      if (!fs.existsSync(env)) fs.mkdirSync(env, { recursive: true });
    } catch (e) {
      console.warn("⚠️ Não foi possível criar LIFE_OS_DATA_DIR, usando cwd:", e);
      return process.cwd();
    }
    return env;
  }
  return process.cwd();
}

const CONFIG_PATH = path.join(getDataDir(), CONFIG_FILE_NAME);

// =========================================================
// PERFIL DE CONEXÃO (híbrido-ready)
// =========================================================
// Hoje só o modo "local" (SQLite em pasta escolhida pelo usuário) é
// implementado. O modo "cloud" já está modelado para a fase futura
// (Turso/Postgres) sem precisar reescrever o núcleo.

/**
 * Provedores de banco na nuvem. "turso" e "postgres"/"supabase" são funcionais;
 * "mysql" e "mongodb" estão modelados para as fases 4/5 do DATABASE_ROADMAP
 * (cards "Em breve" no wizard) — o buildAdapterClient recusa com erro claro.
 * Supabase é Postgres com açúcar: mesmo ramo de conexão, detecção própria.
 */
export type CloudProvider = "turso" | "postgres" | "supabase" | "mysql" | "mongodb";

export type DbProfile =
  | { mode: "local"; databasePath: string }
  | {
      mode: "cloud";
      provider: CloudProvider;
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
  // Backup automático diário (snapshot .db + export JSON com rotação).
  autoBackup?: AutoBackupConfig;
  // Última verificação de integridade agendada (epoch ms) — marcador semanal.
  lastIntegrityCheckAt?: number;
}

export interface AutoBackupConfig {
  /** undefined = ligado (backup que precisa ser lembrado não protege ninguém). */
  enabled?: boolean;
  /** Pasta destino. undefined = <pasta do banco>/backups/auto. Aponte para OneDrive/Drive p/ cópia externa. */
  dir?: string;
  /** Quantas cópias diárias manter (rotação). undefined = 7. */
  keep?: number;
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
    // strip de BOM: arquivo editado/regravado por Bloco de Notas ou PowerShell
    // 5.1 vem em UTF-8 com BOM, e JSON.parse rejeita — sem o strip o app
    // "desinstala" sozinho (config vira {} → cai no setup_needed.db).
    const bomFree = fs.readFileSync(CONFIG_PATH, "utf-8").replace(new RegExp("^\\uFEFF"), "");
    cachedConfig = JSON.parse(bomFree) as ConfigShape;
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
 *
 * Aceita o URL do Turso/libSQL por VÁRIOS nomes de variável, porque é fácil
 * errar o nome no painel da Vercel e cair em /setup sem perceber:
 *   - TURSO_DATABASE_URL  (nome canônico — documentado)
 *   - TURSO_URL           (atalho comum)
 *   - DATABASE_URL        (só se for libsql://… — `file:` é local, ignorado aqui)
 * O token sai de TURSO_AUTH_TOKEN | TURSO_TOKEN | DATABASE_AUTH_TOKEN.
 */
export function getEnvProfile(): DbProfile | null {
  // Considera apenas URLs realmente remotas (libsql/https). `file:` é local e
  // não faz sentido em serverless — deixa o config/arquivo decidir nesse caso.
  const candidates = [
    process.env.TURSO_DATABASE_URL,
    process.env.TURSO_URL,
    process.env.DATABASE_URL,
  ];
  const url = candidates
    .map((u) => u?.trim())
    .find((u) => !!u && /^(libsql|https):\/\//.test(u));

  if (url) {
    const authToken =
      process.env.TURSO_AUTH_TOKEN ||
      process.env.TURSO_TOKEN ||
      process.env.DATABASE_AUTH_TOKEN ||
      undefined;
    return { mode: "cloud", provider: "turso", url, authToken };
  }

  // Demais dialetos chegam SÓ por DATABASE_URL (os nomes TURSO_* são do Turso).
  const generic = process.env.DATABASE_URL?.trim();
  if (generic) {
    const provider = detectProviderFromUrl(generic);
    if (provider && provider !== "turso") {
      return { mode: "cloud", provider, url: generic };
    }
  }
  return null;
}

/**
 * Detecta o provedor de nuvem pelo esquema/host da URL de conexão.
 * Retorna null para URLs locais (`file:`) ou esquemas desconhecidos.
 */
export function detectProviderFromUrl(url: string): CloudProvider | null {
  const u = url.trim().toLowerCase();
  if (/^(libsql|wss?):\/\//.test(u)) return "turso";
  if (/^postgres(ql)?:\/\//.test(u)) {
    return /\.supabase\.(co|com)|\.pooler\.supabase\.com/.test(u) ? "supabase" : "postgres";
  }
  if (/^mysql:\/\//.test(u)) return "mysql";
  if (/^mongodb(\+srv)?:\/\//.test(u)) return "mongodb";
  // https:// é ambíguo (Turso aceita) — só conta como turso se o host for dele.
  if (/^https:\/\//.test(u)) return /turso\.io|\.aws-|\.gcp-/.test(u) ? "turso" : null;
  return null;
}

/**
 * Mascara credenciais embutidas numa URL de banco para logs/erros/toasts.
 * `postgres://user:senha@host/db` → `postgres://user:•••@host/db`.
 * URLs sem credencial voltam intactas; valores não-URL são truncados.
 */
export function maskDbUrl(url: string): string {
  try {
    const m = url.match(/^([a-z+]+:\/\/)([^@/]+)@(.*)$/i);
    if (!m) return url;
    const [, scheme, cred, rest] = m;
    const user = cred.includes(":") ? cred.slice(0, cred.indexOf(":")) : cred;
    return `${scheme}${user}:•••@${rest}`;
  } catch {
    return "•••";
  }
}

// =========================================================
// PERFIL — leitura / escrita
// =========================================================

// ---------------------------------------------------------
// Cifra dos campos sensíveis do perfil persistido (Segurança §2 do
// DATABASE_ROADMAP): o life-os-config.json guardava authToken (e, com
// Postgres, a senha dentro da URL) em texto puro. Ciframos com a
// ENCRYPTION_KEY local via lib/crypto (keyring). Import preguiçoso para
// evitar ciclo (crypto.ts usa getOrCreateSecret deste módulo).
// Migração suave: decrypt() devolve texto puro legado como está; o valor é
// regravado cifrado na próxima escrita do perfil.
// ---------------------------------------------------------

function cryptoModule(): typeof import("./crypto") | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("./crypto") as typeof import("./crypto");
  } catch {
    return null; // ambiente sem chave estável (ex.: serverless sem env) — segue em claro
  }
}

/** Cifra authToken/URL-com-senha antes de persistir no config. */
function sealProfile(profile: DbProfile): DbProfile {
  const c = cryptoModule();
  if (!c) return profile;
  try {
    if (profile.mode === "replica" && profile.authToken) {
      return { ...profile, authToken: c.encrypt(profile.authToken) };
    }
    if (profile.mode === "cloud") {
      const sealed = { ...profile };
      if (sealed.authToken) sealed.authToken = c.encrypt(sealed.authToken);
      // Credencial embutida na URL (postgres://user:senha@host) também é segredo.
      if (/^[a-z+]+:\/\/[^@/]*:[^@/]+@/i.test(sealed.url)) sealed.url = c.encrypt(sealed.url);
      return sealed;
    }
  } catch (e) {
    console.warn("⚠️ Não foi possível cifrar o perfil (gravando em claro):", e);
  }
  return profile;
}

/** Decifra os campos do perfil lido do config (texto puro legado passa direto). */
function openProfile(profile: DbProfile): DbProfile {
  const c = cryptoModule();
  if (!c) return profile;
  const open = (v: string): string => {
    try {
      return c.decrypt(v);
    } catch {
      return v; // chave trocada/corrompida: devolve como está (erro aparece na conexão)
    }
  };
  if (profile.mode === "replica" && profile.authToken) {
    return { ...profile, authToken: open(profile.authToken) };
  }
  if (profile.mode === "cloud") {
    return {
      ...profile,
      url: open(profile.url),
      authToken: profile.authToken ? open(profile.authToken) : profile.authToken,
    };
  }
  return profile;
}

export function getDbProfile(): DbProfile | null {
  // 1. Env vars têm prioridade (Vercel/serverless — config em arquivo não persiste).
  const envProfile = getEnvProfile();
  if (envProfile) return envProfile;

  // 2. Config local em arquivo (desktop/local-first).
  const config = readConfig();
  if (config.profile) return openProfile(config.profile);
  // Migração suave: config antigo só tinha databasePath.
  if (config.databasePath) {
    return { mode: "local", databasePath: config.databasePath };
  }
  return null;
}

export function setDbProfile(profile: DbProfile) {
  const config = readConfig();
  config.profile = sealProfile(profile);
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
// BACKUP AUTOMÁTICO (config da máquina, não do usuário)
// =========================================================

export function getAutoBackupConfig(): Required<AutoBackupConfig> {
  const cfg = readConfig().autoBackup ?? {};
  const dbPath = getDatabasePath();
  const defaultDir = path.join(dbPath ? path.dirname(dbPath) : getDataDir(), "backups", "auto");
  return {
    enabled: cfg.enabled !== false,
    dir: cfg.dir?.trim() || defaultDir,
    keep: Math.max(1, Math.min(60, cfg.keep ?? 7)),
  };
}

export function setAutoBackupConfig(partial: AutoBackupConfig) {
  const config = readConfig();
  config.autoBackup = { ...config.autoBackup, ...partial };
  writeConfig(config);
}

/** Marcador da verificação de integridade semanal (epoch ms; 0 = nunca rodou). */
export function getLastIntegrityCheckAt(): number {
  return readConfig().lastIntegrityCheckAt ?? 0;
}

export function setLastIntegrityCheckAt(epochMs: number) {
  const config = readConfig();
  config.lastIntegrityCheckAt = epochMs;
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
