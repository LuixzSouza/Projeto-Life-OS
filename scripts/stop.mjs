// Encerra o Life OS rodando em segundo plano.
// 1) Mata o PID salvo no launch (.life-os-server.pid) — caminho preciso.
// 2) Fallback (Windows): mata processos `node` escutando em 3000..3011.

import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PID_FILE = join(ROOT, ".life-os-server.pid");
const isWin = process.platform === "win32";

function killPid(pid) {
  if (!pid) return false;
  if (isWin) {
    return spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" }).status === 0;
  }
  try { process.kill(Number(pid), "SIGTERM"); return true; } catch { return false; }
}

let killed = false;
if (existsSync(PID_FILE)) {
  const pid = readFileSync(PID_FILE, "utf8").trim();
  killed = killPid(pid);
  try { unlinkSync(PID_FILE); } catch {}
}

// Fallback só se o PID não resolveu (evita matar processos alheios à toa).
if (!killed && isWin) {
  const ps =
    "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | " +
    "Where-Object { $_.LocalPort -ge 3000 -and $_.LocalPort -le 3011 } | " +
    "Select-Object -Expand OwningProcess -Unique | ForEach-Object { " +
    "try { $p = Get-Process -Id $_ -ErrorAction Stop; if ($p.ProcessName -eq 'node') { Stop-Process -Id $_ -Force; $true } } catch {} }";
  const r = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], { stdio: "pipe" });
  if ((r.stdout?.toString() ?? "").includes("True")) killed = true;
}

console.log(
  killed
    ? chalk.green("\n  ✓ Life OS encerrado.\n")
    : chalk.yellow("\n  Nenhum Life OS em execução (já estava fechado).\n")
);
