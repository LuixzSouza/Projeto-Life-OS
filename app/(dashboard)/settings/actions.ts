"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Project, Account, Task, Transaction, StudySubject, StudySession, Workout, HealthMetric, Event, ManagedSite, SitePage } from "@prisma/client";

// Nova Action: Salvar Configurações de IA
export async function updateAISettings(formData: FormData) {
  const aiProvider = formData.get("aiProvider") as string;
  const aiModel = formData.get("aiModel") as string;
  const aiPersona = formData.get("aiPersona") as string;

  const settings = await prisma.settings.findFirst();
  if (settings) {
    await prisma.settings.update({
      where: { id: settings.id },
      data: { aiProvider, aiModel, aiPersona }
    });
  }
  revalidatePath("/");
}

// Nova Action: Alterar Senha (Simulação Robusta)
export async function changePassword(formData: FormData) {
  const newPassword = formData.get("newPassword") as string;
  
  // Em um app real, aqui usaríamos bcrypt.hash(newPassword, 10)
  // Como é local e sem login ativo ainda, salvamos direto para manter o fluxo
  const user = await prisma.user.findFirst();
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newPassword } // Imagine um hash aqui
    });
  }
  revalidatePath("/");
}

// Nova Função de Leitura (Não é action, é helper): Estatísticas de Uso
export async function getStorageStats() {
  // Contagens paralelas para performance (Promise.all é a chave da escalabilidade aqui)
  const [
    finances,
    tasks,
    studies,
    health,
    cms,
    chat
  ] = await Promise.all([
    prisma.transaction.count(),
    prisma.task.count(),
    prisma.studySession.count(),
    prisma.workout.count() + prisma.healthMetric.count(),
    prisma.sitePage.count(),
    prisma.aiMessage.count()
  ]);

  const total = finances + tasks + studies + health + cms + chat;
  
  // Retorna porcentagens para a UI
  return {
    totalItems: total,
    breakdown: [
      { label: "Financeiro", count: finances, percent: total ? (finances/total)*100 : 0, color: "bg-green-500" },
      { label: "Tarefas & Projetos", count: tasks, percent: total ? (tasks/total)*100 : 0, color: "bg-blue-500" },
      { label: "Estudos", count: studies, percent: total ? (studies/total)*100 : 0, color: "bg-yellow-500" },
      { label: "Saúde", count: health, percent: total ? (health/total)*100 : 0, color: "bg-red-500" },
      { label: "CMS & Sites", count: cms, percent: total ? (cms/total)*100 : 0, color: "bg-purple-500" },
      { label: "Chat IA", count: chat, percent: total ? (chat/total)*100 : 0, color: "bg-zinc-500" },
    ]
  };
}

// ... (Mantenha a função updateSettings como estava) ...
export async function updateSettings(formData: FormData) {
  // ... (código da updateSettings que já estava funcionando)
  // Vou resumir aqui para não ocupar espaço, mas mantenha ela!
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const avatarUrl = formData.get("avatarUrl") as string;
  const bio = formData.get("bio") as string;
  const accentColor = formData.get("accentColor") as string;

  try {
    let user = await prisma.user.findFirst();
    // SE NÃO EXISTE USUÁRIO, CRIA UM AGORA
    if (!user) {
        user = await prisma.user.create({
            data: {
                name: name || "Admin",
                email: email || "admin@lifeos.local",
                password: "hash_dummy",
            }
        });
    } else {
        await prisma.user.update({
            where: { id: user.id },
            data: { name, email, avatarUrl, bio }
        });
    }

    const settings = await prisma.settings.findFirst();
    if (settings) {
      await prisma.settings.update({ where: { id: settings.id }, data: { accentColor } });
    } else {
      await prisma.settings.create({ data: { accentColor: accentColor || "theme-blue" } });
    }
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar settings:", error);
    throw new Error("Falha ao salvar configurações.");
  }
}

