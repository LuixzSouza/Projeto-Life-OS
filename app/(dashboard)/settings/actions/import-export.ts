"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId, hashPassword } from "@/lib/auth";
import { generateSlug } from "./helpers";
import { BackupData } from "./types";
import { factoryReset } from "./security";

// ============================================================================
// IMPORTAÇÃO JSON (ANTIGO restoreBackup)
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

  const sessionUserId = await requireUserId();
  let currentUser = await prisma.user.findUnique({ where: { id: sessionUserId } });

  if (!currentUser) {
    if (data.user) {
        currentUser = await prisma.user.create({
            data: {
                name: data.user.name || "Usuário Restaurado",
                email: data.user.email || "restaurado@lifeos.local",
                // Backup pós-migração já traz o hash bcrypt; sem senha, hash do default
                password: data.user.password || await hashPassword("admin"),
                avatarUrl: data.user.avatarUrl,
                bio: data.user.bio
            }
        });
    } else {
        currentUser = await prisma.user.create({
            data: {
                name: "Admin Life OS",
                email: "admin@lifeos.local",
                password: await hashPassword("admin"),
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
                 accountId: newAccount.id,
                 userId
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
                   projectId: newProject.id,
                   userId
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
                   projectId: newProject.id,
                   userId
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
                projectId: null,
                userId
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
                data: { title: d.title, userId }
            });

            if (d.cards?.length) {
                await prisma.flashcard.createMany({
                    data: d.cards.map((c) => ({
                        term: c.term || "",
                        definition: c.definition || "",
                        box: c.box || 1,
                        nextReview: c.nextReview ? new Date(c.nextReview) : null,
                        deckId: newDeck.id,
                        userId
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
                createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
                userId
            }))
        });
    }

    // 8. Configurações
    if (data.settings) {
        await prisma.settings.upsert({
            where: { userId },
            update: {
                accentColor: data.settings.accentColor,
                theme: data.settings.theme,
                aiProvider: data.settings.aiProvider
            },
            create: {
                userId,
                accentColor: data.settings.accentColor ?? "zinc",
                theme: data.settings.theme ?? "system",
                aiProvider: data.settings.aiProvider ?? "ollama"
            }
        });
    }

    revalidatePath("/");
    return { success: true };

  } catch (error) {
    console.error("Erro na importação JSON:", error);
    throw new Error("Erro ao processar dados JSON.");
  }
}
