import fs from "fs";
import path from "path";
import type { PrismaClient } from "@prisma/client";
import type { DbDialect } from "./db-dialect";

// SQL baseline gerado a partir do schema (`npm run db:baseline` / derivados).
// Aplicá-lo via Prisma `$executeRawUnsafe` permite criar todas as tabelas
// em runtime SEM depender do CLI do Prisma (`npx prisma db push`), o que é
// essencial para um build desktop empacotado onde o npx não existe.
// Cada dialeto tem o SEU baseline (a regra de ouro do DATABASE_ROADMAP:
// schema canônico → schemas derivados → baselines andam juntos).
const BASELINE_BY_DIALECT: Partial<Record<DbDialect, string>> = {
  sqlite: path.join(process.cwd(), "prisma", "baseline.sql"),
  postgres: path.join(process.cwd(), "prisma", "baseline.postgres.sql"),
  mysql: path.join(process.cwd(), "prisma", "baseline.mysql.sql"),
};

/**
 * Caractere de citação de IDENTIFICADOR por dialeto. SQLite e Postgres usam
 * aspas duplas (`"User"`); o MySQL usa crases (`` `User` ``). Todo parse/geração
 * de SQL cru neste módulo decide a citação por AQUI — nunca assume aspas duplas.
 */
function identQuote(dialect: DbDialect): string {
  return dialect === "mysql" ? "`" : '"';
}

/**
 * Divide o arquivo SQL em statements individuais.
 * O baseline gerado pelo Prisma usa `;` como terminador e não contém
 * `;` dentro de literais de string, então um split simples é seguro.
 * Comentários (`-- ...`) são removidos linha a linha.
 */
function splitStatements(sql: string): string[] {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Erros que indicam que a estrutura já existe — ignorados (idempotência). */
function isAlreadyExistsError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : "";
  return msg.includes("already exists") || msg.includes("duplicate");
}

/**
 * Injeta `IF NOT EXISTS` em `CREATE TABLE` / `CREATE [UNIQUE] INDEX` quando ainda
 * não tem. Assim, rodar o baseline sobre um banco já criado NÃO gera erro (e o
 * Prisma não loga `prisma:error ... already exists`) — a operação fica silenciosa
 * e idempotente de verdade.
 */
function withIfNotExists(stmt: string, dialect: DbDialect = "sqlite"): string {
  let out = stmt.replace(/^(\s*CREATE\s+TABLE\s+)(?!IF\s+NOT\s+EXISTS)/i, "$1IF NOT EXISTS ");
  // `CREATE INDEX IF NOT EXISTS` NÃO existe no MySQL (erro de sintaxe). No MySQL
  // os índices já vêm DENTRO do CREATE TABLE; um eventual CREATE INDEX solto é
  // deixado cru e a idempotência fica por conta do catch de "duplicate".
  if (dialect !== "mysql") {
    out = out.replace(/^(\s*CREATE\s+(?:UNIQUE\s+)?INDEX\s+)(?!IF\s+NOT\s+EXISTS)/i, "$1IF NOT EXISTS ");
  }
  return out;
}

interface ParsedTable {
  table: string;
  columns: { name: string; def: string }[];
}

/**
 * Extrai, de cada `CREATE TABLE`, o nome da tabela e suas colunas (nome + a
 * definição da linha). O baseline do Prisma escreve UMA coluna por linha
 * (`    "col" TIPO ...,`), então um parse linha-a-linha é confiável. Linhas de
 * constraint (CONSTRAINT/FOREIGN KEY/PRIMARY KEY de tabela) são ignoradas.
 */
function parseTables(tableStatements: string[], dialect: DbDialect = "sqlite"): ParsedTable[] {
  const q = identQuote(dialect);
  // Escapa o caractere de citação para uso seguro dentro de uma RegExp.
  const qe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nameRe = new RegExp(`CREATE TABLE\\s+${qe}([^${qe}]+)${qe}`, "i");
  const colRe = new RegExp(`^${qe}([^${qe}]+)${qe}`);
  const parsed: ParsedTable[] = [];
  for (const stmt of tableStatements) {
    const nameMatch = stmt.match(nameRe);
    if (!nameMatch) continue;
    const columns: { name: string; def: string }[] = [];
    for (const rawLine of stmt.split("\n")) {
      const line = rawLine.trim();
      // Só linhas de coluna começam com a citação; pula `CREATE TABLE (`, `)`,
      // CONSTRAINT, UNIQUE INDEX, PRIMARY KEY (MySQL inline)…
      if (!line.startsWith(q)) continue;
      const colMatch = line.match(colRe);
      if (!colMatch) continue;
      parsedColumnPush(columns, colMatch[1], line);
    }
    parsed.push({ table: nameMatch[1], columns });
  }
  return parsed;
}

function parsedColumnPush(
  columns: { name: string; def: string }[],
  name: string,
  line: string
) {
  // Tira a vírgula final da definição p/ usar em `ADD COLUMN`.
  columns.push({ name, def: line.replace(/,\s*$/, "") });
}

