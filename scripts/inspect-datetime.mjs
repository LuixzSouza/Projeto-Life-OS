// Diagnóstico rápido: procura colunas DATETIME com valores INTEGER (ms) no
// SQLite local — o formato que o adapter libSQL grava e o Prisma nativo NÃO lê.
// Uso: node scripts/inspect-datetime.mjs [caminho-do-db]
import { createClient } from "@libsql/client";

const dbPath = process.argv[2] || "prisma/life_os.db";
const db = createClient({ url: `file:${dbPath}` });

const tables = await db.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'",
);

let totalBad = 0;
for (const t of tables.rows) {
  const table = t.name;
  const cols = await db.execute(`PRAGMA table_info("${table}")`);
  const dtCols = cols.rows.filter((c) => String(c.type).toUpperCase() === "DATETIME").map((c) => c.name);
  for (const col of dtCols) {
    const res = await db.execute(
      `SELECT COUNT(*) AS bad FROM "${table}" WHERE typeof("${col}") = 'integer'`,
    );
    const bad = Number(res.rows[0].bad);
    if (bad > 0) {
      totalBad += bad;
      const sample = await db.execute(
        `SELECT "${col}" AS v FROM "${table}" WHERE typeof("${col}") = 'integer' LIMIT 2`,
      );
      console.log(`${table}.${col}: ${bad} linha(s) INTEGER — ex.: ${sample.rows.map((r) => r.v).join(", ")}`);
    }
  }
}

// Amostra do formato TEXT que o Prisma nativo grava (referência p/ conversão).
const ref = await db.execute(`SELECT dueDate FROM "Invoice" WHERE typeof(dueDate)='text' LIMIT 2`);
console.log("\nFormato TEXT de referência (Invoice.dueDate):", ref.rows.map((r) => JSON.stringify(r.dueDate)).join(" | ") || "(nenhum)");
console.log(`\nTotal de valores INTEGER em colunas DATETIME: ${totalBad}`);
db.close();
