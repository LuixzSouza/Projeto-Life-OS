"use server";

// Integração com o Windows (desktop): iniciar com o sistema e liberar o
// firewall — os dois itens "sem fricção" do painel de Acesso Remoto.
// Tudo roda NO PC onde o servidor está (mesmo que o clique venha do celular).

import { spawn, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { requireUserId } from "@/lib/auth";
import { isEphemeralServerless } from "@/lib/db-config";

export interface WindowsIntegrationStatus {
  /** false fora do Windows desktop (Linux, Vercel...) — a UI esconde a seção. */
  available: boolean;
  startWithWindows: boolean;
}

function isWindowsDesktop(): boolean {
  return process.platform === "win32" && !isEphemeralServerless();
}

function startupShortcutPath(): string {
  return path.join(
    os.homedir(),
    "AppData",
    "Roaming",
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup",
    "Life OS.lnk",
  );
}

export async function getWindowsIntegrationStatus(): Promise<WindowsIntegrationStatus> {
  await requireUserId();
  if (!isWindowsDesktop()) return { available: false, startWithWindows: false };
  return { available: true, startWithWindows: fs.existsSync(startupShortcutPath()) };
}

/** Liga/desliga "iniciar com o Windows" criando/removendo o atalho em shell:startup. */
export async function setStartWithWindows(enabled: boolean): Promise<{ success: boolean; message: string }> {
  await requireUserId();
  if (!isWindowsDesktop()) {
    return { success: false, message: "Disponível apenas no Life OS rodando em um PC Windows." };
  }

  const script = path.join(process.cwd(), "scripts", "startup-windows.ps1");
  const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script];
  if (!enabled) args.push("-Remove");

  const result = spawnSync("powershell.exe", args, { timeout: 15000 });
  if (result.status !== 0) {
    console.error("[windows] startup-windows.ps1 falhou:", result.stderr?.toString());
    return { success: false, message: "Não foi possível atualizar a inicialização automática." };
  }
  return {
    success: true,
    message: enabled
      ? "Pronto! O Life OS vai subir sozinho quando o PC ligar."
      : "Inicialização automática desativada.",
  };
}

/**
 * Pede a regra de firewall (portas 3000-3011, redes privadas). Dispara o UAC
 * NO PC — quem estiver na frente dele confirma; daí o celular acessa direto.
 */
export async function requestFirewallRule(): Promise<{ success: boolean; message: string }> {
  await requireUserId();
  if (!isWindowsDesktop()) {
    return { success: false, message: "Disponível apenas no Life OS rodando em um PC Windows." };
  }

  const script = path.join(process.cwd(), "scripts", "allow-firewall.ps1");
  // Destacado: o UAC fica aberto na tela do PC sem segurar esta requisição.
  const child = spawn(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script],
    { detached: true, stdio: "ignore" },
  );
  child.unref();

  return {
    success: true,
    message: "Confirme a janela de permissão do Windows na tela do computador.",
  };
}
