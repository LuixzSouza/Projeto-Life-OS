// Smoke test do PostgreSQL com banco VIVO (DATABASE_ROADMAP - Fase 1 /
// Definition of Done): baseline -> CRUD nos tipos criticos -> round-trips.
// Cobre: financas c/ Decimal, DateTime com timezone, texto longo e
// JSON-em-string (WorkoutPlan) usando o CLIENT DERIVADO de verdade
// (@lifeos/client-postgres + @prisma/adapter-pg), o mesmo caminho do app.
//
// Uso:
//   docker run -d --name lifeos-pg-smoke -e POSTGRES_PASSWORD=lifeos \
//     -e POSTGRES_DB=lifeos -p 55432:5432 postgres:16-alpine
//   node scripts/db-smoke-postgres.mjs "postgresql://postgres:lifeos@localhost:55432/lifeos"

import fs from "fs";
import { Client } from "pg";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@lifeos/client-postgres";

const url = process.argv[2] || process.env.DATABASE_URL;
if (!url || !/^postgres(ql)?:\/\//i.test(url)) {
  console.error('Uso: node scripts/db-smoke-postgres.mjs "postgresql://user:senha@host:porta/db"');
  process.exit(1);
}
const ssl = /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false };

let failed = 0;
const ok = (msg) => console.log(`  [ok] ${msg}`);
const bad = (msg) => { failed++; console.log(`  [X] ${msg}`); };

// --- 1. Baseline (schema) -------------------------------------------------
console.log("1. Baseline do schema");
const raw = new Client({ connectionString: url, ssl, connectionTimeoutMillis: 12000 });
await raw.connect();
const hasUser = await raw.query(
  "SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'User'"
);
if (hasUser.rows[0].n > 0) {
  ok("tabelas ja existem (baseline pulado, como o ensureSchema faria)");
} else {
  const sql = fs.readFileSync("prisma/baseline.postgres.sql", "utf8");
  await raw.query(sql);
  ok("baseline.postgres.sql aplicado num banco vazio");
}
// Idempotencia do reconcilio aditivo: a checagem acima ja e o gate do
// ensureSchema (2a rodada nao reaplica) — confirmada pelo caminho do "pulado".
await raw.end();

// --- 2. Client derivado + CRUD ---------------------------------------------
console.log("2. CRUD com o client derivado (@lifeos/client-postgres)");
const pool = new pg.Pool({ connectionString: url, max: 2, ssl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const stamp = Date.now();
const email = `smoke-${stamp}@lifeos.test`;
let userId = null;

try {
  // Decimal no User.salary
  const user = await prisma.user.create({
    data: { name: "Smoke Test", email, password: "x", salary: "1234.56" },
  });
  userId = user.id;
  ok(`User criado (${user.id.slice(0, 8)}...)`);

  // Financas: Account + Transaction com Decimal e DateTime com fuso
  const account = await prisma.account.create({
    data: { name: "Conta Smoke", type: "checking", balance: "100.10", userId },
  });
  const when = new Date("2026-06-11T23:00:00-03:00"); // 23h em UTC-3 (round-trip de fuso)
  const tx = await prisma.transaction.create({
    data: {
      description: "Lancamento smoke",
      amount: "123.45",
      type: "expense",
      category: "smoke",
      date: when,
      accountId: account.id,
      userId,
    },
  });
  ok("Account + Transaction criados");

  // Treino: JSON-em-string + texto longo (200 KB)
  const longJson = JSON.stringify({ v: 1, blob: "x".repeat(200_000) });
  const plan = await prisma.workoutPlan.create({
    data: { name: "Plano Smoke", content: longJson, userId },
  });
  ok(`WorkoutPlan criado (content ${Math.round(longJson.length / 1024)} KB)`);

  // --- 3. Round-trips -------------------------------------------------------
  console.log("3. Round-trips de tipo");
  const txBack = await prisma.transaction.findUniqueOrThrow({ where: { id: tx.id } });
  if (String(txBack.amount) === "123.45") ok("Decimal: 123.45 voltou exato");
  else bad(`Decimal divergiu: ${String(txBack.amount)}`);

  if (txBack.date.getTime() === when.getTime()) {
    ok(`DateTime: ${when.toISOString()} voltou no mesmo instante`);
  } else {
    bad(`DateTime divergiu: gravado ${when.toISOString()}, lido ${txBack.date.toISOString()}`);
  }

  const planBack = await prisma.workoutPlan.findUniqueOrThrow({ where: { id: plan.id } });
  if (planBack.content === longJson) ok("Texto longo/JSON-string voltou identico");
  else bad("Texto longo divergiu no round-trip");

  const userBack = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (String(userBack.salary) === "1234.56") ok("Decimal opcional (salary) ok");
  else bad(`salary divergiu: ${String(userBack.salary)}`);

  // update + delete fecham o ciclo CRUD
  await prisma.transaction.update({ where: { id: tx.id }, data: { description: "editado" } });
  ok("UPDATE ok");
} catch (e) {
  bad(`erro no CRUD: ${e?.message ?? e}`);
} finally {
  // --- 4. Limpeza (Cascade do User leva tudo) -----------------------------
  console.log("4. Limpeza");
  try {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
      ok("dados do smoke removidos (cascade)");
    }
  } catch (e) {
    bad(`limpeza falhou: ${e?.message ?? e}`);
  }
  await prisma.$disconnect().catch(() => {});
  await pool.end().catch(() => {});
}

console.log(failed === 0 ? "\nSMOKE OK - Postgres aprovado." : `\nSMOKE FALHOU (${failed} problema(s)).`);
process.exit(failed === 0 ? 0 : 1);
