// Reconcilia o schema do banco Turso (produção) com prisma/baseline.sql.
// Porta a lógica de lib/db-bootstrap.ts (ensureSchema) usando o client libSQL web
// — o MESMO usado pelo app em modo "cloud". Aditivo e idempotente:
//   1. CREATE TABLE IF NOT EXISTS (cria tabelas que faltam)
//   2. ALTER TABLE ADD COLUMN (adiciona colunas novas em tabelas existentes)
//   3. CREATE INDEX IF NOT EXISTS (índices)
// Nunca apaga/recria nada. Roda: node scripts/turso-reconcile.mjs
import fs from "fs";
import { createClient } from "@libsql/client/web";

function loadEnv() {
  const out = {};
  const raw = fs.readFileSync(".env", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const env = loadEnv();
const url = env.TURSO_DATABASE_URL || env.TURSO_URL_REF;
const authToken = env.TURSO_AUTH_TOKEN || env.TURSO_TOKEN_REF;

if (!url || !authToken) {
  console.error("❌ Faltam TURSO_DATABASE_URL/TURSO_AUTH_TOKEN (ou *_REF) no .env");
  process.exit(1);
}
console.log("Banco:", url);

const db = createClient({ url, authToken });

// --- mesmas helpers do db-bootstrap.ts ---
function splitStatements(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isAlreadyExistsError(error) {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return msg.includes("already exists") || msg.includes("duplicate");
}

function withIfNotExists(stmt) {
  return stmt
    .replace(/^(\s*CREATE\s+TABLE\s+)(?!IF\s+NOT\s+EXISTS)/i, "$1IF NOT EXISTS ")
    .replace(/^(\s*CREATE\s+(?:UNIQUE\s+)?INDEX\s+)(?!IF\s+NOT\s+EXISTS)/i, "$1IF NOT EXISTS ");
}

function parseTables(tableStatements) {
  const parsed = [];
  for (const stmt of tableStatements) {
    const nameMatch = stmt.match(/CREATE TABLE\s+"([^"]+)"/i);
    if (!nameMatch) continue;
    const columns = [];
    for (const rawLine of stmt.split("\n")) {
      const line = rawLine.trim();
      if (!line.startsWith('"')) continue;
      const colMatch = line.match(/^"([^"]+)"/);
      if (!colMatch) continue;
      columns.push({ name: colMatch[1], def: line.replace(/,\s*$/, "") });
    }
    parsed.push({ table: nameMatch[1], columns });
  }
  return parsed;
}

async function reconcileColumns(tables) {
  let added = 0;
  for (const { table, columns } of tables) {
    let info;
    try {
      info = (await db.execute(`PRAGMA table_info("${table}")`)).rows;
    } catch {
      continue;
    }
    if (!Array.isArray(info) || info.length === 0) continue; // tabela nova → CREATE cuidou
    const existing = new Set(info.map((c) => String(c.name)));
    for (const col of columns) {
      if (existing.has(col.name)) continue;
      try {
        await db.execute(`ALTER TABLE "${table}" ADD COLUMN ${col.def}`);
        console.log(`🧩 Coluna adicionada: ${table}.${col.name}`);
        added++;
      } catch (error) {
        if (!isAlreadyExistsError(error)) {
          console.warn(`⚠️ Não consegui adicionar ${table}.${col.name}:`, error.message);
        }
      }
    }
  }
  return added;
}

const sql = fs.readFileSync("prisma/baseline.sql", "utf-8");
const statements = splitStatements(sql);
const isCreateTable = (s) => /^\s*CREATE TABLE/i.test(s);

let createdTables = 0;
for (const statement of statements.filter(isCreateTable)) {
  try {
    await db.execute(withIfNotExists(statement));
    createdTables++;
  } catch (error) {
    if (isAlreadyExistsError(error)) continue;
    console.error("❌ Erro criando tabela:", error.message);
    throw error;
  }
}

const addedCols = await reconcileColumns(parseTables(statements.filter(isCreateTable)));

let idx = 0;
for (const statement of statements.filter((s) => !isCreateTable(s))) {
  try {
    await db.execute(withIfNotExists(statement));
    idx++;
  } catch (error) {
    if (isAlreadyExistsError(error)) continue;
    console.warn("⚠️ Índice/statement ignorado:", error.message);
  }
}

console.log(`\n✅ Reconciliação concluída.`);
console.log(`   Tabelas garantidas: ${createdTables} · Colunas novas: ${addedCols} · Índices: ${idx}`);
