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
 * Garante que todas as tabelas/índices do schema existam no banco apontado
 * por `client`. Idempotente: pode rodar em banco vazio (cria tudo) ou em banco
 * já criado (ignora "already exists"). Lança em qualquer outro erro de SQL.
 */
export async function ensureSchema(client: PrismaClient): Promise<void> {
  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(
      `Baseline SQL não encontrado em ${BASELINE_PATH}. Rode \`npm run db:baseline\`.`
    );
  }

  const sql = fs.readFileSync(BASELINE_PATH, "utf-8");
  const statements = splitStatements(sql);

  for (const statement of statements) {
    try {
      await client.$executeRawUnsafe(statement);
    } catch (error) {
      if (isAlreadyExistsError(error)) continue;
      throw error;
    }
  }
}
