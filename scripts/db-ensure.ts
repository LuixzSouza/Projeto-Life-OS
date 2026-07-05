// Aplica o schema (baseline) ao banco ATIVO sem depender do `prisma db push`.
// Necessário no modo réplica/Turso: o `db push` mira o DATABASE_URL do .env
// (arquivo local), NÃO o primário que o app usa. Aqui resolvemos o perfil real
// (life-os-config.json) e, se for réplica, aplicamos direto no primário Turso.
//
// Uso: npm run db:ensure   (ou: npx tsx scripts/db-ensure.ts)
//
// IMPORTANTE: carregamos o .env À MÃO antes de tocar qualquer módulo de crypto.
// O `tsx` (ao contrário do Next.js) não lê o .env sozinho — sem isto, o
// getOrCreateSecret geraria uma ENCRYPTION_KEY nova e a gravaria no config,
// divergindo da chave real do app (bug já corrigido uma vez).
import fs from "node:fs";
import path from "node:path";

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf-8").replace(/^﻿/, "");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key || key in process.env) continue; // não sobrescreve o que já veio do ambiente
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadDotEnv();

async function main() {
  const { getDbProfile } = await import("../lib/db-config");
  const { buildAdapterClient } = await import("../lib/prisma");
  const { ensureSchema } = await import("../lib/db-bootstrap");

  const profile = getDbProfile();
  if (!profile) throw new Error("Sem perfil de banco (life-os-config.json / env). Rode o /setup primeiro.");

  const where = "databasePath" in profile ? profile.databasePath : profile.url;
  console.log(`Perfil ativo: ${profile.mode} → ${where}`);

  // Réplica: aplicar no PRIMÁRIO Turso (cloud). A réplica local puxa no próximo sync.
  let target = profile;
  let dialect: "sqlite" | "postgres" | "mysql" = "sqlite";
  if (profile.mode === "replica") {
    target = { mode: "cloud", provider: "turso", url: profile.syncUrl, authToken: profile.authToken };
    console.log(`Réplica → aplicando no primário: ${profile.syncUrl}`);
  } else if (profile.mode === "cloud") {
    dialect = profile.provider === "postgres" || profile.provider === "supabase" ? "postgres"
      : profile.provider === "mysql" ? "mysql" : "sqlite";
  }

  const built = buildAdapterClient(target);
  try {
    await ensureSchema(built.client, dialect);
    console.log("✅ Schema aplicado (idempotente).");
  } finally {
    await built.client.$disconnect().catch(() => {});
    if (built.libsql) built.libsql.close();
  }
}

main()
  .then(() => { console.log("Concluído."); process.exit(0); })
  .catch((e) => { console.error("Falhou:", e); process.exit(1); });
