// Diagnóstico pré-deploy de PostgreSQL/Supabase em CAMADAS (DATABASE_ROADMAP
// Fase 1.7): cada camada que falha já aponta o conserto — em vez de um
// pass/fail binário. Espelha o padrão do turso-probe.
//
// Uso:  node scripts/db-probe-postgres.mjs "postgresql://user:senha@host:5432/db"
//       (ou define DATABASE_URL no .env e roda sem argumento)
import fs from "fs";
import dns from "dns/promises";
import { Client } from "pg";

function loadEnvUrl() {
  try {
    const raw = fs.readFileSync(".env", "utf8");
    const m = raw.match(/^\s*DATABASE_URL\s*=\s*"?(postgres[^"\r\n]+)"?\s*$/m);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

const url = process.argv[2] || process.env.DATABASE_URL || loadEnvUrl();
const mask = (u) => u.replace(/\/\/([^:@/]+):[^@/]+@/, "//$1:***@");

if (!url || !/^postgres(ql)?:\/\//i.test(url)) {
  console.error('Informe a connection string: node scripts/db-probe-postgres.mjs "postgresql://..."');
  process.exit(1);
}
if (/^eyJ/.test(url)) {
  console.error("Isso e uma API key (JWT), nao a connection string do banco.");
  process.exit(1);
}

console.log(`Banco: ${mask(url)}\n`);
const u = new URL(url.replace(/^postgres:\/\//i, "postgresql://"));
const isSupabase = /supabase\.(co|com)/i.test(u.hostname);
const ssl = /sslmode=disable/i.test(url)
  ? undefined
  : /localhost|127\.0\.0\.1/.test(u.hostname)
    ? undefined
    : { rejectUnauthorized: false };

let failed = false;
const ok = (msg) => console.log(`  [ok] ${msg}`);
const bad = (msg, fix) => {
  failed = true;
  console.log(`  [X] ${msg}`);
  if (fix) console.log(`      -> ${fix}`);
};

// --- Camada 1: DNS ---
console.log("1. DNS");
try {
  const addrs = await dns.lookup(u.hostname, { all: true });
  ok(`${u.hostname} -> ${addrs.map((a) => a.address).join(", ")}`);
  if (addrs.every((a) => a.family === 6)) {
    console.log("      (so IPv6 — alguns provedores/redes nao alcancam; Supabase: use o pooler, que tem IPv4)");
  }
} catch {
  bad(`host nao resolve: ${u.hostname}`, "confira o endereco; projeto pausado/apagado tambem some do DNS");
}

// --- Camadas 2-4 com o client ---
if (!failed) {
  const client = new Client({ connectionString: url, ssl, connectionTimeoutMillis: 12_000 });
  console.log("2. TCP + autenticacao + SSL");
  try {
    await client.connect();
    ok(`conectado na porta ${u.port || 5432}${ssl ? " (SSL)" : ""}`);

    console.log("3. Query");
    const r = await client.query("SELECT current_database() AS db, version() AS v");
    ok(`${r.rows[0].db} — ${String(r.rows[0].v).split(",")[0]}`);

    console.log("4. Schema do Life OS");
    const t = await client.query(
      "SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'User'"
    );
    if (t.rows[0].n > 0) {
      const users = await client.query('SELECT COUNT(*)::int AS n FROM "User"');
      ok(`tabelas do Life OS presentes (${users.rows[0].n} usuario(s)) — instalacao existente`);
    } else {
      ok("banco vazio — o /setup cria o schema (ensureSchema) no primeiro uso");
    }

    console.log("5. Escrita");
    await client.query("CREATE TEMP TABLE _lifeos_probe (id int)");
    await client.query("DROP TABLE _lifeos_probe");
    ok("escrita permitida");
  } catch (e) {
    const m = String(e?.message ?? e).toLowerCase();
    if (m.includes("password authentication")) {
      bad("senha recusada", isSupabase ? "use a senha do BANCO (Settings -> Database), nao a da conta" : "confira usuario/senha na URL");
    } else if (m.includes("econnrefused")) {
      bad("conexao recusada", isSupabase ? "porta certa? direta=5432, pooler=6543" : "porta/firewall/pg_hba.conf");
    } else if (m.includes("timeout")) {
      bad("timeout", "free tier hibernando (tente de novo em ~10s) ou rede bloqueando a porta");
    } else if (m.includes("certificate") || m.includes("ssl")) {
      bad("falha de SSL", "em nuvem use sslmode=require; self-hosted sem TLS: ?sslmode=disable");
    } else if (m.includes("does not exist")) {
      bad("banco inexistente", "confira o nome apos a ultima barra da URL");
    } else {
      bad(`erro: ${String(e?.message ?? e)}`);
    }
  } finally {
    await client.end().catch(() => {});
  }
}

console.log(failed ? "\nResultado: FALHOU — corrija acima e rode de novo." : "\nResultado: tudo certo para usar no Life OS.");
process.exit(failed ? 1 : 0);
