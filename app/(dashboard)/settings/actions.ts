"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from 'fs';
import path from 'path';
import { getDatabasePath, setDatabasePath } from "@/lib/db-config";
import os from 'os';
// Importamos TODOS os tipos do Prisma para garantir integridade
import { 
  Project, Account, Task, Transaction, StudySubject, StudySession, 
  Workout, HealthMetric, Event, ManagedSite, SitePage, Flashcard, 
  FlashcardDeck, AccessItem, AiMessage, User, Settings, JobApplication,
  BackupLog, SavedLink // Certifique-se que SavedLink está no seu schema
} from "@prisma/client";

// ============================================================================
// 0. HELPERS & TIPOS
// ============================================================================

// Formata bytes para legibilidade (ex: 2.5 MB)
function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Gera URL amigável (Slug) para projetos antigos que não tinham
function generateSlug(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-") || `item-${Date.now()}`;
}

// Tipos para Importação JSON (Mapeia a estrutura do arquivo)
// Usamos 'Partial' porque o JSON pode não ter todos os campos do banco atual
type ProjectJSON = Partial<Project> & { tasks?: Partial<Task>[]; events?: Partial<Event>[]; };
type AccountJSON = Partial<Account> & { transactions?: Partial<Transaction>[]; };
type SubjectJSON = Partial<StudySubject> & { sessions?: Partial<StudySession>[]; };
type SiteJSON = Partial<ManagedSite> & { pages?: Partial<SitePage>[]; };
// A categoria existe no JSON antigo mas não no banco novo, então definimos aqui para ler sem erro
type DeckJSON = Partial<FlashcardDeck> & { cards?: Partial<Flashcard>[]; category?: string }; 

interface BackupData {
  meta?: { system: string; version?: string; date?: string };
  user?: Partial<User>;
  settings?: Partial<Settings>;
  accounts?: AccountJSON[];
  projects?: ProjectJSON[];
  tasksWithoutProject?: Partial<Task>[];
  jobApplications?: Partial<JobApplication>[];
  studySubjects?: SubjectJSON[];
  flashcardDecks?: DeckJSON[];
  workouts?: Partial<Workout>[];
  healthMetrics?: Partial<HealthMetric>[];
  events?: Partial<Event>[];
  sites?: SiteJSON[];
  accessItems?: Partial<AccessItem>[];
  aiMessages?: Partial<AiMessage>[];
  savedLinks?: Partial<SavedLink>[];
}

// ============================================================================
// 1. SNAPSHOTS LOCAIS (NOVO SISTEMA DE BACKUP FÍSICO)
// ============================================================================

// 1.1 Criar Snapshot (Cópia do arquivo .db)
export async function createLocalBackup() {
  try {
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
        type: "MANUAL"
      }
    });

    revalidatePath("/settings");
    return { success: true, message: "Snapshot criado com sucesso!" };

  } catch (error) {
    console.error("Erro ao criar backup:", error);
    return { success: false, message: "Erro ao criar backup físico." };
  }
}

