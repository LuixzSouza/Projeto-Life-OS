"use server";

import { prisma, reconnectPrisma } from "@/lib/prisma";
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getDatabasePath, setDatabasePath } from "@/lib/db-config";
import { requireUserId } from "@/lib/auth";
import { formatBytes } from "./helpers";

// ============================================================================
// STORAGE STATS (ANALYTICS)
// ============================================================================
export async function getStorageStats() {
  // 1. Busca os dados reais para calcular o peso (Size) — escopado ao usuário
  const userId = await requireUserId();
  const where = { userId };
  const [
    projects, tasks, jobs, events, transactions, flashcards, aiMessages, accessItems, links
  ] = await Promise.all([
    prisma.project.findMany({ where }),
    prisma.task.findMany({ where }),
    prisma.jobApplication.findMany({ where }),
    prisma.event.findMany({ where }),
    prisma.transaction.findMany({ where }),
    prisma.flashcard.findMany({ where }),
    prisma.aiMessage.findMany({ where }),
    prisma.accessItem.findMany({ where }),
    prisma.savedLink.findMany({ where })
  ]);

  // 2. Calcula o tamanho em Bytes de cada categoria (Aproximação via JSON)
  const sizes = {
    projects: Buffer.byteLength(JSON.stringify(projects)),
    tasks: Buffer.byteLength(JSON.stringify(tasks)),
    jobs: Buffer.byteLength(JSON.stringify(jobs)),
    events: Buffer.byteLength(JSON.stringify(events)),
    transactions: Buffer.byteLength(JSON.stringify(transactions)),
    flashcards: Buffer.byteLength(JSON.stringify(flashcards)),
    aiMessages: Buffer.byteLength(JSON.stringify(aiMessages)),
    accessItems: Buffer.byteLength(JSON.stringify(accessItems)),
    links: Buffer.byteLength(JSON.stringify(links)),
  };

  const totalBytes = Object.values(sizes).reduce((a, b) => a + b, 0);
  const totalItems = projects.length + tasks.length + jobs.length + events.length + transactions.length + flashcards.length + aiMessages.length + accessItems.length + links.length;

  if (totalItems === 0) return { totalItems: 0, breakdown: [], totalSize: "0 B" };

  // 3. Informações do Disco Físico
  let diskInfo = null;
  const dbPath = getDatabasePath();
  if (dbPath && fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      diskInfo = {
          path: dbPath,
          total: "N/A", // SQLite é arquivo único, não partição inteira
          used: formatBytes(stats.size),
          rawSize: stats.size,
          free: "N/A",
          percent: 0 // Calcularemos no front se necessário ou deixamos fixo
      };
  }

  // 4. Monta o Breakdown
  const breakdown = [
    { label: "Tarefas", count: tasks.length, bytes: sizes.tasks, color: "bg-emerald-500" },
    { label: "Projetos", count: projects.length, bytes: sizes.projects, color: "bg-indigo-500" },
    { label: "Finanças", count: transactions.length, bytes: sizes.transactions, color: "bg-blue-500" },
    { label: "Vagas", count: jobs.length, bytes: sizes.jobs, color: "bg-amber-500" },
    { label: "Agenda", count: events.length, bytes: sizes.events, color: "bg-rose-500" },
    { label: "Estudos", count: flashcards.length, bytes: sizes.flashcards, color: "bg-purple-500" },
    { label: "Links", count: links.length, bytes: sizes.links, color: "bg-cyan-500" },
    { label: "IA Chat", count: aiMessages.length, bytes: sizes.aiMessages, color: "bg-zinc-500" },
    { label: "Cofre", count: accessItems.length, bytes: sizes.accessItems, color: "bg-orange-500" },
  ].map(item => ({
      ...item,
      // Calculamos as porcentagens para ambas as métricas
      percentCount: (item.count / totalItems) * 100,
      percentSize: totalBytes > 0 ? (item.bytes / totalBytes) * 100 : 0,
      formattedSize: formatBytes(item.bytes)
  })).sort((a, b) => b.bytes - a.bytes); // Ordena por tamanho (mais relevante)

  return {
    totalItems,
    totalSize: formatBytes(totalBytes),
    breakdown,
    disk: diskInfo
  };
}

