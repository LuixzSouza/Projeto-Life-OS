"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from 'fs';
import path from 'path';
import { getDatabasePath, setDatabasePath } from "@/lib/db-config";
import os from 'os';
// Importamos os tipos do Prisma para compor nossa interface de Backup
import { 
  Project, 
  Account, 
  Task, 
  Transaction, 
  StudySubject, 
  StudySession, 
  Workout, 
  HealthMetric, 
  Event, 
  ManagedSite, 
  SitePage,
  Flashcard,
  FlashcardDeck,
  AccessItem,
  AiMessage,
  User,
  Settings,
  JobApplication
} from "@prisma/client";

// ============================================================================
// 0. DEFINIÇÃO DE TIPOS DO BACKUP (Para evitar 'any')
// ============================================================================

// Definimos estruturas que incluem os relacionamentos aninhados (ex: Project tem Tasks)
type ProjectWithRelations = Partial<Project> & {
    tasks?: Partial<Task>[];
    events?: Partial<Event>[];
};

type AccountWithRelations = Partial<Account> & {
    transactions?: Partial<Transaction>[];
};

type SubjectWithRelations = Partial<StudySubject> & {
    sessions?: Partial<StudySession>[];
};

type SiteWithRelations = Partial<ManagedSite> & {
    pages?: Partial<SitePage>[];
};

type DeckWithRelations = Partial<FlashcardDeck> & {
    cards?: Partial<Flashcard>[];
};

// Interface Principal do Backup
interface BackupData {
    meta?: { system: string; version?: string; date?: string };
    user?: Partial<User>;
    settings?: Partial<Settings>;
    accounts?: AccountWithRelations[];
    projects?: ProjectWithRelations[];
    tasksWithoutProject?: Partial<Task>[];
    jobApplications?: Partial<JobApplication>[];
    studySubjects?: SubjectWithRelations[];
    flashcardDecks?: DeckWithRelations[];
    workouts?: Partial<Workout>[];
    healthMetrics?: Partial<HealthMetric>[];
    events?: Partial<Event>[]; // Eventos soltos
    sites?: SiteWithRelations[];
    accessItems?: Partial<AccessItem>[];
    aiMessages?: Partial<AiMessage>[]; // Caso queira salvar histórico
}

// ============================================================================
// 1. ANALYTICS DE DADOS (Para o Gráfico de Armazenamento)
// ============================================================================
export async function getStorageStats() {
  const [
    projects,
    tasks,
    jobs,
    events,
    transactions,
    flashcards,
    aiMessages,
    accessItems
  ] = await Promise.all([
    prisma.project.count(),
    prisma.task.count(),
    prisma.jobApplication.count(),
    prisma.event.count(),
    prisma.transaction.count(),
    prisma.flashcard.count(),
    prisma.aiMessage.count(),
    prisma.accessItem.count()
  ]);

  const totalItems = projects + tasks + jobs + events + transactions + flashcards + aiMessages + accessItems;

  if (totalItems === 0) {
    return {
      totalItems: 0,
      breakdown: []
    };
  }

  const calc = (val: number) => (val / totalItems) * 100;

  return {
    totalItems,
    breakdown: [
      { label: "Tarefas", count: tasks, percent: calc(tasks), color: "bg-emerald-500" },
      { label: "Projetos", count: projects, percent: calc(projects), color: "bg-indigo-500" },
      { label: "Finanças", count: transactions, percent: calc(transactions), color: "bg-blue-500" },
      { label: "Vagas", count: jobs, percent: calc(jobs), color: "bg-amber-500" },
      { label: "Agenda", count: events, percent: calc(events), color: "bg-rose-500" },
      { label: "Estudos", count: flashcards, percent: calc(flashcards), color: "bg-purple-500" },
      { label: "IA Chat", count: aiMessages, percent: calc(aiMessages), color: "bg-zinc-500" },
      { label: "Cofre", count: accessItems, percent: calc(accessItems), color: "bg-orange-500" },
    ].sort((a, b) => b.percent - a.percent)
  };
}