// 1.2 Restaurar Snapshot (Por ID do Log)
export async function restoreBackup(backupId: string) {
  try {
    const backup = await prisma.backupLog.findUnique({ where: { id: backupId } });
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

// 1.3 Excluir Snapshot
export async function deleteBackup(id: string) {
    try {
        const backup = await prisma.backupLog.findUnique({ where: { id } });
        
        // Tenta apagar o arquivo físico se existir
        if(backup && backup.path && fs.existsSync(backup.path)) {
            try {
                fs.unlinkSync(backup.path); 
            } catch (e) {
                console.error("Erro ao apagar arquivo físico:", e);
            }
        }
        
        // Apaga o registro do banco
        await prisma.backupLog.delete({ where: { id } });
        
        revalidatePath("/settings");
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}

// ============================================================================
// 2. IMPORTAÇÃO JSON (ANTIGO restoreBackup)
// ============================================================================
export async function importJsonData(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("Nenhum arquivo enviado");

  const text = await file.text();
  let data: BackupData;
  try {
    data = JSON.parse(text) as BackupData;
  } catch (e) {
    throw new Error("Arquivo JSON inválido.");
  }

  if (data.meta?.system !== "Life OS") {
    throw new Error("Este backup não pertence ao Life OS.");
  }

  let currentUser = await prisma.user.findFirst();

  if (!currentUser) {
    if (data.user) {
        currentUser = await prisma.user.create({
            data: {
                name: data.user.name || "Usuário Restaurado",
                email: data.user.email || "restaurado@lifeos.local",
                password: data.user.password || "admin",
                avatarUrl: data.user.avatarUrl,
                bio: data.user.bio
            }
        });
    } else {
        currentUser = await prisma.user.create({
            data: {
                name: "Admin Life OS",
                email: "admin@lifeos.local",
                password: "admin", 
                bio: "Usuário gerado automaticamente."
            }
        });
    }
  }

  try {
    await factoryReset(); // Limpa tudo antes de importar
    const userId = currentUser.id;

    // --- RECRIAÇÃO DOS DADOS ---
    
    // 1. Contas
    if (data.accounts?.length) {
      for (const a of data.accounts) {
        if (!a.name || !a.type) continue;
        const newAccount = await prisma.account.create({
          data: { name: a.name, type: a.type, balance: a.balance || 0, color: a.color, userId: userId }
        });
        if (a.transactions?.length) {
           await prisma.transaction.createMany({
              data: a.transactions.map((t) => ({
                 description: t.description || "Sem descrição",
                 amount: t.amount || 0,
                 type: t.type || "EXPENSE",
                 date: t.date ? new Date(t.date) : new Date(),
                 category: t.category || "Geral",
                 accountId: newAccount.id
              }))
           });
        }
      }
    }

    // 2. Projetos (COM CORREÇÃO DE SLUG)
    if (data.projects?.length) {
        for (const p of data.projects) {
          if (!p.title) continue;
          
          // ✅ CORREÇÃO: Gerar slug se não existir (Obrigatorio no Schema atual)
          const safeSlug = p.slug || generateSlug(p.title);

          const newProject = await prisma.project.create({
             data: { 
                 title: p.title, 
                 slug: safeSlug, // Usa o slug gerado
                 description: p.description, 
                 status: p.status || "ACTIVE", 
                 color: p.color, 
                 userId: userId 
             }
          });

          if (p.tasks?.length) {
             await prisma.task.createMany({
                data: p.tasks.map((t) => ({
                   title: t.title || "Tarefa",
                   isDone: t.isDone || false,
                   dueDate: t.dueDate ? new Date(t.dueDate) : null,
                   priority: t.priority || "MEDIUM",
                   image: t.image,
                   projectId: newProject.id
                }))
             });
          }
          if (p.events?.length) {
             await prisma.event.createMany({
                data: p.events.map((e) => ({
                   title: e.title || "Evento",
                   startTime: e.startTime ? new Date(e.startTime) : new Date(),
                   endTime: e.endTime ? new Date(e.endTime) : null,
                   isAllDay: e.isAllDay || false,
                   projectId: newProject.id
                }))
             });
          }
        }
    }

    // 3. Tarefas Avulsas
    if (data.tasksWithoutProject?.length) {
        await prisma.task.createMany({
            data: data.tasksWithoutProject.map((t) => ({
                title: t.title || "Tarefa Avulsa",
                isDone: t.isDone || false,
                dueDate: t.dueDate ? new Date(t.dueDate) : null,
                priority: t.priority || "MEDIUM",
                image: t.image,
                projectId: null
            }))
        });
    }

    // 4. Job Applications
    if (data.jobApplications?.length) {
        await prisma.jobApplication.createMany({
            data: data.jobApplications.map((j) => ({
                company: j.company || "Empresa",
                role: j.role || "Cargo",
                status: j.status || "APPLIED",
                jobUrl: j.jobUrl,
                salary: j.salary,
                requirements: j.requirements,
                type: j.type || "JOB",
                userId: userId
            }))
        });
    }

    // 5. Flashcards (COM CORREÇÃO DE CATEGORY)
    if (data.flashcardDecks?.length) {
        for (const d of data.flashcardDecks) {
            if (!d.title) continue;
            
            // ✅ CORREÇÃO: Removemos 'category' pois o banco não aceita
            // Apenas passamos 'title'
            const newDeck = await prisma.flashcardDeck.create({
                data: { title: d.title } 
            });
            
            if (d.cards?.length) {
                await prisma.flashcard.createMany({
                    data: d.cards.map((c) => ({
                        term: c.term || "",
                        definition: c.definition || "",
                        box: c.box || 1,
                        nextReview: c.nextReview ? new Date(c.nextReview) : null,
                        deckId: newDeck.id
                    }))
                });
            }
        }
    }

    // 6. Access Items
    if (data.accessItems?.length) {
        await prisma.accessItem.createMany({
            data: data.accessItems.map((item) => ({
                title: item.title || "Item seguro",
                username: item.username,
                password: item.password || "",
                url: item.url,
                category: item.category || "Geral",
                notes: item.notes,
                userId: userId
            }))
        });
    }

    // 7. Links Salvos (Novidade)
    if (data.savedLinks?.length) {
        await prisma.savedLink.createMany({
            data: data.savedLinks.map((l) => ({
                title: l.title || "Link",
                url: l.url || "#",
                description: l.description,
                imageUrl: l.imageUrl,
                category: l.category || "Geral",
                createdAt: l.createdAt ? new Date(l.createdAt) : new Date()
            }))
        });
    }

    // 8. Configurações
    if (data.settings) {
        const existingSettings = await prisma.settings.findFirst();
        if (existingSettings) {
            await prisma.settings.update({ 
                where: { id: existingSettings.id }, 
                data: { 
                    accentColor: data.settings.accentColor, 
                    theme: data.settings.theme, 
                    aiProvider: data.settings.aiProvider 
                }
            });
        }
    }

    revalidatePath("/");
    return { success: true };

  } catch (error) {
    console.error("Erro na importação JSON:", error);
    throw new Error("Erro ao processar dados JSON.");
  }
}

// ============================================================================
// 3. STORAGE STATS (ANALYTICS)
// ============================================================================
export async function getStorageStats() {
  // 1. Busca os dados reais para calcular o peso (Size)
  // Nota: Em apps gigantes, isso seria pesado. Para uso pessoal (SQLite), é rápido.
  const [
    projects, tasks, jobs, events, transactions, flashcards, aiMessages, accessItems, links
  ] = await Promise.all([
    prisma.project.findMany(),
    prisma.task.findMany(),
    prisma.jobApplication.findMany(),
    prisma.event.findMany(),
    prisma.transaction.findMany(),
    prisma.flashcard.findMany(),
    prisma.aiMessage.findMany(),
    prisma.accessItem.findMany(),
    prisma.savedLink.findMany()
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
// 4. CONFIGURAÇÕES GERAIS E IA
// ============================================================================
export async function updateAISettings(formData: FormData) {
  const aiProvider = formData.get("aiProvider") as string;
  const aiModel = formData.get("aiModel") as string;
  const aiPersona = formData.get("aiPersona") as string;
  const openaiKey = formData.get("openaiKey") as string;
  const groqKey = formData.get("groqKey") as string;
  const googleKey = formData.get("googleKey") as string;

  const existingSettings = await prisma.settings.findFirst();

  const dataToUpdate = {
    aiProvider,
    aiModel,
    aiPersona,
    ...(openaiKey && { openaiKey }),
    ...(groqKey && { groqKey }),
    ...(googleKey && { googleKey }),
  };

  if (existingSettings) {
    await prisma.settings.update({ where: { id: existingSettings.id }, data: dataToUpdate });
  } else {
    await prisma.settings.create({
      data: {
          ...dataToUpdate,
          openaiKey: openaiKey || null,
          groqKey: groqKey || null,
          googleKey: googleKey || null
      }
    });
  }
  revalidatePath("/");
}

// ============================================================================
// 5. UPDATE SETTINGS (PERFIL)
// ============================================================================
export async function updateSettings(formData: FormData) {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const bio = formData.get("bio") as string;
    const avatarUrl = formData.get("avatarUrl") as string;
    const accentColor = formData.get("accentColor") as string;
    const coverUrl = formData.get("coverUrl") as string;

    const user = await prisma.user.findFirst();
    const settings = await prisma.settings.findFirst();

    if (user) {
        await prisma.user.update({
            where: { id: user.id },
            data: { name, email, bio, avatarUrl, coverUrl }
        });
    } else {
        await prisma.user.create({
            data: { name, email, bio, avatarUrl, password: 'admin', coverUrl }
        });
    }

    if (settings) {
        await prisma.settings.update({
            where: { id: settings.id },
            data: { accentColor }
        });
    } else {
        await prisma.settings.create({
            data: { accentColor }
        });
    }

    revalidatePath("/settings");
    return { success: true };
}

// ============================================================================
// 6. GERENCIAMENTO DE PASTA (MOVER DB)
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
    
    const settings = await prisma.settings.findFirst();
    if (settings) {
        await prisma.settings.update({
            where: { id: settings.id },
            data: { storagePath: targetDir }
        });
    } else {
        await prisma.settings.create({
            data: { storagePath: targetDir }
        });
    }

    return { success: true, message: "Local alterado! Reinicie o aplicativo." };

  } catch (error) {
    console.error("Erro ao mover banco:", error);
    throw new Error("Falha ao mover o arquivo. Verifique permissões.");
  }
}

export async function listDirectories(currentPath: string) {
  try {
    if (currentPath === "ROOT" && os.platform() === 'win32') {
        const drives = [];
        for (let i = 65; i <= 90; i++) {
            const drive = String.fromCharCode(i) + ":\\";
            try {
                fs.accessSync(drive);
                drives.push({ name: `Disco Local (${drive})`, path: drive, type: 'drive' });
            } catch (e) {}
        }
        return { success: true, path: "Este Computador", directories: drives, isRoot: true };
    }

    const searchPath = currentPath && currentPath !== "Este Computador" ? currentPath : os.homedir();
    const entries = fs.readdirSync(searchPath, { withFileTypes: true });
    
    const directories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        name: entry.name,
        path: path.join(searchPath, entry.name),
        type: 'folder'
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, path: searchPath, directories, isRoot: false };

  } catch (error) {
    return { success: false, error: "Acesso negado ou pasta inválida." };
  }
}

// ============================================================================
// 7. SEGURANÇA E FACTORY RESET
// ============================================================================
export async function changePassword(formData: FormData) {
  const newPassword = formData.get("newPassword") as string;
  const user = await prisma.user.findFirst();
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newPassword }
    });
  }
  revalidatePath("/");
}

