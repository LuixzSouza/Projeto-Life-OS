// Probe de conexão Turso — diagnóstico completo da conexão usada pelo app.
// Usa as MESMAS credenciais do .env e o MESMO client (@libsql/client/web).
// Roda: node scripts/turso-probe.mjs
import fs from "fs";
import { createClient } from "@libsql/client/web";

// --- parse simples do .env (tira aspas ao redor) ---
function loadEnv() {
  const out = {};
  const raw = fs.readFileSync(".env", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function b64urlJson(part) {
  try {
    return JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

const env = loadEnv();
const url = env.TURSO_DATABASE_URL;
const token = env.TURSO_AUTH_TOKEN;

const mask = (s) => (s ? `${s.slice(0, 10)}…(${s.length} chars)` : "(vazio)");
console.log("URL  :", url || "(vazio)");
console.log("TOKEN:", mask(token), token?.startsWith("eyJ") ? "→ parece JWT ✅" : "→ NÃO parece JWT ⚠️");

// --- decodifica o JWT para entender o que ele autoriza ---
if (token?.startsWith("eyJ")) {
  const [h, p] = token.split(".");
  const header = b64urlJson(h);
  const payload = b64urlJson(p);
  console.log("  header :", JSON.stringify(header));
  console.log("  payload:", JSON.stringify(payload));
  if (payload?.exp) {
    const when = new Date(payload.exp * 1000).toISOString();
    console.log("  exp    :", when, payload.exp * 1000 < Date.now() ? "→ EXPIRADO ❌" : "→ válido");
  } else {
    console.log("  exp    : (sem expiração)");
  }
}
console.log("—".repeat(48));

// Extrai o host do banco a partir da URL p/ comparar com o token.
const host = (() => {
  try { return new URL(url.replace(/^libsql:/, "https:")).host; } catch { return null; }
})();

async function tryConnect(label, connUrl) {
  try {
    const client = createClient({ url: connUrl, authToken: token });
    const r = await client.execute("SELECT 1 AS ok;");
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    );
    console.log(`✅ [${label}] CONECTOU. SELECT 1 = ${JSON.stringify(r.rows)}`);
    console.log(`   Tabelas (${tables.rows.length}): ${tables.rows.map((t) => t.name).join(", ") || "(vazio)"}`);
    return true;
  } catch (e) {
    const msg = e?.message || String(e);
    const code = /status (\d+)/.exec(msg)?.[1];
    console.log(`❌ [${label}] FALHOU${code ? ` (HTTP ${code})` : ""}: ${msg}`);
    return false;
  }
}

console.log(`Banco (host da URL): ${host}\n`);
const ok1 = await tryConnect("libsql://", url);
const ok2 = ok1 ? false : await tryConnect("https://", url.replace(/^libsql:/, "https:"));

console.log("\n" + "—".repeat(48));
if (ok1 || ok2) {
  console.log("🎉 Conexão OK — o /setup vai criar o schema sem erro.");
} else {
  console.log("DIAGNÓSTICO 401 (token recusado pelo banco). Causas mais comuns:");
  console.log("  1. Token gerado para OUTRO banco (não o", host + ").");
  console.log("  2. Banco foi recriado/renomeado → a chave de assinatura mudou (token antigo inválido).");
  console.log("  3. Token de conta/org diferente do dono do banco.");
  console.log("→ Solução: no dashboard, ABRA o banco", host?.split(".")[0], "e gere um token NOVO por ali.");
  process.exitCode = 1;
}