// ============================================================================
// 2. CONFIGURAÇÃO DE IA
// ============================================================================
export async function updateAISettings(formData: FormData) {
  const aiProvider = formData.get("aiProvider") as string;
  const aiModel = formData.get("aiModel") as string;
  const aiPersona = formData.get("aiPersona") as string;
  
  // ✅ Pegando as chaves do formulário
  const openaiKey = formData.get("openaiKey") as string;
  const groqKey = formData.get("groqKey") as string;
  const googleKey = formData.get("googleKey") as string;

  const existingSettings = await prisma.settings.findFirst();

  const dataToUpdate = {
    aiProvider,
    aiModel,
    aiPersona,
    // Só atualiza se o usuário digitou algo (para não apagar chaves existentes se deixar em branco)
    ...(openaiKey && { openaiKey }),
    ...(groqKey && { groqKey }),
    ...(googleKey && { googleKey }),
  };

  if (existingSettings) {
    await prisma.settings.update({
      where: { id: existingSettings.id },
      data: dataToUpdate
    });
  } else {
    await prisma.settings.create({
      data: {
          ...dataToUpdate,
          // Campos obrigatórios no create se não existirem
          openaiKey: openaiKey || null,
          groqKey: groqKey || null,
          googleKey: googleKey || null
      }
    });
  }
  revalidatePath("/");
  revalidatePath("/ai");
  revalidatePath("/settings");
}

// ============================================================================
// 3. SEGURANÇA (Alterar Senha)
// ============================================================================
export async function changePassword(formData: FormData) {
  const newPassword = formData.get("newPassword") as string;
  
  // Em produção, use bcrypt.hash(newPassword, 10). 
  // Aqui estamos salvando direto conforme solicitado para o ambiente local.
  const user = await prisma.user.findFirst();
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newPassword }
    });
  }
  revalidatePath("/");
}

