// ============================================================================
// Life OS — montagem do pacote distribuível (DISTRIBUICAO Fase 1)
// ============================================================================
// Gera dist/app/ pronto para o Inno Setup (installer/lifeos.iss):
//
//   dist/app/
//    ├─ node/node.exe          ← runtime portátil (cópia do node atual)
//    ├─ server/                ← .next/standalone + static + public + nativos
//    ├─ launcher.mjs           ← abre o app (adaptação sem rebuild)
//    └─ stop.mjs               ← fecha o servidor em segundo plano
//
// Uso:  npm run dist            (build + montagem)
//       npm run dist -- --skip-build   (só remonta a pasta, build já feito)
//
// ⚠️ Roda `next build` — NÃO use com `npm run dev` aberto (clobbera o .next).

import { spawnSync } from "node:child_process";
import {
  cpSync, existsSync, mkdirSync, rmSync, statSync, readdirSync, copyFileSync, writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist", "app");
const SKIP_BUILD = process.argv.includes("--skip-build");
const isWin = process.platform === "win32";

function log(msg) { console.log(`  ${msg}`); }
function fail(msg) { console.error(`\n  ❌ ${msg}\n`); process.exit(1); }

function dirSizeMb(path) {
  let total = 0;
  const walk = (p) => {
    for (const e of readdirSync(p, { withFileTypes: true })) {
      const full = join(p, e.name);
      if (e.isDirectory()) walk(full);
      else total += statSync(full).size;
    }
  };
  try { walk(path); } catch { return "?"; }
  return (total / 1024 / 1024).toFixed(0);
}

console.log("\n🧰 Life OS — montando pacote distribuível\n");

// 1. Build standalone (minificado, sem código-fonte)
if (!SKIP_BUILD) {
  log("1/5 build standalone (LIFE_OS_STANDALONE=1)…");
  const res = spawnSync(isWin ? "npm.cmd" : "npm", ["run", "build"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env, LIFE_OS_STANDALONE: "1" },
  });
  if (res.status !== 0) fail("Build falhou — veja a saída acima.");
} else {
  log("1/5 build pulado (--skip-build).");
}

const STANDALONE = join(ROOT, ".next", "standalone");
if (!existsSync(join(STANDALONE, "server.js"))) {
  fail('Não achei .next/standalone/server.js — o build rodou com LIFE_OS_STANDALONE=1?');
}

// 2. Pasta limpa
log("2/5 montando dist/app…");
rmSync(join(ROOT, "dist"), { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const SERVER = join(DIST, "server");
// dereference: o standalone contém SYMLINKS (.next/node_modules) e criar
// symlink no Windows exige admin (EPERM) — copiamos o conteúdo real.
cpSync(STANDALONE, SERVER, { recursive: true, dereference: true });
cpSync(join(ROOT, ".next", "static"), join(SERVER, ".next", "static"), { recursive: true, dereference: true });
cpSync(join(ROOT, "public"), join(SERVER, "public"), { recursive: true, dereference: true });

// baselines: o ensureSchema lê de <cwd>/prisma/baseline*.sql no 1º uso.
mkdirSync(join(SERVER, "prisma"), { recursive: true });
copyFileSync(join(ROOT, "prisma", "baseline.sql"), join(SERVER, "prisma", "baseline.sql"));
if (existsSync(join(ROOT, "prisma", "baseline.postgres.sql"))) {
  copyFileSync(join(ROOT, "prisma", "baseline.postgres.sql"), join(SERVER, "prisma", "baseline.postgres.sql"));
}

// 3. Pacotes NATIVOS/externalizados que o trace do standalone NÃO carrega
//    (serverExternalPackages) — copiados inteiros do node_modules.
//    O ramo Postgres (pg + client derivado) também é externalizado; "pg-" e
//    "postgres-" cobrem as deps transitivas do driver.
log("3/5 copiando nativos (libsql, Prisma engine, pg)…");
const EXTERNALS = [
  "libsql", "@libsql", "@neon-rs", "detect-libc", ".prisma", "@prisma",
  "pg", "@lifeos", "pgpass", "split2", "obuf", "xtend",
];
const EXTERNAL_PREFIXES = ["pg-", "postgres-"];
const allModules = readdirSync(join(ROOT, "node_modules"));
const prefixed = allModules.filter((m) => EXTERNAL_PREFIXES.some((p) => m.startsWith(p)));
for (const pkg of [...EXTERNALS, ...prefixed]) {
  const src = join(ROOT, "node_modules", pkg);
  if (!existsSync(src)) { log(`   (aviso: node_modules/${pkg} não existe — pulado)`); continue; }
  cpSync(src, join(SERVER, "node_modules", pkg), { recursive: true, force: true, dereference: true });
}

// 4. Runtime portátil + launcher/stop adaptados
log("4/5 runtime portátil + launcher…");
mkdirSync(join(DIST, "node"), { recursive: true });
copyFileSync(process.execPath, join(DIST, "node", isWin ? "node.exe" : "node"));
copyFileSync(join(__dirname, "installed-launcher.mjs"), join(DIST, "launcher.mjs"));
copyFileSync(join(__dirname, "installed-stop.mjs"), join(DIST, "stop.mjs"));

// Atalhos .bat de conveniência (rodar direto da pasta, sem instalador)
writeFileSync(join(DIST, "Life OS.bat"),
  `@echo off\r\ncd /d "%~dp0"\r\n"node\\node.exe" launcher.mjs %*\r\n`);
writeFileSync(join(DIST, "Fechar Life OS.bat"),
  `@echo off\r\ncd /d "%~dp0"\r\n"node\\node.exe" stop.mjs\r\npause\r\n`);

// 5. Resumo
log("5/5 pronto!");
console.log(`\n  📦 dist/app montado (~${dirSizeMb(DIST)} MB)`);
console.log("     Teste local:   dist\\app\\Life OS.bat");
console.log("     Instalador:    abra installer/lifeos.iss no Inno Setup e compile");
console.log("                    (gera release/LifeOS-Setup.exe)\n");