/**
 * Reconciliação ADITIVA de colunas: em bancos com schema ANTIGO (tabelas já
 * existem, mas faltam colunas adicionadas depois — ex.: `deletedAt`), adiciona
 * as colunas ausentes via `ALTER TABLE ADD COLUMN`. Sem isso, criar um índice
 * sobre `deletedAt` falharia com "no such column" e a migração quebraria.
 * Best-effort: nunca derruba o fluxo por uma coluna individual.
 */
/** Colunas existentes de uma tabela, no SQL de inspeção certo do dialeto. */
async function listColumns(
  client: PrismaClient,
  table: string,
  dialect: DbDialect
): Promise<{ name: string }[]> {
  const safeTable = table.replace(/'/g, "''");
  if (dialect === "postgres") {
    return client.$queryRawUnsafe<{ name: string }[]>(
      `SELECT column_name AS name FROM information_schema.columns WHERE table_name = '${safeTable}' AND table_schema = current_schema()`
    );
  }
  if (dialect === "mysql") {
    // MySQL: o "schema" é o nome do banco — database() resolve para o banco ativo.
    return client.$queryRawUnsafe<{ name: string }[]>(
      `SELECT column_name AS name FROM information_schema.columns WHERE table_name = '${safeTable}' AND table_schema = database()`
    );
  }
  // SQLite/libSQL: PRAGMA (gate de dialeto — não existe fora da família SQLite).
  return client.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("${table}")`);
}

async function reconcileColumns(
  client: PrismaClient,
  tables: ParsedTable[],
  dialect: DbDialect
): Promise<void> {
  for (const { table, columns } of tables) {
    let info: { name: string }[];
    try {
      info = await listColumns(client, table, dialect);
    } catch {
      continue; // não conseguiu inspecionar — segue (CREATE TABLE cuida do resto)
    }
    // Tabela ainda não existe (será criada pelo CREATE TABLE) — nada a reconciliar.
    if (!Array.isArray(info) || info.length === 0) continue;

    const existing = new Set(info.map((c) => c.name));
    const q = identQuote(dialect);
    for (const col of columns) {
      if (existing.has(col.name)) continue;
      try {
        // col.def já traz o nome da coluna com a citação do baseline (crase no
        // MySQL); só a citação do NOME DA TABELA precisa do dialeto aqui.
        await client.$executeRawUnsafe(`ALTER TABLE ${q}${table}${q} ADD COLUMN ${col.def}`);
        console.log(`🧩 [ensureSchema] Coluna adicionada: ${table}.${col.name}`);
      } catch (error) {
        if (!isAlreadyExistsError(error)) {
          console.warn(`⚠️ [ensureSchema] Não consegui adicionar ${table}.${col.name}:`, error);
        }
      }
    }
  }
}

/**
 * Garante que todas as tabelas/colunas/índices do schema existam no banco
 * apontado por `client`. Idempotente e resiliente a schema ANTIGO:
 *   1. Cria as tabelas que faltam (ignora "already exists").
 *   2. Reconcilia colunas ausentes em tabelas pré-existentes (ADD COLUMN).
 *   3. Cria os índices (agora as colunas referenciadas já existem).
 * Lança em erros de SQL inesperados na criação de tabelas; falhas de índice
 * são toleradas (índice ausente é perf, não correção).
 */
export async function ensureSchema(
  client: PrismaClient,
  dialect: DbDialect = "sqlite"
): Promise<void> {
  const baselinePath = BASELINE_BY_DIALECT[dialect];
  if (!baselinePath) {
    throw new Error(
      `ensureSchema ainda não suporta o dialeto "${dialect}" (sem baseline derivado).`
    );
  }
  if (!fs.existsSync(baselinePath)) {
    throw new Error(
      `Baseline SQL não encontrado em ${baselinePath}. Rode \`npm run db:baseline\` (ou db:baseline:all).`
    );
  }

  const sql = fs.readFileSync(baselinePath, "utf-8");
  const statements = splitStatements(sql);
  const isCreateTable = (s: string) => /^\s*CREATE TABLE/i.test(s);

  // 1. Tabelas (CREATE TABLE IF NOT EXISTS — silencioso se já existir).
  for (const statement of statements.filter(isCreateTable)) {
    try {
      await client.$executeRawUnsafe(withIfNotExists(statement, dialect));
    } catch (error) {
      if (isAlreadyExistsError(error)) continue;
      throw error;
    }
  }

  // 2. Colunas faltantes (schema antigo → atual, aditivo).
  await reconcileColumns(client, parseTables(statements.filter(isCreateTable), dialect), dialect);

  // 3. Índices/constraints e demais statements. No MySQL, as FKs vêm como
  // ALTER TABLE ADD CONSTRAINT — falha por "duplicate" no rerun é tolerada.
  // Falha de índice/constraint é tolerada (é perf/integridade, não estrutura).
  for (const statement of statements.filter((s) => !isCreateTable(s))) {
    try {
      await client.$executeRawUnsafe(withIfNotExists(statement, dialect));
    } catch (error) {
      if (isAlreadyExistsError(error)) continue;
      console.warn("⚠️ [ensureSchema] Índice/statement ignorado:", error);
    }
  }
}
