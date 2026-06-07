import fs from "fs";
import type { Client } from "@libsql/client";
import { loadNodeLibsql } from "./prisma";

// =========================================================
// MIGRAÇÃO LOCAL → TURSO (carga inicial do modo Híbrido)
// =========================================================
// Sobe os dados de um arquivo SQLite local para um banco Turso, em modo MESCLAR:
// insere apenas as linhas cuja chave primária ainda NÃO existe no Turso
// (`INSERT OR IGNORE`), sem apagar/sobrescrever nada que já esteja lá. Assim a
// carga do PC convive com o que possa ter sido criado pelo celular.
//
// É genérica (independente do schema do Prisma): lê as tabelas reais do arquivo
// via `sqlite_master` e copia coluna a coluna. Para não violar foreign keys, as
// tabelas são inseridas em ordem de dependência (pais antes de filhos) e cada
// lote usa `PRAGMA defer_foreign_keys=ON` (resolve auto-referências). Observação:
// `PRAGMA foreign_keys=OFF` NÃO funciona aqui — o SQLite o ignora dentro de uma
// transação, e todo `batch()` roda numa transação.

export interface MigrationResult {
  /** Tabelas de dados processadas (exclui internas do SQLite/Prisma). */
  tables: number;
  /** Linhas efetivamente inseridas no Turso. */
  inserted: number;
  /** Linhas ignoradas por já existirem (mesma PK). */
  skipped: number;
}

/** Tabelas internas que não devem ser copiadas. */
function isInternalTable(name: string): boolean {
  return (
    name.startsWith("sqlite_") ||
    name.startsWith("_prisma") ||
    name.startsWith("libsql")
  );
}

/**
 * Ordena as tabelas por dependência de FK (pais antes dos filhos) consultando
 * `PRAGMA foreign_key_list`. Auto-referências e ciclos são ignorados no grafo
 * (resolvidos depois pelo `defer_foreign_keys` dentro do lote).
 */
async function topoSortByForeignKeys(src: Client, tables: string[]): Promise<string[]> {
  const present = new Set(tables);
  const parentsOf = new Map<string, Set<string>>();

  for (const table of tables) {
    const fks = await src.execute(`PRAGMA foreign_key_list("${table}")`);
    const parents = new Set<string>();
    for (const fk of fks.rows) {
      const ref = String(fk.table);
      // ignora auto-referência (mesma tabela) e refs a tabelas fora do conjunto
      if (ref !== table && present.has(ref)) parents.add(ref);
    }
    parentsOf.set(table, parents);
  }

  const ordered: string[] = [];
  const done = new Set<string>();
  const inStack = new Set<string>();

  const visit = (table: string) => {
    if (done.has(table) || inStack.has(table)) return; // ciclo → para (defer cobre)
    inStack.add(table);
    for (const parent of parentsOf.get(table) ?? []) visit(parent);
    inStack.delete(table);
    done.add(table);
    ordered.push(table); // pós-ordem: pais entram antes
  };

  for (const table of tables) visit(table);
  return ordered;
}

/**
 * Mescla os dados de `sourcePath` (arquivo SQLite local) no banco Turso indicado.
 * Pré-requisito: o schema já deve existir no Turso (rode `ensureSchema` antes).
 * Lança se o arquivo de origem não existir.
 */
export async function mergeSqliteIntoTurso(
  sourcePath: string,
  turso: { url: string; authToken?: string }
): Promise<MigrationResult> {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Arquivo de origem não encontrado: ${sourcePath}`);
  }

  const { createClient } = loadNodeLibsql();
  // Origem: arquivo local (somente leitura na prática — só fazemos SELECT).
  const src = createClient({ url: `file:${sourcePath}` });
  // Destino: Turso remoto direto (sem réplica) — a carga vai para o primário e a
  // réplica do PC puxa depois no próximo sync.
  const dst = createClient({ url: turso.url, authToken: turso.authToken });

  let tables = 0;
  let inserted = 0;
  let skipped = 0;

  try {
    const tableRows = await src.execute(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const dataTables = tableRows.rows
      .map((t) => String(t.name))
      .filter((name) => !isInternalTable(name));

    // Pais antes dos filhos: evita violar FK ao inserir com enforcement ligado.
    const ordered = await topoSortByForeignKeys(src, dataTables);

    for (const table of ordered) {
      const data = await src.execute(`SELECT * FROM "${table}"`);
      tables++;
      if (data.rows.length === 0) continue;

      const cols = data.columns;
      const colList = cols.map((c) => `"${c}"`).join(", ");
      const placeholders = cols.map(() => "?").join(", ");
      const sql = `INSERT OR IGNORE INTO "${table}" (${colList}) VALUES (${placeholders})`;

      // 1º statement do lote adia a checagem de FK até o commit (resolve
      // auto-referências, ex.: StudySubject.parentId). Lote = 1 transação.
      const stmts = [
        "PRAGMA defer_foreign_keys=ON",
        ...data.rows.map((row) => ({ sql, args: cols.map((c) => row[c]) })),
      ];
      const results = await dst.batch(stmts, "write");

      // results[0] é o PRAGMA; conta a partir do índice 1.
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
