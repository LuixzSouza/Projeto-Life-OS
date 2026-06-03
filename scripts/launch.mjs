// Launcher do Life OS (uso pessoal / Windows — clicar e abrir).
//
// Modelo "profissional":
//  - Se o Life OS já estiver no ar, apenas abre o navegador (não sobe 2º servidor).
//  - Caso contrário: compila (só se algo mudou), sobe o servidor em SEGUNDO PLANO
//    (desacoplado desta janela) e abre o app numa janela limpa.
//  - Esta janela então se FECHA sozinha — não há janela "hospedando" o servidor,
//    então fechar/encerrar nunca gera erro. Para parar, use "Fechar Life OS".
//
// Uso: node scripts/launch.mjs            (auto: build só se necessário)
//      node scripts/launch.mjs --build    (força rebuild)
//      node scripts/launch.mjs --no-open  (não abre o navegador)

import { spawn, spawnSync } from "node:child_process";
import { existsSync, statSync, readdirSync, openSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import figlet from "figlet";
import gradient from "gradient-string";
import boxen from "boxen";
import chalk from "chalk";
import { createSpinner } from "nanospinner";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const START_PORT = Number(process.env.PORT) || 3000;
const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";
const FORCE_BUILD = process.argv.includes("--build");
const NO_OPEN = process.argv.includes("--no-open");
const PID_FILE = join(ROOT, ".life-os-server.pid");
const LOG_DIR = join(ROOT, "logs");

const brand = gradient(["#6366f1", "#a855f7", "#ec4899"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const urlFor = (port) => `http://localhost:${port}`;

function splash() {
  console.clear();
  console.log("\n" + brand.multiline(figlet.textSync("Life OS", { font: "ANSI Shadow" })));
  console.log(
    boxen(chalk.white("Seu segundo cérebro — ") + chalk.gray("local & privado"), {
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      margin: { left: 2 },
      borderStyle: "round",
      borderColor: "magenta",
    }) + "\n"
  );
}

function fail(message, hint) {
  console.log("\n" + boxen(
    chalk.red.bold("Não foi possível abrir o Life OS\n\n") +
      chalk.white(message) + (hint ? "\n\n" + chalk.gray(hint) : ""),
    { padding: 1, margin: { left: 2 }, borderStyle: "round", borderColor: "red" }
  ));
  process.exit(1);
}

// --- detecção de "já está rodando" -----------------------------------------
async function isLifeOsUp(port) {
  try {
    const r = await fetch(urlFor(port) + "/login", { signal: AbortSignal.timeout(2500) });
    if (r.status >= 500) return false;
    const body = await r.text();
    // Marca do Next/desta app (id do root). Evita confundir com outro serviço na porta.
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

async function pickPort(start) {
  for (let p = start; p < start + 12; p++) {
    if (await isPortFree(p)) return p;
  }
  return start; // deixa o next reclamar se TUDO estiver ocupado
}

// --- build inteligente ------------------------------------------------------
const IGNORE = new Set(["node_modules", ".next", ".git", "out", "dist", "logs"]);
function newestMtime(path) {
  let st;
  try { st = statSync(path); } catch { return 0; }
  if (st.isFile()) return st.mtimeMs;
  let max = 0;
  for (const e of readdirSync(path, { withFileTypes: true })) {
    if (IGNORE.has(e.name)) continue;
    const full = join(path, e.name);
    max = Math.max(max, e.isDirectory() ? newestMtime(full) : statSync(full).mtimeMs);
  }
  return max;
}

function needsBuild() {
  if (FORCE_BUILD) return true;
  const buildId = join(ROOT, ".next", "BUILD_ID");
  if (!existsSync(buildId)) return true;
  const builtAt = statSync(buildId).mtimeMs;
  const sources = ["app", "components", "lib", "prisma/schema.prisma", "next.config.ts", "package.json"];
  return Math.max(...sources.map((s) => newestMtime(join(ROOT, s)))) > builtAt;
}

function runBuild() {
  const s = createSpinner(chalk.cyan("Atualizando o app (só desta vez)…")).start();
  const res = spawnSync(npmCmd, ["run", "build"], { cwd: ROOT, stdio: "pipe", shell: isWin });
  if (res.status !== 0) {
    s.error({ text: chalk.red("Falha ao compilar.") });
    const out = (res.stdout?.toString() ?? "") + (res.stderr?.toString() ?? "");
    if (/EPERM|operation not permitted/i.test(out)) {
      fail(
        "O Windows bloqueou a atualização porque o Life OS ainda está aberto.",
        'Use "Fechar Life OS" (ou feche o app) e tente abrir de novo.'
      );
    }
    process.stdout.write(out.slice(-1800));
    fail("Houve um erro ao compilar o app.", "A mensagem acima tem o detalhe técnico.");
  }
  s.success({ text: chalk.green("App atualizado.") });
}

// --- navegador --------------------------------------------------------------
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
      spawn(browser, [`--app=${url}`, "--new-window"], { detached: true, stdio: "ignore", windowsHide: false }).unref();
    } else if (isWin) {
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    }
  } catch {
    /* se o navegador falhar, o servidor continua no ar; usuário pode abrir manualmente */
  }
}

async function waitReady(port, timeoutMs = 120000) {
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

function startServerDetached(port) {
  mkdirSync(LOG_DIR, { recursive: true });
  const logFd = openSync(join(LOG_DIR, "server.log"), "a");
  const nextBin = join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: ROOT,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", logFd, logFd],
    env: { ...process.env, PORT: String(port) },
  });
  child.unref();
  try { writeFileSync(PID_FILE, String(child.pid), "utf8"); } catch {}
  return child;
}

// --- fluxo principal --------------------------------------------------------
async function main() {
  splash();

  // 0. Sanidade do ambiente
  if (!existsSync(join(ROOT, "node_modules"))) {
    fail("As dependências do app não estão instaladas.", "Abra um terminal na pasta do projeto e rode:  npm install");
  }

  // 1. Já está no ar? Apenas abre.
  if (await isLifeOsUp(START_PORT)) {
    console.log(chalk.green(`  ✓ Life OS já estava aberto — reabrindo a janela.\n`));
    openApp(START_PORT);
    await sleep(800);
    return; // fecha esta janela; o servidor já existente continua
  }

  // 2. Atualiza se algo mudou
  if (needsBuild()) runBuild();
  else console.log(chalk.gray("  ✓ Tudo atualizado — abrindo direto.\n"));

  // 3. Escolhe porta livre e sobe o servidor em segundo plano
  const port = await pickPort(START_PORT);
  const s = createSpinner(chalk.cyan("Iniciando o Life OS…")).start();
  startServerDetached(port);

  const ready = await waitReady(port);
  if (!ready) {
    s.error({ text: chalk.red("O servidor não respondeu a tempo.") });
    fail("O Life OS demorou demais para iniciar.", "Veja logs/server.log para o detalhe. Tente abrir de novo.");
  }

  s.success({ text: chalk.green(`Life OS no ar em ${chalk.bold(urlFor(port))}`) });
  openApp(port);

  console.log(
    boxen(
      chalk.white("Pronto! O Life OS abriu numa janela própria.\n\n") +
        chalk.gray("Ele roda em segundo plano — pode fechar esta janela\n") +
        chalk.gray("à vontade, não interrompe nada.\n\n") +
        chalk.white("Para ENCERRAR o Life OS, use o atalho ") +
        chalk.yellow('"Fechar Life OS"') +
        chalk.gray("."),
      { padding: 1, margin: { top: 1, left: 2 }, borderStyle: "round", borderColor: "green" }
    )
  );

  // Dá um tempinho pro navegador abrir e então encerra ESTA janela.
  await sleep(1500);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(chalk.red("Erro inesperado:"), e?.message ?? e);
    process.exit(1);
  });
