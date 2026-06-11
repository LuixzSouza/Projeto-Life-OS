"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId, hashPassword } from "@/lib/auth";
import { generateSlug } from "./helpers";
import { BackupData } from "./types";
import { factoryReset } from "./security";
import {
  importFullBackup,
  wipeUserData,
  summarizeBackup,
  FullBackupFile,
  BackupSummary,
} from "@/lib/full-backup";

// ============================================================================
// VALIDAÇÃO DE BACKUP (dry-run) — lê o arquivo e devolve contagens SEM importar.
// "Backup que nunca foi testado não é backup."
// ============================================================================
export async function validateBackupFile(formData: FormData): Promise<BackupSummary> {
  await requireUserId();
  const file = formData.get("file") as File;
  if (!file) throw new Error("Nenhum arquivo enviado");

  try {
    return summarizeBackup(JSON.parse(await file.text()));
  } catch {
    throw new Error("Arquivo JSON inválido.");
  }
}

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

  // --- Formato v3 (schemaVersion >= 3): fidelidade total, IDs preservados ---
  if ((data.meta.schemaVersion ?? 0) >= 3) {
    const userId = await requireUserId();
    try {
      await wipeUserData(userId);
      const summary = await importFullBackup(userId, data as unknown as FullBackupFile);
      revalidatePath("/");
      return { success: true, total: summary.total };
    } catch (error) {
      console.error("Erro na importação v3:", error);
      throw new Error("Erro ao importar o backup completo.");
    }
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

    // 8. Estudos — Matérias (+ sessões)
    if (data.studySubjects?.length) {
      for (const s of data.studySubjects) {
        if (!s.title) continue;
        const newSubject = await prisma.studySubject.create({
          data: {
            title: s.title,
            description: s.description ?? null,
            category: s.category ?? null,
            color: s.color ?? "blue",
            icon: s.icon ?? null,
            userId,
          },
        });
        if (s.sessions?.length) {
          await prisma.studySession.createMany({
            data: s.sessions.map((ses) => ({
              durationMinutes: ses.durationMinutes ?? 0,
              date: ses.date ? new Date(ses.date) : new Date(),
              focusLevel: ses.focusLevel ?? 3,
              subjectId: newSubject.id,
              userId,
            })),
          });
        }
      }
    }

    // 9. Saúde — Treinos
    if (data.workouts?.length) {
      await prisma.workout.createMany({
        data: data.workouts.map((w) => ({
          title: w.title || "Treino",
          type: w.type || "GENERAL",
          duration: w.duration ?? 0,
          intensity: w.intensity || "MEDIUM",
          feeling: w.feeling ?? null,
          notes: w.notes ?? null,
          date: w.date ? new Date(w.date) : new Date(),
          userId,
        })),
      });
    }

    // 10. Saúde — Métricas
    if (data.healthMetrics?.length) {
      await prisma.healthMetric.createMany({
        data: data.healthMetrics.map((m) => ({
          type: m.type || "weight",
          value: m.value ?? 0,
          date: m.date ? new Date(m.date) : new Date(),
          userId,
        })),
      });
    }

    // 11. Agenda — Eventos avulsos (sem projeto)
    if (data.events?.length) {
      await prisma.event.createMany({
        data: data.events.map((e) => ({
          title: e.title || "Evento",
          startTime: e.startTime ? new Date(e.startTime) : new Date(),
          endTime: e.endTime ? new Date(e.endTime) : null,
          isAllDay: e.isAllDay ?? false,
          description: e.description ?? null,
          category: e.category || "general",
          projectId: null,
          userId,
        })),
      });
    }

    // 12. Sites Gerenciados (+ páginas)
    if (data.sites?.length) {
      for (const site of data.sites) {
        if (!site.name) continue;
        const newSite = await prisma.managedSite.create({
          data: { name: site.name, url: site.url ?? null, userId },
        });
        if (site.pages?.length) {
          await prisma.sitePage.createMany({
            data: site.pages
              .filter((p) => p.slug)
              .map((p) => ({
                slug: p.slug as string,
                content: p.content ?? "",
                siteId: newSite.id,
                userId,
              })),
          });
        }
      }
    }

    // 13. Desafios de treino (+ check-ins)
    if (data.challenges?.length) {
      for (const c of data.challenges) {
        if (!c.title) continue;
        const newChallenge = await prisma.challenge.create({
          data: {
            title: c.title,
            description: c.description ?? null,
            category: c.category ?? null,
            durationDays: c.durationDays ?? 30,
            startDate: c.startDate ? new Date(c.startDate) : new Date(),
            color: c.color ?? null,
            isActive: c.isActive ?? true,
            userId,
          },
        });
        if (c.checkins?.length) {
          await prisma.challengeCheckin.createMany({
            data: c.checkins.map((ck) => ({
              dayIndex: ck.dayIndex ?? 0,
              date: ck.date ? new Date(ck.date) : new Date(),
              note: ck.note ?? null,
              challengeId: newChallenge.id,
              userId,
            })),
          });
        }
      }
    }

    // 14. Currículo / Portfólio (1 por usuário)
    if (data.portfolio?.data) {
      await prisma.portfolio.upsert({
        where: { userId },
        update: { data: data.portfolio.data },
        create: { userId, data: data.portfolio.data },
      });
    }

    // 15. Configurações
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
