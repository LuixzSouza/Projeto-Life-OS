import fs from "fs";
import path from "path";
import type { PrismaClient } from "@prisma/client";

// SQL baseline gerado a partir do schema (`npm run db:baseline`).
// Aplicá-lo via Prisma `$executeRawUnsafe` permite criar todas as tabelas
// em runtime SEM depender do CLI do Prisma (`npx prisma db push`), o que é
// essencial para um build desktop empacotado onde o npx não existe.
const BASELINE_PATH = path.join(process.cwd(), "prisma", "baseline.sql");

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
function withIfNotExists(stmt: string): string {
  return stmt
    .replace(/^(\s*CREATE\s+TABLE\s+)(?!IF\s+NOT\s+EXISTS)/i, "$1IF NOT EXISTS ")
    .replace(/^(\s*CREATE\s+(?:UNIQUE\s+)?INDEX\s+)(?!IF\s+NOT\s+EXISTS)/i, "$1IF NOT EXISTS ");
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
function parseTables(tableStatements: string[]): ParsedTable[] {
  const parsed: ParsedTable[] = [];
  for (const stmt of tableStatements) {
    const nameMatch = stmt.match(/CREATE TABLE\s+"([^"]+)"/i);
    if (!nameMatch) continue;
    const columns: { name: string; def: string }[] = [];
    for (const rawLine of stmt.split("\n")) {
      const line = rawLine.trim();
      // Só linhas de coluna começam com aspas; pula `CREATE TABLE (`, `)`, CONSTRAINT…
      if (!line.startsWith('"')) continue;
      const colMatch = line.match(/^"([^"]+)"/);
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
async function reconcileColumns(client: PrismaClient, tables: ParsedTable[]): Promise<void> {
  for (const { table, columns } of tables) {
    let info: { name: string }[];
    try {
      info = await client.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("${table}")`);
    } catch {
      continue; // não conseguiu inspecionar — segue (CREATE TABLE cuida do resto)
    }
    // Tabela ainda não existe (será criada pelo CREATE TABLE) — nada a reconciliar.
    if (!Array.isArray(info) || info.length === 0) continue;

    const existing = new Set(info.map((c) => c.name));
    for (const col of columns) {
      if (existing.has(col.name)) continue;
      try {
        await client.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN ${col.def}`);
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
export async function ensureSchema(client: PrismaClient): Promise<void> {
  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(
      `Baseline SQL não encontrado em ${BASELINE_PATH}. Rode \`npm run db:baseline\`.`
    );
  }

  const sql = fs.readFileSync(BASELINE_PATH, "utf-8");
  const statements = splitStatements(sql);
  const isCreateTable = (s: string) => /^\s*CREATE TABLE/i.test(s);

  // 1. Tabelas (CREATE TABLE IF NOT EXISTS — silencioso se já existir).
  for (const statement of statements.filter(isCreateTable)) {
    try {
      await client.$executeRawUnsafe(withIfNotExists(statement));
    } catch (error) {
      if (isAlreadyExistsError(error)) continue;
      throw error;
    }
  }

  // 2. Colunas faltantes (schema antigo → atual, aditivo).
  await reconcileColumns(client, parseTables(statements.filter(isCreateTable)));

  // 3. Índices e demais statements (CREATE INDEX IF NOT EXISTS — silencioso).
  // Falha de índice é tolerada (índice ausente é perf, não correção).
  for (const statement of statements.filter((s) => !isCreateTable(s))) {
    try {
      await client.$executeRawUnsafe(withIfNotExists(statement));
    } catch (error) {
      if (isAlreadyExistsError(error)) continue;
      console.warn("⚠️ [ensureSchema] Índice/statement ignorado:", error);
    }
  }
}
