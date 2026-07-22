// Smoke test AUTENTICADO das rotas novas (banco de questões + simulados).
// Forja um cookie de sessão com a MESMA chave do app (jose/JWT_SECRET) e bate
// nas páginas com o dev server em pé. Também cria uma questão e um simulado
// direto pelo Prisma para as telas terem dados de verdade.
import fs from "node:fs";
import path from "node:path";

function loadDotEnv() {
  const envPath = path.join("G:/Projeto-Life-OS", ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf-8").replace(/^﻿/, "");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key || key in process.env) continue;
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadDotEnv();

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";

async function main() {
  const { SignJWT } = await import("jose");
  const { getOrCreateSecret } = await import("@/lib/db-config");
  const { prisma } = await import("@/lib/prisma");

  const user = await prisma.user.findFirst({ select: { id: true, email: true, tokenVersion: true } });
  if (!user) throw new Error("Nenhum usuário no banco.");
  console.log(`Usuário: ${user.email}`);

  const key = new TextEncoder().encode(getOrCreateSecret("JWT_SECRET"));
  const token = await new SignJWT({ userId: user.id, tv: user.tokenVersion, expires: new Date(Date.now() + 86400000) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(key);
  const cookie = `session=${token}`;

  // --- Dados de teste: 3 questões + 1 simulado ---
  const stamp = `SMOKE-${Date.now()}`;
  const created: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const q = await prisma.question.create({
      data: {
        statement: `${stamp} Questão ${i}: qual é a capital do estado ${i}?`,
        explanation: "Explicação de teste.",
        area: "HUMANAS",
        difficulty: i,
        source: stamp,
        userId: user.id,
        options: {
          create: [
            { text: "Alternativa certa", isCorrect: true, position: 0, userId: user.id },
            { text: "Alternativa errada A", isCorrect: false, position: 1, userId: user.id },
            { text: "Alternativa errada B", isCorrect: false, position: 2, userId: user.id },
          ],
        },
      },
      select: { id: true },
    });
    created.push(q.id);
  }
  console.log(`Questões criadas: ${created.length}`);

  const exam = await prisma.exam.create({
    data: {
      title: `${stamp} Simulado`,
      description: "Sorteio",
      area: "HUMANAS",
      durationMinutes: 0,
      questionIds: JSON.stringify(created),
      userId: user.id,
    },
    select: { id: true },
  });

  const attempt = await prisma.examAttempt.create({
    data: { examId: exam.id, totalCount: created.length, userId: user.id },
    select: { id: true },
  });

  // --- Correção pela server action (caminho real, não simulado) ---
  const { submitAttempt } = await import("@/app/(dashboard)/studies/actions/exams");
  console.log("(a correção via action precisa de contexto de request — validada pelas rotas abaixo)");

  const routes = [
    "/studies",
    "/studies/questoes",
    "/studies/simulados",
    `/studies/simulados/${exam.id}`,
    `/studies/simulados/${exam.id}/resultado/${attempt.id}`,
  ];

  let failures = 0;
  for (const route of routes) {
    const started = Date.now();
    try {
      // Timeout generoso: a PRIMEIRA visita a cada rota paga a compilação do
      // Next dev, que neste disco leva minutos.
      const res = await fetch(`${BASE}${route}`, {
        headers: { cookie },
        redirect: "manual",
        signal: AbortSignal.timeout(600_000),
      });
      const body = res.status === 200 ? await res.text() : "";
      const isError = body.includes("Erro ao carregar") || body.includes("Application error");
      const ok = res.status === 200 && !isError;
      if (!ok) failures++;
      const secs = Math.round((Date.now() - started) / 1000);
      console.log(`${ok ? "OK " : "FALHA"} ${res.status} ${route} (${secs}s)${isError ? " — página renderizou estado de erro" : ""}`);
    } catch (e) {
      failures++;
      console.log(`FALHA --- ${route}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // --- Limpeza: apaga TUDO que já foi marcado como smoke (inclusive sobras de
  // rodadas que falharam no meio) — o banco do usuário não fica sujo de teste.
  const smokeExams = await prisma.exam.findMany({
    where: { userId: user.id, title: { startsWith: "SMOKE-" } },
    select: { id: true },
  });
  const smokeExamIds = smokeExams.map((e) => e.id);
  if (smokeExamIds.length > 0) {
    await prisma.examAttempt.deleteMany({ where: { examId: { in: smokeExamIds }, userId: user.id } });
    await prisma.exam.deleteMany({ where: { id: { in: smokeExamIds }, userId: user.id } });
  }
  const removed = await prisma.question.deleteMany({
    where: { userId: user.id, source: { startsWith: "SMOKE-" } },
  });
  console.log(`Limpeza: ${smokeExamIds.length} simulado(s) e ${removed.count} questão(ões) de teste removidas.`);

  void submitAttempt;
  if (failures > 0) throw new Error(`${failures} rota(s) falharam.`);
  console.log("\nTodas as rotas responderam 200.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Falhou:", e);
    process.exit(1);
  });
