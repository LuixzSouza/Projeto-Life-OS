// Launcher do Life OS INSTALADO (build standalone — sem código-fonte, sem rebuild).
// Copiado para %LOCALAPPDATA%\LifeOS\app\launcher.mjs pelo scripts/dist.mjs.
//
// Fluxo: já está no ar? só abre o navegador. Senão: acha porta livre
// (3000-3011), sobe o server.js standalone em segundo plano (desacoplado),
// espera ficar pronto e abre o app. Dados do usuário ficam FORA da pasta do
// app (LIFE_OS_DATA_DIR), sobrevivendo a updates/desinstalação.
//
// Uso: node launcher.mjs [--no-open]

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";

const APP_DIR = dirname(fileURLToPath(import.meta.url)); // ...\LifeOS\app
const SERVER_DIR = join(APP_DIR, "server");
const DATA_DIR =
  process.env.LIFE_OS_DATA_DIR ||
  join(process.env.LOCALAPPDATA ?? APP_DIR, "LifeOS", "data");
const LOG_DIR = join(DATA_DIR, "logs");
const PID_FILE = join(DATA_DIR, "server.pid");
const NO_OPEN = process.argv.includes("--no-open");
const START_PORT = Number(process.env.PORT) || 3000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const urlFor = (port) => `http://localhost:${port}`;

async function isLifeOsUp(port) {
  try {
    const r = await fetch(urlFor(port) + "/login", { signal: AbortSignal.timeout(2000) });
    if (r.status >= 500) return false;
    const body = await r.text();
    return /id="__next"|__next_f|Life\s*OS/i.test(body) || r.ok;
  } catch {
    return false;
  }
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, "127.0.0.1");
  });
}

function findBrowser() {
  const candidates = [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function openApp(port) {
  if (NO_OPEN) return;
  const url = urlFor(port);
  const browser = findBrowser();
  try {
    if (browser) {
      spawn(browser, [`--app=${url}`, "--new-window"], { detached: true, stdio: "ignore" }).unref();
    } else if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    }
  } catch { /* servidor segue no ar; o usuário pode abrir manualmente */ }
}

async function waitReady(port, timeoutMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(urlFor(port) + "/login", { signal: AbortSignal.timeout(2500) });
      if (r.status > 0 && r.status < 500) return true;
    } catch { /* ainda subindo */ }
    await sleep(400);
  }
  return false;
}

async function main() {
  console.log("\n  Life OS — iniciando...\n");
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });

  // Já aberto em alguma porta do range? Só abre a janela.
  for (let p = START_PORT; p < START_PORT + 12; p++) {
    if (await isLifeOsUp(p)) {
      console.log(`  Já está no ar em ${urlFor(p)} — abrindo a janela.`);
      openApp(p);
      return;
    }
  }

  // Porta livre
  let port = START_PORT;
  for (let p = START_PORT; p < START_PORT + 12; p++) {
    if (await isPortFree(p)) { port = p; break; }
  }

  // Sobe o standalone em segundo plano (desacoplado desta janela).
  // HOSTNAME 0.0.0.0: o celular na mesma rede consegue acessar (Acesso Remoto).
  const logFd = openSync(join(LOG_DIR, "server.log"), "a");
  const child = spawn(process.execPath, [join(SERVER_DIR, "server.js")], {
    cwd: SERVER_DIR,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", logFd, logFd],
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "0.0.0.0",
      LIFE_OS_DATA_DIR: DATA_DIR,
    },
  });
  child.unref();
  try { writeFileSync(PID_FILE, String(child.pid), "utf8"); } catch { /* segue */ }

  console.log(`  Servidor subindo na porta ${port} (dados em ${DATA_DIR})...`);
  const ready = await waitReady(port);
  if (!ready) {
    console.error("  O servidor demorou demais. Veja o log em:", join(LOG_DIR, "server.log"));
    process.exit(1);
  }
  console.log(`  Pronto! ${urlFor(port)}`);
  openApp(port);
}

main().catch((e) => {
  console.error("  Falha ao abrir o Life OS:", e?.message ?? e);
  process.exit(1);
});
