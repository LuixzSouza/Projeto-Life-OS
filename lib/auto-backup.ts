// ============================================================================
// BACKUP AUTOMÁTICO AGENDADO — snapshot diário + export JSON, com rotação.
// ============================================================================
// Pega carona no fluxo de lembretes (generateReminders), o mesmo truque das
// automações de IA: no desktop o servidor está sempre de pé, então o backup
// acontece na 1ª vez que o app é usado no dia. Idempotente por usuário+dia
// (via BackupLog) e best-effort — nunca pode travar os lembretes.
//
// Gera DUAS proteções por dia na pasta configurada (Configurações → Dados):
//   auto-YYYY-MM-DD.db            ← cópia física do SQLite (1× por máquina/dia)
//   auto-YYYY-MM-DD-uXXXX.json    ← export JSON completo v3 (por usuário; é o
//                                    backup universal — funciona até no Turso)
// Rotação: mantém as últimas N cópias de cada tipo (default 7).

import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { buildFullBackup } from "@/lib/full-backup";
import {
  getAutoBackupConfig,
  getDatabasePath,
  isEphemeralServerless,
} from "@/lib/db-config";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Apaga os arquivos mais antigos que excedem a cota, casando pelo prefixo/sufixo. */
function rotate(dir: string, matches: (name: string) => boolean, keep: number) {
  let files: string[];
  try {
    files = fs.readdirSync(dir).filter(matches).sort(); // nome = data → ordem cronológica
  } catch {
    return;
  }
  for (const stale of files.slice(0, Math.max(0, files.length - keep))) {
    try {
      fs.unlinkSync(path.join(dir, stale));
    } catch (e) {
      console.warn("[auto-backup] falha ao rotacionar:", stale, e);
    }
  }
}

/**
 * Roda o backup do dia se ainda não rodou (best-effort, por usuário).
 * Retorna true quando um backup novo foi gerado agora.
 */
export async function runAutoBackupIfDue(userId: string): Promise<boolean> {
  // Serverless (Vercel): FS efêmero — backup automático local não se aplica.
  if (isEphemeralServerless()) return false;

  const cfg = getAutoBackupConfig();
  if (!cfg.enabled) return false;

  const now = new Date();
  const dayKey = localDayKey(now);

  // Idempotência: já existe um AUTO de hoje para este usuário?
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const existing = await prisma.backupLog.findFirst({
    where: { userId, type: "AUTO", createdAt: { gte: startOfDay } },
    select: { id: true },
  });
  if (existing) return false;

  fs.mkdirSync(cfg.dir, { recursive: true });

  // 1. Snapshot físico do .db (1× por máquina/dia — pula se outro usuário já fez).
  const dbPath = getDatabasePath();
  if (dbPath && fs.existsSync(dbPath)) {
    const snapshotPath = path.join(cfg.dir, `auto-${dayKey}.db`);
    if (!fs.existsSync(snapshotPath)) {
      fs.copyFileSync(dbPath, snapshotPath);
    }
  }

  // 2. Export JSON completo v3 (o backup universal, agnóstico de banco).
  const backup = await buildFullBackup(userId, null);
  const jsonName = `auto-${dayKey}-u${userId.slice(0, 8)}.json`;
  const jsonPath = path.join(cfg.dir, jsonName);
  fs.writeFileSync(jsonPath, JSON.stringify(backup), "utf-8");

  // 3. Rotação (mantém as últimas N de cada tipo).
  rotate(cfg.dir, (n) => /^auto-\d{4}-\d{2}-\d{2}\.db$/.test(n), cfg.keep);
  const userSuffix = `-u${userId.slice(0, 8)}.json`;
  rotate(cfg.dir, (n) => n.startsWith("auto-") && n.endsWith(userSuffix), cfg.keep);

  // 4. Registro no histórico (também é o marcador de idempotência do dia).
  const stats = fs.statSync(jsonPath);
  await prisma.backupLog.create({
    data: {
      fileName: jsonName,
      path: jsonPath,
      size: formatBytes(stats.size),
      type: "AUTO",
      userId,
    },
  });

  console.log(`💾 [auto-backup] backup diário gerado em ${cfg.dir}`);
  return true;
}

/** Status para o card de Configurações. */
export interface AutoBackupStatus {
  enabled: boolean;
  dir: string;
  keep: number;
  supported: boolean; // false em serverless (Vercel)
  lastRunAt: string | null;
  lastFile: string | null;
}

export async function getAutoBackupStatus(userId: string): Promise<AutoBackupStatus> {
  const cfg = getAutoBackupConfig();
  const last = await prisma.backupLog.findFirst({
    where: { userId, type: "AUTO" },
    orderBy: { createdAt: "desc" },
  });
  return {
    enabled: cfg.enabled,
    dir: cfg.dir,
    keep: cfg.keep,
    supported: !isEphemeralServerless(),
    lastRunAt: last?.createdAt.toISOString() ?? null,
    lastFile: last?.fileName ?? null,
  };
}
