// Ativa o modo HÍBRIDO (réplica) sem precisar da UI — equivalente ao card
// "Acessar pelo celular" (migrateToReplica). Porta a lógica de lib/db-migrate.ts:
//   1. Mescla os dados do life_os.db local → Turso (INSERT OR IGNORE, não apaga nada)
//   2. Grava o perfil "replica" no life-os-config.json (cache life_os.replica.db)
//   3. Faz o 1º pull do Turso para o cache local
// O life_os.db original fica intacto como backup. Reversível (ver fim do output).
// Roda: node scripts/migrate-to-hybrid.mjs
import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";

const ROOT = process.cwd();

function loadEnv() {
  const out = {};
  const raw = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

const env = loadEnv();
const url = env.TURSO_DATABASE_URL || env.TURSO_URL_REF;
const authToken = env.TURSO_AUTH_TOKEN || env.TURSO_TOKEN_REF;
if (!url || !authToken) {
  console.error("❌ Faltam credenciais do Turso (TURSO_*_REF) no .env");
  process.exit(1);
}

// --- perfil atual (precisa ser local com arquivo) ---
const CONFIG_PATH = path.join(ROOT, "life-os-config.json");
const config = fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) : {};
const sourcePath = config.profile?.databasePath || config.databasePath;
if (!sourcePath || !fs.existsSync(sourcePath)) {
  console.error(`❌ Banco local não encontrado: ${sourcePath}`);
  process.exit(1);
}
console.log("Origem (local):", sourcePath);
console.log("Destino (Turso):", url);

// ---------- merge local → Turso (porta de lib/db-migrate.ts) ----------
const isInternal = (n) => n.startsWith("sqlite_") || n.startsWith("_prisma") || n.startsWith("libsql");

async function topoSort(src, tables) {
  const present = new Set(tables);
  const parentsOf = new Map();
  for (const table of tables) {
    const fks = await src.execute(`PRAGMA foreign_key_list("${table}")`);
    const parents = new Set();
    for (const fk of fks.rows) {
      const ref = String(fk.table);
      if (ref !== table && present.has(ref)) parents.add(ref);
    }
    parentsOf.set(table, parents);
  }
  const ordered = [], done = new Set(), inStack = new Set();
  const visit = (t) => {
    if (done.has(t) || inStack.has(t)) return;
    inStack.add(t);
    for (const p of parentsOf.get(t) ?? []) visit(p);
    inStack.delete(t);
    done.add(t);
    ordered.push(t);
  };
  for (const t of tables) visit(t);
  return ordered;
}

async function merge() {
  const src = createClient({ url: `file:${sourcePath}` });
  const dst = createClient({ url, authToken });
  let tables = 0, inserted = 0, skipped = 0;
  try {
    const tableRows = await src.execute("SELECT name FROM sqlite_master WHERE type='table'");
    const dataTables = tableRows.rows.map((t) => String(t.name)).filter((n) => !isInternal(n));
    const ordered = await topoSort(src, dataTables);
    for (const table of ordered) {
      const data = await src.execute(`SELECT * FROM "${table}"`);
      tables++;
      if (data.rows.length === 0) continue;
      const cols = data.columns;
      const colList = cols.map((c) => `"${c}"`).join(", ");
      const placeholders = cols.map(() => "?").join(", ");
      const sql = `INSERT OR IGNORE INTO "${table}" (${colList}) VALUES (${placeholders})`;
      const stmts = [
        "PRAGMA defer_foreign_keys=ON",
        ...data.rows.map((row) => ({ sql, args: cols.map((c) => row[c]) })),
      ];
      const results = await dst.batch(stmts, "write");
      for (let i = 1; i < results.length; i++) {
        if (results[i].rowsAffected > 0) inserted += results[i].rowsAffected;
        else skipped++;
      }
    }
  } finally {
    src.close();
    dst.close();
  }
  return { tables, inserted, skipped };
}

console.log("\n→ Mesclando dados locais para o Turso (INSERT OR IGNORE)…");
const res = await merge();
console.log(`   Tabelas: ${res.tables} · Inseridos: ${res.inserted} · Já existiam: ${res.skipped}`);

// ---------- grava perfil replica ----------
const cachePath = path.join(path.dirname(sourcePath), "life_os.replica.db");
// backup do config antigo (revert fácil)
if (fs.existsSync(CONFIG_PATH)) fs.copyFileSync(CONFIG_PATH, CONFIG_PATH + ".bak");
const newConfig = {
  ...config,
  profile: { mode: "replica", databasePath: cachePath, syncUrl: url, authToken },
  databasePath: cachePath,
};
fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
console.log(`\n→ Perfil trocado para 'replica' em life-os-config.json (backup: life-os-config.json.bak)`);
console.log(`   Cache local da réplica: ${cachePath}`);

// ---------- 1º pull do Turso → cache ----------
console.log("\n→ Primeiro pull do Turso para o cache local…");
const replica = createClient({ url: `file:${cachePath}`, syncUrl: url, authToken });
try {
  await replica.sync();
  const count = await replica.execute("SELECT count(*) AS n FROM User");
  console.log(`   Sync OK. Usuários no cache: ${count.rows[0]?.n ?? "?"}`);
} catch (e) {
  console.warn("   ⚠️ Pull inicial falhou (o app puxa de novo ao iniciar):", e.message);
} finally {
  replica.close();
}

console.log("\n✅ Modo Híbrido ativado!");
console.log("   • Inicie com 'npm run dev' — o app já abre em modo réplica.");
console.log("   • Pull automático a cada 60s + botão 'Sincronizar agora' em Configurações.");
console.log("\n↩️  Para reverter: restaure life-os-config.json.bak e apague life_os.replica.db*");