// ============================================================================
// GERENCIAMENTO DE PASTA (MOVER DB)
// ============================================================================
export async function updateStoragePath(formData: FormData) {
  const newPathRaw = formData.get("storagePath") as string;
  if (!newPathRaw) throw new Error("Caminho inválido.");

  let newDbPath = path.normalize(newPathRaw);
  if (!newDbPath.endsWith(".db")) {
    newDbPath = path.join(newDbPath, "life_os.db");
  }

  const currentDbPath = getDatabasePath();

  // ✅ Correção: Verifica se currentDbPath é nulo
  if (!currentDbPath || currentDbPath === newDbPath) return;

  try {
    const targetDir = path.dirname(newDbPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (fs.existsSync(currentDbPath)) {
        fs.copyFileSync(currentDbPath, newDbPath);
    }

    setDatabasePath(newDbPath);
    // Reconecta o cliente global para o novo arquivo imediatamente (o banco já
    // foi copiado acima), sem exigir reinício do aplicativo.
    await reconnectPrisma();

    const userId = await requireUserId();
    await prisma.settings.upsert({
        where: { userId },
        update: { storagePath: targetDir },
        create: { userId, storagePath: targetDir }
    });

    return { success: true, message: "Local do banco alterado com sucesso!" };

  } catch (error) {
    console.error("Erro ao mover banco:", error);
    throw new Error("Falha ao mover o arquivo. Verifique permissões.");
  }
}

interface DirEntry {
  name: string;
  path: string;
  type: string;
}
type ListDirResult =
  | { success: true; path: string; directories: DirEntry[]; isRoot: boolean; notice?: string }
  | { success: false; error: string };

export async function listDirectories(currentPath: string): Promise<ListDirResult> {
  try {
    if (currentPath === "ROOT" && os.platform() === 'win32') {
        const drives: DirEntry[] = [];
        for (let i = 65; i <= 90; i++) {
            const drive = String.fromCharCode(i) + ":\\";
            try {
                fs.accessSync(drive);
                drives.push({ name: `Disco Local (${drive})`, path: drive, type: 'drive' });
            } catch (e) {}
        }
        return { success: true, path: "Este Computador", directories: drives, isRoot: true };
    }

    let searchPath = currentPath && currentPath !== "Este Computador" ? currentPath : os.homedir();

    // Caminho ainda não existe (ex.: pasta padrão sugerida que será criada depois):
    // não é erro — caímos na pasta do usuário para a pessoa navegar e escolher.
    let fallbackUsed = false;
    if (!fs.existsSync(searchPath)) {
      searchPath = os.homedir();
      fallbackUsed = true;
    }

    const entries = fs.readdirSync(searchPath, { withFileTypes: true });

    const directories = entries
      .filter(entry => entry.isDirectory())
      // Ignora pastas ocultas/sistema (ruído) mantendo as comuns.
      .filter(entry => !entry.name.startsWith("$") && entry.name !== "System Volume Information")
      .map(entry => ({
        name: entry.name,
        path: path.join(searchPath, entry.name),
        type: 'folder'
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      success: true,
      path: searchPath,
      directories,
      isRoot: false,
      ...(fallbackUsed ? { notice: "A pasta sugerida ainda não existe — ela será criada ao concluir. Escolha onde salvar." } : {}),
    };

  } catch (error) {
    // Distingue permissão de caminho inexistente para uma mensagem útil.
    const code = (error as NodeJS.ErrnoException)?.code;
    const message =
      code === "EACCES" || code === "EPERM"
        ? "Sem permissão para acessar esta pasta. Tente outra ou rode o app com permissão."
        : code === "ENOENT"
          ? "Esta pasta não existe mais. Voltando para um local válido."
          : "Não foi possível ler esta pasta. Tente outra localização.";
    return { success: false, error: message };
  }
}
