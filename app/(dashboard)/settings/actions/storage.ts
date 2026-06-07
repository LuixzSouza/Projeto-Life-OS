"use server";

import { prisma, reconnectPrisma, syncReplica, isReplicaActive, buildAdapterClient } from "@/lib/prisma";
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getDatabasePath, getDbProfile, setDatabasePath, setDbProfile } from "@/lib/db-config";
import { ensureSchema } from "@/lib/db-bootstrap";
import { mergeSqliteIntoTurso } from "@/lib/db-migrate";
import { requireUserId } from "@/lib/auth";
import { formatBytes } from "./helpers";

// ============================================================================
// STORAGE STATS (ANALYTICS)
// ============================================================================
/**
 * Categoria de dados na análise de "Uso de Dados". Cada uma agrega 1+ models
 * (escopados ao usuário) para refletir TUDO que o sistema guarda — não só um
 * punhado de tabelas. `fetch` devolve as linhas para medir contagem e peso.
 */
interface StorageCategory {
  label: string;
  color: string;
  fetch: () => Promise<unknown[]>;
}

export async function getStorageStats() {
  const userId = await requireUserId();
  const where = { userId };
  // Junta os resultados de vários models numa só categoria.
  const join = async (...queries: Promise<unknown[]>[]): Promise<unknown[]> =>
    (await Promise.all(queries)).flat();

  // Cobertura COMPLETA dos dados do usuário (espelha os módulos do app).
  const categories: StorageCategory[] = [
    { label: "Tarefas", color: "bg-emerald-500", fetch: () => prisma.task.findMany({ where }) },
    { label: "Projetos", color: "bg-indigo-500", fetch: () => prisma.project.findMany({ where }) },
    {
      label: "Finanças", color: "bg-blue-500",
      fetch: () => join(
        prisma.transaction.findMany({ where }),
        prisma.account.findMany({ where }),
        prisma.recurringExpense.findMany({ where }),
        prisma.recurringCharge.findMany({ where }),
      ),
    },
    { label: "Vagas", color: "bg-amber-500", fetch: () => prisma.jobApplication.findMany({ where }) },
    {
      label: "Agenda", color: "bg-rose-500",
      fetch: () => join(prisma.event.findMany({ where }), prisma.routineItem.findMany({ where })),
    },
    {
      label: "Estudos", color: "bg-purple-500",
      fetch: () => join(
        prisma.studyNote.findMany({ where }),
        prisma.studyContent.findMany({ where }),
        prisma.studySession.findMany({ where }),
        prisma.flashcard.findMany({ where }),
        prisma.flashcardDeck.findMany({ where }),
        prisma.learningGoal.findMany({ where }),
        prisma.learningTask.findMany({ where }),
        prisma.studySubject.findMany({ where }),
      ),
    },
    {
      label: "Saúde", color: "bg-lime-500",
      fetch: () => join(
        prisma.workout.findMany({ where }),
        prisma.healthMetric.findMany({ where }),
        prisma.bodyMeasurement.findMany({ where }),
        prisma.meal.findMany({ where }),
        prisma.mealPlan.findMany({ where }),
      ),
    },
    {
      label: "Negócios", color: "bg-teal-500",
      fetch: () => join(
        prisma.client.findMany({ where }),
        prisma.billing.findMany({ where }),
        prisma.invoice.findMany({ where }),
      ),
    },
    { label: "Conexões", color: "bg-pink-500", fetch: () => prisma.friend.findMany({ where }) },
    {
      label: "Entretenimento", color: "bg-fuchsia-500",
      fetch: () => join(prisma.mediaItem.findMany({ where }), prisma.wishlistItem.findMany({ where })),
    },
    { label: "Closet", color: "bg-orange-500", fetch: () => prisma.wardrobeItem.findMany({ where }) },
    { label: "Links", color: "bg-cyan-500", fetch: () => prisma.savedLink.findMany({ where }) },
    {
      label: "IA Chat", color: "bg-zinc-500",
      fetch: () => join(prisma.aiMessage.findMany({ where }), prisma.aiChat.findMany({ where })),
    },
    { label: "Cofre", color: "bg-red-500", fetch: () => prisma.accessItem.findMany({ where }) },
    {
      label: "Sites", color: "bg-violet-500",
      fetch: () => join(prisma.managedSite.findMany({ where }), prisma.sitePage.findMany({ where })),
    },
  ];

  // Busca tudo em paralelo; uma categoria que falhe vira vazia (não derruba a página).
  const loaded = await Promise.all(
    categories.map((c) => c.fetch().catch(() => [] as unknown[]))
  );

  const rows = categories.map((c, i) => {
    const items = loaded[i];
    return {
      label: c.label,
      color: c.color,
      count: items.length,
      bytes: Buffer.byteLength(JSON.stringify(items)),
    };
  });

  const totalBytes = rows.reduce((a, r) => a + r.bytes, 0);
  const totalItems = rows.reduce((a, r) => a + r.count, 0);

  if (totalItems === 0) return { totalItems: 0, breakdown: [], totalSize: "0 B", disk: null };

  // Informações do Disco Físico (só no modo com arquivo local).
  let diskInfo = null;
  const dbPath = getDatabasePath();
  if (dbPath && fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    diskInfo = { path: dbPath, used: formatBytes(stats.size), rawSize: stats.size };
  }

  const breakdown = rows
    .map((item) => ({
      ...item,
      percentCount: (item.count / totalItems) * 100,
      percentSize: totalBytes > 0 ? (item.bytes / totalBytes) * 100 : 0,
      formattedSize: formatBytes(item.bytes),
    }))
    .sort((a, b) => b.bytes - a.bytes);

  return {
    totalItems,
    totalSize: formatBytes(totalBytes),
    breakdown,
    disk: diskInfo,
  };
}

