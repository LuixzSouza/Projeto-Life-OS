"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from 'fs';
import path from 'path';
import { getDatabasePath } from "@/lib/db-config";
import { requireUserId } from "@/lib/auth";
import { formatBytes } from "./helpers";

// ============================================================================
// SNAPSHOTS LOCAIS (SISTEMA DE BACKUP FÍSICO)
// ============================================================================

// Criar Snapshot (Cópia do arquivo .db)
export async function createLocalBackup() {
  try {
    const userId = await requireUserId();
    const dbPath = getDatabasePath();

    // ✅ Correção de segurança: garante que é string e existe
    if (!dbPath || !fs.existsSync(dbPath)) {
      throw new Error("Banco de dados original não encontrado no caminho configurado.");
    }

    // Define pasta de backups (cria se não existir na mesma pasta do banco atual)
    const backupDir = path.join(path.dirname(dbPath), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Nome do arquivo: snapshot-YYYY-MM-DD-HH-MM.db
    const now = new Date();
    const timestamp = now.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
    const fileName = `snapshot-${timestamp}.db`;
    const destination = path.join(backupDir, fileName);

    // Copia o arquivo .db
    fs.copyFileSync(dbPath, destination);

    // Pega o tamanho para exibir no histórico
    const stats = fs.statSync(destination);

    // Salva no Log do Prisma para aparecer na lista
    await prisma.backupLog.create({
      data: {
        fileName,
        path: destination,
        size: formatBytes(stats.size),
        type: "MANUAL",
        userId
      }
    });

    revalidatePath("/settings");
    return { success: true, message: "Snapshot criado com sucesso!" };

  } catch (error) {
    console.error("Erro ao criar backup:", error);
    return { success: false, message: "Erro ao criar backup físico." };
  }
}

// Restaurar Snapshot (Por ID do Log)
export async function restoreBackup(backupId: string) {
  try {
    const userId = await requireUserId();
    const backup = await prisma.backupLog.findFirst({ where: { id: backupId, userId } });
    if (!backup) throw new Error("Registro de backup não encontrado.");

    const dbPath = getDatabasePath();
    if (!dbPath) throw new Error("Caminho do banco principal desconhecido.");

    // Verifica se o arquivo de backup ainda existe fisicamente
    if (!fs.existsSync(backup.path)) {
      throw new Error("O arquivo de backup foi movido ou deletado do disco.");
    }

    // 1. Cria um backup de segurança do atual antes de substituir (Safety First)
    const safetyPath = `${dbPath}.safety_overwrite`;
    try {
        fs.copyFileSync(dbPath, safetyPath);
    } catch (e) {
        console.warn("Aviso: Não foi possível criar backup de segurança temporário.");
    }

    // 2. Substitui o banco oficial pelo backup
    fs.copyFileSync(backup.path, dbPath);

    revalidatePath("/");
    return { success: true, message: "Sistema restaurado com sucesso!" };

  } catch (error) {
    console.error(error);
    return { success: false, message: (error as Error).message };
  }
}

// Excluir Snapshot
export async function deleteBackup(id: string) {
    try {
        const userId = await requireUserId();
        const backup = await prisma.backupLog.findFirst({ where: { id, userId } });

        // Tenta apagar o arquivo físico se existir
        if(backup && backup.path && fs.existsSync(backup.path)) {
            try {
                fs.unlinkSync(backup.path);
            } catch (e) {
                console.error("Erro ao apagar arquivo físico:", e);
            }
        }

        // Apaga o registro do banco
        await prisma.backupLog.deleteMany({ where: { id, userId } });

        revalidatePath("/settings");
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}