export async function factoryReset() {
  try {
    // Ordem de deleção: Nível 3 (Netos) -> Nível 1 (Pais)
    await prisma.transaction.deleteMany();
    await prisma.sitePage.deleteMany();
    await prisma.aiMessage.deleteMany();
    await prisma.flashcard.deleteMany();
    await prisma.task.deleteMany(); 
    await prisma.event.deleteMany(); 
    await prisma.studySession.deleteMany();
    await prisma.account.deleteMany();
    await prisma.project.deleteMany();
    await prisma.jobApplication.deleteMany();
    await prisma.studySubject.deleteMany();
    await prisma.flashcardDeck.deleteMany();
    await prisma.workout.deleteMany();
    await prisma.healthMetric.deleteMany();
    await prisma.managedSite.deleteMany();
    await prisma.aiChat.deleteMany();
    await prisma.accessItem.deleteMany();
    await prisma.savedLink.deleteMany(); // ✅ Adicionado Links
    // await prisma.friend.deleteMany(); // Descomente se usar
    // await prisma.wardrobeItem.deleteMany(); // Descomente se usar
    await prisma.backupLog.deleteMany(); 
    
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro no Factory Reset:", error);
    throw new Error("Falha ao apagar dados.");
  }
}

export async function updateSecurityPreferences(formData: FormData) {
    const autoLockMinutes = Number(formData.get("autoLockMinutes"));
    const privacyMode = formData.get("privacyMode") === "on";

    // 1. Tenta achar a configuração
    const existingSettings = await prisma.settings.findFirst();

    if (existingSettings) {
        // CENÁRIO A: Já existe -> Atualiza
        await prisma.settings.update({
            where: { id: existingSettings.id },
            data: { 
                autoLockMinutes: autoLockMinutes,
                privacyMode: privacyMode 
            }
        });
    } else {
        // CENÁRIO B: Não existe -> Cria do zero (Isso estava faltando!)
        // Precisamos vincular a um usuário se possível
        const user = await prisma.user.findFirst();
        
        await prisma.settings.create({
            data: {
                autoLockMinutes: autoLockMinutes,
                privacyMode: privacyMode,
                // Preenchemos os padrões obrigatórios
                theme: "system",
                accentColor: "blue",
                userId: user?.id
            }
        });
    }
    
    // 2. Força a atualização do cache
    revalidatePath("/settings");
    revalidatePath("/", "layout");
    
    return { success: true };
}