// ============================================================================
// STATUS DO BANCO + SINCRONIZAÇÃO (RÉPLICA EMBARCADA)
// ============================================================================

export interface DbStatus {
  mode: "local" | "cloud" | "replica" | null;
  isReplica: boolean;
  /** URL do Turso espelho quando em modo réplica. */
  syncUrl: string | null;
  databasePath: string | null;
}

/** Lê o perfil de banco ativo (para a UI de Configurações exibir o modo/sync). */
export async function getDbStatus(): Promise<DbStatus> {
  await requireUserId();
  const profile = getDbProfile();
  return {
    mode: profile?.mode ?? null,
    isReplica: profile?.mode === "replica",
    syncUrl: profile?.mode === "replica" ? profile.syncUrl : null,
    databasePath: getDatabasePath(),
  };
}

/**
 * Sincroniza AGORA a réplica local com o Turso espelho (botão "Sincronizar").
 * As escritas locais já vão ao primário na hora; isto força o PULL imediato do
 * que mudou em outro dispositivo (ex.: celular). No-op fora do modo réplica.
 */
export async function syncDatabaseNow(): Promise<{ success: boolean; message: string }> {
  await requireUserId();
  if (!isReplicaActive()) {
    return { success: false, message: "O banco atual não é uma réplica sincronizável." };
  }
  try {
    const res = await syncReplica();
    return res.synced
      ? { success: true, message: "Sincronizado com o Turso espelho." }
      : { success: false, message: "Nada para sincronizar." };
  } catch (error) {
    console.error("Erro ao sincronizar réplica:", error);
    return {
      success: false,
      message: "Falha ao sincronizar. Verifique a conexão e o token do Turso.",
    };
  }
}

/**
 * Testa uma conexão Turso (URL + token) com uma query trivial, antes de migrar.
 * Dá um erro acionável em vez de deixar a migração falhar no meio do caminho.
 */