// ============================================================================
// 4. RESTORE BACKUP
// ============================================================================
export async function restoreBackup(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("Nenhum arquivo enviado");

  const text = await file.text();
  
  // 1. Parsing Tipado: Definimos que o JSON tem o formato BackupData
  let data: BackupData;
  try {
    data = JSON.parse(text) as BackupData;
  } catch (e) {
    throw new Error("Arquivo JSON inválido.");
  }

  // Validação básica
  if (data.meta?.system !== "Life OS") {
    throw new Error("Este backup não pertence ao Life OS.");
  }

  // 2. Identificar ou Criar Usuário Dono para vincular os dados
  let currentUser = await prisma.user.findFirst();

  if (!currentUser) {
    if (data.user) {
        // Tenta usar o usuário do backup
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
        // Cria um padrão se não existir no backup
        currentUser = await prisma.user.create({
            data: {
                name: "Admin Life OS",
                email: "admin@lifeos.local",
                password: "admin", 
                bio: "Usuário gerado automaticamente pelo Restore."
            }
        });
    }
  }

  try {
    // 3. Limpeza Total antes de restaurar
    await factoryReset(); 

    const userId = currentUser.id;

    // 4. Restaurar Dados (Agora o TypeScript sabe os tipos dentro do .map)
    
    // Contas e Transações
    if (data.accounts?.length) {
      for (const a of data.accounts) {
        if (!a.name || !a.type) continue; // Validação simples
        
        const newAccount = await prisma.account.create({
          data: {
            name: a.name, 
            type: a.type, 
            balance: a.balance || 0, 
            color: a.color, 
            userId: userId
          }
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

    // Projetos, Tarefas e Eventos
    if (data.projects?.length) {
      for (const p of data.projects) {
         if (!p.title) continue;

         const newProject = await prisma.project.create({
            data: {
               title: p.title, 
               description: p.description, 
               status: p.status || "ACTIVE", 
               color: p.color,
               userId: userId
            }
         });

         if (p.tasks?.length) {
            await prisma.task.createMany({
               data: p.tasks.map((t) => ({
                  title: t.title || "Tarefa sem nome",
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
                  title: e.title || "Evento sem nome",
                  startTime: e.startTime ? new Date(e.startTime) : new Date(),
                  endTime: e.endTime ? new Date(e.endTime) : null,
                  isAllDay: e.isAllDay || false,
                  projectId: newProject.id
               }))
            });
         }
      }
    }

    // Tarefas Avulsas
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

    // Vagas (Jobs)
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

    // Estudos (Flashcards)
    if (data.flashcardDecks?.length) {
        for (const d of data.flashcardDecks) {
            if (!d.title) continue;
            
            const newDeck = await prisma.flashcardDeck.create({
                data: { title: d.title, category: d.category }
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

    // Matérias e Sessões
    if (data.studySubjects?.length) {
        for (const s of data.studySubjects) {
            if (!s.title || !s.category) continue;

            const newSubject = await prisma.studySubject.create({
                data: { title: s.title, category: s.category, color: s.color }
            });

            if (s.sessions?.length) {
                await prisma.studySession.createMany({
                    data: s.sessions.map(sess => ({
                        durationMinutes: sess.durationMinutes || 0,
                        notes: sess.notes,
                        date: sess.date ? new Date(sess.date) : new Date(),
                        subjectId: newSubject.id
                    }))
                });
            }
        }
    }

    // CMS (Sites)
    if (data.sites?.length) {
        for (const s of data.sites) {
             if (!s.name) continue;

             const newSite = await prisma.managedSite.create({
                data: { name: s.name, url: s.url, apiKey: s.apiKey || "generated_key" }
             });
             
             if (s.pages?.length) {
                 await prisma.sitePage.createMany({
                    data: s.pages.map((p) => ({
                        slug: p.slug || "/",
                        content: p.content || "",
                        siteId: newSite.id
                    }))
                 });
             }
        }
    }

    // Cofre (Access Items)
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

    // Workouts e Health
    if (data.workouts?.length) {
         await prisma.workout.createMany({
            data: data.workouts.map(w => ({
                title: w.title || "Treino",
                type: w.type || "Geral",
                duration: w.duration || 0,
                intensity: w.intensity || "Média",
                date: w.date ? new Date(w.date) : new Date()
            }))
         });
    }

    // Configurações e Perfil
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
        } else {
            await prisma.settings.create({
                data: { 
                    accentColor: data.settings.accentColor || "theme-blue", 
                    theme: data.settings.theme || "system" 
                }
            });
        }
    }

    if (data.user) {
         await prisma.user.update({
            where: { id: userId },
            data: { bio: data.user.bio, avatarUrl: data.user.avatarUrl }
         });
    }

    revalidatePath("/");
    return { success: true };

  } catch (error) {
    console.error("Erro no restore:", error);
    throw new Error("Erro ao processar dados. O arquivo pode estar corrompido ou incompatível.");
  }
}

// ============================================================================
// 5. FACTORY RESET
// ============================================================================
export async function factoryReset() {
  try {
    // Ordem de deleção: Filhos -> Pais para evitar erro de Foreign Key
    
    // Nível 3 (Netos)
    await prisma.transaction.deleteMany();
    await prisma.sitePage.deleteMany();
    await prisma.aiMessage.deleteMany();
    await prisma.flashcard.deleteMany();
    
    // Nível 2 (Filhos)
    await prisma.task.deleteMany(); 
    await prisma.event.deleteMany(); 
    await prisma.studySession.deleteMany();
    
    // Nível 1 (Pais/Independentes)
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
    await prisma.friend.deleteMany();
    await prisma.wardrobeItem.deleteMany();
    
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro no Factory Reset:", error);
    throw new Error("Falha ao apagar dados. Tente novamente.");
  }
}

// ============================================================================
// 6. ATUALIZAR PERFIL (SETTINGS)
// ============================================================================
export async function updateSettings(formData: FormData) {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const bio = formData.get("bio") as string;
    const avatarUrl = formData.get("avatarUrl") as string;
    const accentColor = formData.get("accentColor") as string;
    const coverUrl = formData.get("coverUrl") as string

    const user = await prisma.user.findFirst();
    const settings = await prisma.settings.findFirst();

    if (user) {
        await prisma.user.update({
            where: { id: user.id },
            data: { name, email, bio, avatarUrl, coverUrl: coverUrl, }
        });
    } else {
        // Fallback create se não existir user (incomum mas possível em dev)
         await prisma.user.create({
            data: { name, email, bio, avatarUrl, password: 'admin' }
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
// 7. GERENCIAMENTO DE ARMAZENAMENTO (MOVER BANCO)
// ============================================================================
export async function updateStoragePath(formData: FormData) {
  const newPathRaw = formData.get("storagePath") as string;
  
  if (!newPathRaw) throw new Error("Caminho inválido.");

  // Normaliza o caminho
  let newDbPath = path.normalize(newPathRaw);
  
  // Se o usuário digitou apenas uma pasta (ex: D:/LifeOS), adicionamos o arquivo
  if (!newDbPath.endsWith(".db")) {
    newDbPath = path.join(newDbPath, "life_os.db");
  }

  const currentDbPath = getDatabasePath();

  // Se for o mesmo caminho, não faz nada
  if (currentDbPath === newDbPath) return;

  try {
    // 1. Garante que a pasta de destino existe
    const targetDir = path.dirname(newDbPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 2. Copia o banco atual para o novo local
    if (fs.existsSync(currentDbPath)) {
        fs.copyFileSync(currentDbPath, newDbPath);
        console.log(`✅ Banco copiado de ${currentDbPath} para ${newDbPath}`);
    } else {
        console.log("ℹ️ Nenhum banco anterior encontrado. Um novo será criado.");
    }

    // 3. Atualiza o arquivo JSON de configuração
    setDatabasePath(newDbPath);
    
    // 4. Salva no banco SQL para o monitoramento de disco (Dashboard)
    // O erro sumirá após rodar 'npx prisma generate'
    const settings = await prisma.settings.findFirst();
    
    if (settings) {
        await prisma.settings.update({
            where: { id: settings.id },
            data: { storagePath: targetDir } // Salva a pasta, não o arquivo
        });
    } else {
        // Fallback caso não exista settings ainda
        await prisma.settings.create({
            data: { storagePath: targetDir }
        });
    }

    return { success: true, message: "Local alterado! Reinicie o aplicativo." };

  } catch (error) {
    console.error("Erro ao mover banco:", error);
    throw new Error("Falha ao mover o arquivo. Verifique permissões da pasta.");
  }
}

export async function listDirectories(currentPath: string) {
  try {
    // Lógica para detectar Discos no Windows quando o caminho for "ROOT"
    if (currentPath === "ROOT" && os.platform() === 'win32') {
        const drives = [];
        // Verifica letras de A a Z
        for (let i = 65; i <= 90; i++) {
            const drive = String.fromCharCode(i) + ":\\";
            try {
                fs.accessSync(drive); // Testa se o disco existe/está acessível
                drives.push({ name: `Disco Local (${drive})`, path: drive, type: 'drive' });
            } catch (e) {
                // Disco não existe, ignora
            }
        }
        return { success: true, path: "Este Computador", directories: drives, isRoot: true };
    }

    // Se caminho vazio, usa a Home do usuário como padrão
    const searchPath = currentPath && currentPath !== "Este Computador" ? currentPath : os.homedir();
    
    // Tenta ler o diretório
    const entries = fs.readdirSync(searchPath, { withFileTypes: true });
    
    const directories = entries
      .filter(entry => entry.isDirectory()) // Só mostra pastas
      .map(entry => ({
        name: entry.name,
        path: path.join(searchPath, entry.name),
        type: 'folder'
      }))
      // Ordena alfabeticamente
      .sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, path: searchPath, directories, isRoot: false };

  } catch (error) {
    console.error("Erro ao ler pasta:", error);
    return { success: false, error: "Acesso negado ou pasta inválida." };
  }
}