export async function verifyMasterPassword(password: string) {
    const user = await prisma.user.findFirst();
    if (!user) return { success: false };

    // Em produção, use bcrypt.compare(password, user.password)
    // Como seu sistema atual usa senha em texto plano (pelo código anterior):
    const isValid = user.password === password;

    return { success: isValid };
}

// ============================================================================
// 8. INTEGRAÇÕES (API KEYS)
// ============================================================================
export async function updateApiKeys(formData: FormData) {
    const tmdbApiKey = formData.get("tmdbApiKey") as string;
    const rawgApiKey = formData.get("rawgApiKey") as string;
    const pluggyClientId = formData.get("pluggyClientId") as string;
    const pluggyClientSecret = formData.get("pluggyClientSecret") as string;

    const existingSettings = await prisma.settings.findFirst();

    const finalData = {
        tmdbApiKey: tmdbApiKey || null,
        rawgApiKey: rawgApiKey || null,
        pluggyClientId: pluggyClientId || null,
        pluggyClientSecret: pluggyClientSecret || null,
    }

    if (existingSettings) {
        await prisma.settings.update({
            where: { id: existingSettings.id },
            data: finalData
        });
    } else {
        await prisma.settings.create({
            data: finalData
        });
    }

    revalidatePath("/settings");
    return { success: true, message: "Chaves de API salvas com sucesso!" };
}

