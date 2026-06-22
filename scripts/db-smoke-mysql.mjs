// Smoke test do MySQL com banco VIVO (DATABASE_ROADMAP - Fase 4 / Definition of
// Done): baseline -> CRUD nos tipos criticos -> round-trips. Cobre: financas c/
// Decimal, DateTime com timezone, e o teste-CHAVE do MySQL: TEXTO LONGO (200 KB)
// que so passa porque o derive promoveu os String de conteudo a LONGTEXT (o
// default VARCHAR(191) truncaria). Usa o CLIENT DERIVADO de verdade
// (@lifeos/client-mysql) pelo ENGINE NATIVO — sem driver adapter (nao ha p/
// MySQL no Prisma 5.22) — o MESMO caminho do app (buildAdapterClient).
//
// Uso:
//   docker compose -f docker-compose.db.yml up -d mysql
//   node scripts/db-smoke-mysql.mjs "mysql://lifeos:lifeos@localhost:53306/lifeos"
//   docker compose -f docker-compose.db.yml down -v

import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@lifeos/client-mysql");

const url = process.argv[2] || process.env.DATABASE_URL;
if (!url || !/^mysql:\/\//i.test(url)) {
  console.error('Uso: node scripts/db-smoke-mysql.mjs "mysql://user:senha@host:porta/db"');
  process.exit(1);
}

let failed = 0;
const ok = (msg) => console.log(`  [ok] ${msg}`);
const bad = (msg) => { failed++; console.log(`  [X] ${msg}`); };

// Engine nativo: a URL vai direto ao datasource, igual ao buildAdapterClient.
const prisma = new PrismaClient({ datasources: { db: { url } } });

// --- 1. Baseline (schema) -------------------------------------------------
console.log("1. Baseline do schema");
const existing = await prisma.$queryRawUnsafe(
  "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = database() AND table_name = 'User'",
);
const hasUser = Number(existing?.[0]?.n ?? 0) > 0;
if (hasUser) {
  ok("tabelas ja existem (baseline pulado, como o ensureSchema faria)");
} else {
  // Mesma divisao do ensureSchema (db-bootstrap): tira comentarios e quebra em
  // statements. Ordem do arquivo = tabelas primeiro, depois FKs (ALTER ADD).
  const sql = fs.readFileSync("prisma/baseline.mysql.sql", "utf8");
  const stmts = sql
    .split("\n").filter((l) => !l.trim().startsWith("--")).join("\n")
    .split(";").map((s) => s.trim()).filter(Boolean);
  for (const s of stmts) await prisma.$executeRawUnsafe(s);
  ok(`baseline.mysql.sql aplicado num banco vazio (${stmts.length} statements)`);
}

// --- 2. Client derivado + CRUD --------------------------------------------
console.log("2. CRUD com o client derivado (@lifeos/client-mysql)");
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
  const when = new Date("2026-06-22T23:00:00-03:00"); // 23h em UTC-3 (round-trip de fuso)
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

  // TESTE-CHAVE DO MYSQL: 200 KB num campo String. So passa porque content virou
  // LONGTEXT no derive — com o VARCHAR(191) padrao, isto estouraria ("Data too long").
  const longJson = JSON.stringify({ v: 1, blob: "x".repeat(200_000) });
  const plan = await prisma.workoutPlan.create({
    data: { name: "Plano Smoke", content: longJson, userId },
  });
  ok(`WorkoutPlan criado (content ${Math.round(longJson.length / 1024)} KB em LONGTEXT)`);

  // --- 3. Round-trips -----------------------------------------------------
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
  if (planBack.content === longJson) ok("Texto longo/JSON-string (200 KB) voltou identico");
  else bad(`Texto longo divergiu (lido ${Math.round((planBack.content?.length ?? 0) / 1024)} KB) — VARCHAR truncou?`);

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
}

console.log(failed === 0 ? "\nSMOKE OK - MySQL aprovado." : `\nSMOKE FALHOU (${failed} problema(s)).`);
process.exit(failed === 0 ? 0 : 1);