export async function testTursoConnection(
  url: string,
  authToken?: string
): Promise<{ success: boolean; message: string }> {
  await requireUserId();
  const trimmed = url.trim();
  if (!trimmed) return { success: false, message: "Informe a URL do Turso." };
  if (!/^(libsql|https?):\/\//.test(trimmed)) {
    return { success: false, message: "URL inválida. Use libsql://... ou https://..." };
  }

  const temp = buildAdapterClient({
    mode: "cloud",
    provider: "turso",
    url: trimmed,
    authToken: authToken?.trim() || undefined,
  });
  try {
    await temp.client.$queryRawUnsafe("SELECT 1");
    return { success: true, message: "Conexão com o Turso validada com sucesso." };
  } catch (error) {
    const raw = error instanceof Error ? error.message.toLowerCase() : "";
    const message =
      raw.includes("401") || raw.includes("unauth") || raw.includes("jwt") || raw.includes("token")
        ? "Turso recusou o token. Confira o JWT (começa com 'eyJ…') gerado para ESTE banco."
        : raw.includes("400") || raw.includes("server_error")
          ? "Turso rejeitou a conexão (400) — quase sempre token errado (não cole a URL no campo do token)."
          : "Não foi possível conectar ao Turso. Confira a URL e sua internet.";
    return { success: false, message };
  } finally {
    await temp.client.$disconnect().catch(() => {});
  }
}

/**
 * Migra a instalação LOCAL atual para o modo Híbrido (réplica): cria o schema no
 * Turso, MESCLA os dados do arquivo local atual para lá (sem apagar o que já
 * existir), passa o perfil para `replica` (cache em `life_os.replica.db` na mesma
 * pasta) e reconecta — tudo sem reiniciar o app. O arquivo local original
 * permanece intacto como backup.
 */
export async function migrateToReplica(
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  await requireUserId();

  const url = ((formData.get("tursoUrl") as string) || "").trim();
  const authToken = ((formData.get("tursoToken") as string) || "").trim() || undefined;
  if (!url) return { success: false, message: "Informe a URL do Turso." };
  if (!/^(libsql|https?):\/\//.test(url)) {
    return { success: false, message: "URL inválida. Use libsql://... ou https://..." };
  }

  const current = getDbProfile();
  const sourcePath = getDatabasePath();
  if (!current || current.mode !== "local" || !sourcePath) {
    return {
      success: false,
      message: "A migração para Híbrido só parte de uma instalação local com arquivo.",
    };
  }
  if (!fs.existsSync(sourcePath)) {
    return { success: false, message: `Arquivo local não encontrado: ${sourcePath}` };
  }

  // 1. Garante o schema no Turso (cliente temporário em modo nuvem).
  const temp = buildAdapterClient({ mode: "cloud", provider: "turso", url, authToken });
  try {
    await ensureSchema(temp.client);
  } catch (error) {
    console.error("Erro ao preparar schema no Turso:", error);
    await temp.client.$disconnect().catch(() => {});
    return {
      success: false,
      message: "Falha ao conectar/preparar o Turso. Verifique a URL e o token.",
    };
  }
  await temp.client.$disconnect().catch(() => {});

  // 2. Mescla os dados locais → Turso (INSERT OR IGNORE, mantém os dois lados).
  let migrated;
  try {
    migrated = await mergeSqliteIntoTurso(sourcePath, { url, authToken });
  } catch (error) {
    console.error("Erro ao migrar dados para o Turso:", error);
    return { success: false, message: "Falha ao enviar os dados locais para o Turso." };
  }

  // 3. Ativa o modo réplica (cache separado) e reconecta o cliente global.
  const cachePath = path.join(path.dirname(sourcePath), "life_os.replica.db");
  setDbProfile({ mode: "replica", databasePath: cachePath, syncUrl: url, authToken });
  await reconnectPrisma();
  // Puxa do Turso para o cache local recém-criado.
  await syncReplica().catch(() => {});

  return {
    success: true,
    message: `Conectado ao modo Híbrido. ${migrated.inserted} registros enviados ao Turso (${migrated.skipped} já existiam). O celular já pode acessar pela nuvem.`,
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

    // Dois modos seguros:
    //  - Destino NÃO existe → MOVER: copia o banco atual para o novo local.
    //  - Destino JÁ existe (.db) → CONECTAR: aponta para ele sem sobrescrever
    //    (evita destruir os dados de um banco que já estava lá).
    const targetExists = fs.existsSync(newDbPath);
    const connecting = targetExists;
    if (!targetExists && fs.existsSync(currentDbPath)) {
      fs.copyFileSync(currentDbPath, newDbPath);
    }

    // Réplica: trocar o arquivo local NÃO pode descartar o espelho (syncUrl/token),
    // senão o modo viraria "local" e a sincronização com o Turso seria perdida.
    const current = getDbProfile();
    if (current?.mode === "replica") {
      setDbProfile({ ...current, databasePath: newDbPath });
    } else {
      setDatabasePath(newDbPath);
    }
    // Reconecta o cliente global imediatamente, sem exigir reinício do aplicativo.
    await reconnectPrisma();

    // Ao CONECTAR a um banco que já existia, ele pode ter um schema antigo —
    // reconcilia (cria tabelas/colunas faltantes). Idempotente e silencioso.
    if (connecting) {
      try {
        await ensureSchema(prisma);
      } catch (e) {
        console.warn("⚠️ Não foi possível reconciliar o schema do banco conectado:", e);
      }
    }

    const userId = await requireUserId();
    await prisma.settings.upsert({
        where: { userId },
        update: { storagePath: targetDir },
        create: { userId, storagePath: targetDir }
    });

    return {
      success: true,
      message: connecting
        ? "Conectado ao banco existente neste local."
        : "Banco movido para o novo local com sucesso!",
    };

  } catch (error) {
    console.error("Erro ao mover banco:", error);
    throw new Error("Falha ao alterar o local. Verifique as permissões.");
  }
}

