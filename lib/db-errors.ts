// ============================================================================
// ERROS DE BANCO TRADUZIDOS + RETRY (DATABASE_ROADMAP · Resiliência §2/§3)
// ============================================================================
// O `friendlyError` nasceu no /setup; aqui ele vira infraestrutura de RUNTIME:
// com banco remoto, "wifi caiu / free tier hibernou / token expirou" é rotina,
// não exceção. Este módulo traduz os erros clássicos por provedor e oferece o
// retry com backoff que resolve 90% dos cold starts (Neon/Supabase free pausam
// o banco após inatividade — a 1ª query leva 2–10s ou falha).

import { getDbProfile, maskDbUrl, type DbProfile } from "./db-config";

/**
 * Traduz erros técnicos (Turso/libSQL/Postgres/fs) em mensagens acionáveis em
 * pt-BR. Nunca repete credenciais: com Postgres a senha vive DENTRO da URL.
 * Sem `profile`, usa o perfil ativo (caminho típico em Server Actions).
 */
export function friendlyDbError(error: unknown, profile?: DbProfile | null): string {
  const raw = error instanceof Error ? error.message : String(error);
  const p = profile === undefined ? getDbProfile() : profile;
  // Nunca repetir credenciais no erro: com Postgres a senha vive na URL.
  const low = (p?.mode === "cloud" ? raw.replace(p.url, maskDbUrl(p.url)) : raw).toLowerCase();
  const mode = p?.mode ?? "local";
  const provider = p?.mode === "cloud" ? p.provider : null;

  // --- PostgreSQL / Supabase ---
  if (provider === "postgres" || provider === "supabase") {
    if (low.includes("password authentication failed") || low.includes("28p01")) {
      return "O Postgres recusou a senha. Confira usuário e senha na connection string. No Supabase, é a senha do BANCO (Settings → Database), não a senha da conta.";
    }
    if (low.includes("enotfound") || low.includes("getaddrinfo")) {
      return "Host do Postgres não encontrado. Confira o endereço na connection string (e se o projeto não está pausado, no caso de free tier).";
    }
    if (low.includes("econnrefused")) {
      return "Conexão recusada. Confira a porta (Supabase serverless usa o pooler na 6543; conexão direta é 5432) e se o banco aceita conexões externas.";
    }
    if (low.includes("self signed") || low.includes("certificate") || low.includes("ssl")) {
      return "Problema de SSL/TLS na conexão. Bancos gerenciados exigem sslmode=require (o Life OS adiciona sozinho); se for self-hosted sem SSL, adicione ?sslmode=disable — ciente de que o tráfego vai em claro.";
    }
    if (low.includes("does not exist") && low.includes("database")) {
      return "O banco de dados informado na connection string não existe. Crie-o no provedor ou corrija o nome após a última barra.";
    }
    if (low.includes("timeout")) {
      return "A conexão com o Postgres expirou. Free tiers (Neon/Supabase) hibernam — tente de novo em alguns segundos; também confira firewall/rede.";
    }
  }

  // --- MySQL / MariaDB ---
  if (provider === "mysql") {
    if (low.includes("access denied") || low.includes("er_access_denied") || low.includes("1045")) {
      return "O MySQL recusou usuário/senha (Access denied). Confira o usuário e a senha na connection string (mysql://usuario:senha@host:porta/banco) e se esse usuário tem permissão a partir do seu host.";
    }
    if (low.includes("unknown database") || low.includes("1049")) {
      return "O banco informado na connection string não existe no MySQL. Crie-o (CREATE DATABASE) ou corrija o nome após a última barra da URL.";
    }
    if (low.includes("enotfound") || low.includes("getaddrinfo")) {
      return "Host do MySQL não encontrado. Confira o endereço na connection string e se o servidor está acessível pela rede.";
    }
    if (low.includes("econnrefused")) {
      return "Conexão recusada pelo MySQL. Confira a porta (padrão 3306), se o servidor está no ar e se aceita conexões externas (bind-address).";
    }
    if (low.includes("etimedout") || low.includes("timeout")) {
      return "A conexão com o MySQL expirou. Confira firewall/rede e se o servidor não está sobrecarregado — tente de novo em alguns segundos.";
    }
    if (low.includes("ssl") || low.includes("certificate")) {
      return "Problema de SSL/TLS na conexão com o MySQL. Bancos gerenciados exigem TLS; ajuste os parâmetros de SSL na connection string conforme o provedor.";
    }
  }

  // Réplica também fala com o Turso (espelho), então herda o mapeamento da nuvem.
  if (provider === "turso" || mode === "replica") {
    if (low.includes("401") || low.includes("unauthor")) {
      return "Turso recusou o token (401). O formato está ok, mas este token NÃO vale para este banco. Gere um token NOVO abrindo o banco específico no dashboard (ou `turso db tokens create <nome-do-banco>`). Atenção: token de API da conta ≠ token do banco; e se o banco foi recriado, tokens antigos param de valer.";
    }
    if (low.includes("jwt") || low.includes("token")) {
      return "Falha de autenticação no Turso. Verifique o TURSO_AUTH_TOKEN (deve ser o JWT que começa com 'eyJ…', gerado para ESTE banco — não a URL).";
    }
    // HTTP 400 / SERVER_ERROR do Turso quase sempre = token inválido (é comum
    // colar a URL no campo do token por engano). Aponta direto pra causa.
    if (low.includes("400") || low.includes("server_error")) {
      return "O Turso rejeitou a conexão (HTTP 400). Quase sempre é o TURSO_AUTH_TOKEN errado — confirme que é o token JWT (começa com 'eyJ…'), NÃO a URL do banco. Gere com: turso db tokens create <nome-do-banco>.";
    }
    if (low.includes("internal server error") || low.includes("sync(") || low.includes("500")) {
      return "O Turso teve um erro momentâneo (500) ao sincronizar. Não é o seu token nem seus dados — o app segue funcionando com a réplica local. Tente sincronizar de novo em alguns segundos.";
    }
    if (low.includes("enotfound") || low.includes("getaddrinfo") || low.includes("fetch failed") || low.includes("econnrefused") || low.includes("url")) {
      return "Não foi possível conectar ao banco Turso. Confira o TURSO_DATABASE_URL (formato libsql://...) e sua conexão.";
    }
  }

  // --- Erros do Prisma em runtime (qualquer provedor) ---
  if (low.includes("p1001") || low.includes("can't reach database")) {
    return "O servidor do banco não respondeu (P1001). Confira sua conexão — e, em free tier, se o banco não está hibernando (tente de novo em alguns segundos).";
  }
  if (low.includes("p2021") || (low.includes("table") && low.includes("does not exist"))) {
    return "Uma tabela esperada não existe no banco (P2021). O schema parece desatualizado — abra Configurações → Dados & Sistema ou refaça a conexão para o Life OS reconciliar as tabelas.";
  }
  if (low.includes("disk") && (low.includes("full") || low.includes("quota"))) {
    return "O banco recusou a escrita por falta de espaço/cota (disco cheio ou limite do plano grátis atingido). Leituras seguem funcionando — libere espaço ou faça upgrade antes de continuar gravando.";
  }
  // SQLITE_NOMEM na réplica/nuvem = o primário Turso ficou sem memória ao
  // preparar a query (pico momentâneo). É transitório: o Life OS já tenta de
  // novo sozinho; se insistir, aguarde alguns segundos e repita.
  if (low.includes("sqlite_nomem") || low.includes("out of memory") || low.includes("init_step")) {
    return "O banco ficou momentaneamente sem memória ao processar a gravação (pico no servidor). Nada foi salvo — tente de novo em alguns segundos.";
  }

  if (low.includes("baseline")) {
    return "Arquivo de schema (baseline.sql) não encontrado no servidor. Problema de build/deploy.";
  }
  // Caso geral: devolve a mensagem original (já é informativa).
  return raw;
}