// ============================================================================
// 9. MANUTENÇÃO AVANÇADA 
// ============================================================================

// Executa limpeza e compactação do SQLite
export async function optimizeDatabase() {
  try {
    const startTime = performance.now();
    
    // VACUUM: Reconstrói o banco para liberar espaço não utilizado
    await prisma.$executeRawUnsafe(`VACUUM;`);
    
    // OPTIMIZE: Melhora a performance de queries futuras
    await prisma.$executeRawUnsafe(`PRAGMA optimize;`);
    
    const duration = (performance.now() - startTime).toFixed(0);
    
    // Recalcula stats para mostrar a diferença
    revalidatePath("/settings");
    
    return { 
      success: true, 
      message: `Banco otimizado e compactado em ${duration}ms.` 
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao otimizar banco de dados." };
  }
}

// Verifica se o arquivo .db está saudável
export async function checkDatabaseIntegrity() {
  try {
    // PRAGMA integrity_check: Verifica consistência e corrupção
    const result = await prisma.$queryRawUnsafe<{ integrity_check: string }[]>(`PRAGMA integrity_check;`);
    
    // O resultado vem como array. Se o primeiro item for "ok", está tudo certo.
    // O retorno do Raw pode variar, então tratamos como any seguro ou unknown
    const status =  Array.isArray(result) && result[0] ? Object.values(result[0])[0] : "unknown";

    if (status === "ok") {
      return { success: true, message: "Integridade verificada: 100% Saudável." };
    } else {
      return { success: false, message: `Problemas encontrados: ${status}` };
    }
  } catch (error) {
    return { success: false, message: "Falha ao rodar diagnóstico." };
  }
}