// --- RESTORE BACKUP CORRIGIDO (COM FALLBACK DE USUÁRIO) ---
export async function restoreBackup(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("Nenhum arquivo enviado");

  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error("Arquivo JSON inválido.");
  }

  if (data.meta?.system !== "Life OS") {
    throw new Error("Este backup não pertence ao Life OS.");
  }

  // 1. Identificar ou Criar Usuário Dono
  let currentUser = await prisma.user.findFirst();

  if (!currentUser) {
    if (data.user) {
        // Cenário A: Backup tem usuário -> Usa ele
        console.log("Restaurando usuário do backup...");
        currentUser = await prisma.user.create({
            data: {
                id: data.user.id, 
                name: data.user.name || "Usuário Restaurado",
                email: data.user.email || "restaurado@lifeos.local",
                password: data.user.password || "hash_dummy",
                avatarUrl: data.user.avatarUrl,
                bio: data.user.bio
            }
        });
    } else {
        // Cenário B: Backup SEM usuário (O seu erro) -> Cria um Default
        console.log("Backup sem usuário. Criando usuário padrão...");
        currentUser = await prisma.user.create({
            data: {
                name: "Admin Life OS",
                email: "admin@lifeos.local", // Email fictício
                password: "admin", 
                bio: "Usuário gerado automaticamente pelo Restore."
            }
        });
    }
  }

  try {
    // 2. Limpeza Total
    await factoryReset(); 

    // 3. Recriar Dados (Agora currentUser é garantido!)
    
    // Contas
    if (data.accounts?.length) {
      await prisma.account.createMany({
        data: data.accounts.map((a: Account) => ({
            id: a.id, name: a.name, type: a.type, balance: a.balance, color: a.color, 
            userId: currentUser!.id // O "!" garante que não é nulo
        }))
      });
    }

    // Transações
    if (data.accounts?.length) { 
        for (const acc of data.accounts) {
            const txs = acc.transactions; 
            if (txs && txs.length > 0) {
                await prisma.transaction.createMany({
                    data: txs.map((t: Transaction) => ({
                        id: t.id, description: t.description, amount: t.amount, type: t.type, date: t.date, category: t.category,
                        accountId: acc.id
                    }))
                });
            }
        }
    }

    // Projetos
    if (data.projects?.length) {
      await prisma.project.createMany({
        data: data.projects.map((p: Project) => ({
            id: p.id, title: p.title, description: p.description, status: p.status,
            userId: currentUser!.id
        }))
      });

      for (const proj of data.projects) {
          const tasks = proj.tasks;
          if (tasks && tasks.length > 0) {
              await prisma.task.createMany({
                  data: tasks.map((t: Task) => ({
                      id: t.id, title: t.title, isDone: t.isDone, dueDate: t.dueDate,
                      projectId: proj.id
                  }))
              });
          }
      }
    }

    // Tarefas Avulsas
    if (data.tasksWithoutProject?.length) {
        await prisma.task.createMany({
            data: data.tasksWithoutProject.map((t: Task) => ({
                id: t.id, title: t.title, isDone: t.isDone, dueDate: t.dueDate,
                projectId: null
            }))
        });
    }

    // Matérias
    if (data.studySubjects?.length) {
        await prisma.studySubject.createMany({
            data: data.studySubjects.map((s: StudySubject) => ({
                id: s.id, title: s.title, category: s.category, color: s.color
            }))
        });

        for (const sub of data.studySubjects) {
            const sessions = sub.sessions;
            if (sessions?.length) {
                await prisma.studySession.createMany({
                    data: sessions.map((s: StudySession) => ({
                        id: s.id, durationMinutes: s.durationMinutes, notes: s.notes, date: s.date,
                        subjectId: sub.id
                    }))
                });
            }
        }
    }

    // Outros módulos
    if (data.workouts?.length) await prisma.workout.createMany({ data: data.workouts });
    if (data.healthMetrics?.length) await prisma.healthMetric.createMany({ data: data.healthMetrics });
    if (data.events?.length) await prisma.event.createMany({ data: data.events });

    // CMS
    if (data.sites?.length) {
        await prisma.managedSite.createMany({
            data: data.sites.map((s: ManagedSite) => ({
                id: s.id, name: s.name, url: s.url, apiKey: s.apiKey
            }))
        });
        for (const site of data.sites) {
             const pages = site.pages;
            if (pages?.length) {
                await prisma.sitePage.createMany({
                    data: pages.map((p: SitePage) => ({
                        id: p.id, slug: p.slug, content: p.content, siteId: site.id
                    }))
                });
            }
        }
    }
    
    // Configurações
    if (data.settings) {
        const existingSettings = await prisma.settings.findFirst();
        if (existingSettings) {
            await prisma.settings.update({ 
                where: { id: existingSettings.id }, 
                data: { accentColor: data.settings.accentColor, theme: data.settings.theme }
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

    revalidatePath("/");
    return { success: true };

  } catch (error) {
    console.error("Erro no restore:", error);
    throw new Error("Erro ao processar dados. Tente novamente.");
  }
}

// Factory Reset (Mantido)
export async function factoryReset() {
  try {
    await prisma.transaction.deleteMany();
    await prisma.task.deleteMany();
    await prisma.studySession.deleteMany();
    await prisma.sitePage.deleteMany();
    await prisma.aiMessage.deleteMany();
    
    await prisma.account.deleteMany();
    await prisma.project.deleteMany();
    await prisma.studySubject.deleteMany();
    await prisma.workout.deleteMany();
    await prisma.healthMetric.deleteMany();
    await prisma.event.deleteMany();
    await prisma.managedSite.deleteMany();
    await prisma.aiChat.deleteMany();
    
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro no Factory Reset:", error);
    throw new Error("Falha ao apagar dados.");
  }
}