/**
 * Erros TRANSITÓRIOS de conexão — os que valem um retry (rede piscou, free
 * tier acordando, DNS demorou). Erros de auth/SQL ficam de fora: repetir não
 * conserta senha errada.
 */
export function isTransientDbError(error: unknown): boolean {
  const low = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    low.includes("p1001") ||
    low.includes("can't reach database") ||
    low.includes("econnrefused") ||
    low.includes("econnreset") ||
    low.includes("etimedout") ||
    low.includes("timeout") ||
    low.includes("fetch failed") ||
    low.includes("socket hang up") ||
    low.includes("enotfound") ||
    low.includes("getaddrinfo") ||
    // Turso/libSQL (réplica ou nuvem): o primário fica sem memória ao preparar a
    // query num pico momentâneo. A falha é no init_step (ANTES de executar), então
    // nada foi gravado — repetir é seguro e costuma passar na 2ª tentativa.
    low.includes("sqlite_nomem") ||
    low.includes("out of memory") ||
    low.includes("init_step") ||
    // Falha genérica do stream Hrana (conexão remota do libSQL piscou).
    low.includes("hrana") ||
    low.includes("stream error") ||
    // Turso devolveu 500 no pull da réplica (Sync(... "Internal Server Error")):
    // hiccup momentâneo do primário — repetir o sync costuma resolver.
    low.includes("internal server error") ||
    low.includes("sync(")
  );
}

/**
 * Executa uma operação de banco com 1 retry + backoff quando o erro é
 * transitório (Resiliência §3 — cold start de free tier). Uso típico:
 *   const users = await withDbRetry(() => prisma.user.findMany());
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts?: { retries?: number; backoffMs?: number },
): Promise<T> {
  const retries = Math.max(0, opts?.retries ?? 1);
  const backoffMs = opts?.backoffMs ?? 1500;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isTransientDbError(error)) throw error;
      // Backoff linear simples: 1.5s, 3s... — o suficiente p/ free tier acordar.
      await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
    }
  }
  throw lastError;
}
