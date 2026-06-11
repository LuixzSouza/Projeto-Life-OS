// Fecha o Life OS INSTALADO: encerra o processo do servidor em segundo plano.
// Copiado para %LOCALAPPDATA%\LifeOS\app\stop.mjs pelo scripts/dist.mjs.

import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const APP_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_DIR =
  process.env.LIFE_OS_DATA_DIR ||
  join(process.env.LOCALAPPDATA ?? APP_DIR, "LifeOS", "data");
const PID_FILE = join(DATA_DIR, "server.pid");

if (!existsSync(PID_FILE)) {
  console.log("Life OS não parece estar aberto (sem registro de processo).");
  process.exit(0);
}

const pid = Number(readFileSync(PID_FILE, "utf8").trim());
if (Number.isFinite(pid) && pid > 0) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try { process.kill(pid, "SIGTERM"); } catch { /* já fechado */ }
  }
  console.log("Life OS fechado.");
} else {
  console.log("Registro de processo inválido — nada a fazer.");
}

try { unlinkSync(PID_FILE); } catch { /* ok */ }