/** Sonda de escrita: cria e apaga um arquivo temporário para testar permissão. */
function canWriteToFolder(dir: string): boolean {
  try {
    const probe = path.join(dir, ".lifeos_write_test");
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

export interface PathAccess {
  ok: boolean;
  exists: boolean;
  isExistingDb: boolean;
  message: string;
}

/**
 * Verifica acesso/permissão de um caminho ANTES de usá-lo (a "autorização" da
 * pasta escolhida): aceita uma pasta (cria o banco) ou um arquivo .db (conecta).
 * Não exige login — é usado também no /setup (pré-instalação).
 */
export async function checkPathAccess(rawPath: string): Promise<PathAccess> {
  const input = (rawPath || "").trim();
  if (!input || input === "Este Computador") {
    return { ok: false, exists: false, isExistingDb: false, message: "Selecione uma pasta ou um arquivo .db." };
  }

  const isDb = input.toLowerCase().endsWith(".db");
  const folder = isDb ? path.dirname(input) : input;
  const isExistingDb = isDb && fs.existsSync(input);

  // Pasta ainda não existe → será criada; checa se o diretório-pai permite isso.
  if (!fs.existsSync(folder)) {
    const parentWritable = canWriteToFolder(path.dirname(folder));
    return {
      ok: parentWritable,
      exists: false,
      isExistingDb: false,
      message: parentWritable
        ? "A pasta será criada aqui ao concluir."
        : "Sem permissão para criar a pasta neste local. Escolha outro.",
    };
  }

  const writable = canWriteToFolder(folder);
  return {
    ok: writable,
    exists: true,
    isExistingDb,
    message: writable
      ? (isExistingDb
          ? "Banco existente encontrado — você vai conectar a ele."
          : "Pasta acessível e com permissão de escrita.")
      : "A pasta existe, mas o app não tem permissão de escrita. Rode como administrador ou escolha outra.",
  };
}

interface DirEntry {
  name: string;
  path: string;
  type: string;
}
type ListDirResult =
  | { success: true; path: string; directories: DirEntry[]; files: DirEntry[]; isRoot: boolean; notice?: string }
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
        return { success: true, path: "Este Computador", directories: drives, files: [], isRoot: true };
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

    // Arquivos de banco existentes (.db) — para o usuário apontar para um banco
    // que já tem, em vez de criar um novo.
    const files = entries
      .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".db"))
      .map(entry => ({
        name: entry.name,
        path: path.join(searchPath, entry.name),
        type: 'db'
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      success: true,
      path: searchPath,
      directories,
      files,
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
