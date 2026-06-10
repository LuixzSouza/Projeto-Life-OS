// Verificação pontual: a réplica embarcada já recebeu as colunas novas de
// Settings (anthropicKey/xaiKey/openrouterKey) vindas do primário Turso?
// Sai com código 0 quando as três existem; 1 caso contrário.
import { createClient } from "@libsql/client";

const db = createClient({ url: "file:prisma/life_os.replica.db" });
const r = await db.execute(`PRAGMA table_info('Settings')`);
const cols = new Set(r.rows.map((x) => String(x.name)));
const ok = ["anthropicKey", "xaiKey", "openrouterKey"].every((c) => cols.has(c));
console.log(ok ? "OK: colunas presentes na réplica" : "Ainda sem as colunas");
process.exit(ok ? 0 : 1);
