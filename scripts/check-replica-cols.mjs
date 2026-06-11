// Verificação pontual: a réplica embarcada já recebeu as colunas novas vindas
// do primário Turso? Uso:
//   node scripts/check-replica-cols.mjs <Tabela> <col1> [col2 ...]
//   ex.: node scripts/check-replica-cols.mjs Event frequency recurrenceEnd
// Sem argumentos, mantém a checagem original (chaves de IA em Settings).
// Sai com código 0 quando todas existem; 1 caso contrário.
import { createClient } from "@libsql/client";

const [table = "Settings", ...wanted] = process.argv.slice(2);
const columns = wanted.length > 0 ? wanted : ["anthropicKey", "xaiKey", "openrouterKey"];

const db = createClient({ url: "file:prisma/life_os.replica.db" });
const r = await db.execute(`PRAGMA table_info('${table.replace(/'/g, "")}')`);
const cols = new Set(r.rows.map((x) => String(x.name)));
const missing = columns.filter((c) => !cols.has(c));
console.log(
  missing.length === 0
    ? `OK: ${table} já tem [${columns.join(", ")}] na réplica`
    : `Ainda sem as colunas em ${table}: [${missing.join(", ")}]`
);
db.close();
process.exit(missing.length === 0 ? 0 : 1);
