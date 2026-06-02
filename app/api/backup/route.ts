import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    // 1. Busca TUDO do banco de dados em paralelo
    const [
      user,
      settings,
      accounts,
      projects,
      tasksWithoutProject,
      jobApplications,
      studySubjects,
      flashcardDecks,
      workouts,
      healthMetrics,
      events,
      sites,
      accessItems,
      savedLinks, // ✅ NOVO: Incluindo a Biblioteca de Links
      aiMessages,
      portfolio, // ✅ NOVO: Currículo / Portfólio (Builder Engine)
      challenges // ✅ NOVO: Desafios de treino
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.settings.findUnique({ where: { userId } }),
      // Finanças
      prisma.account.findMany({ where: { userId }, include: { transactions: true } }),
      // Projetos e Tarefas
      prisma.project.findMany({ where: { userId }, include: { tasks: true, events: true } }),
      prisma.task.findMany({ where: { projectId: null, userId } }), // Inbox
      // Carreira
      prisma.jobApplication.findMany({ where: { userId } }),
      // Estudos
      prisma.studySubject.findMany({ where: { userId }, include: { sessions: true } }),
      prisma.flashcardDeck.findMany({ where: { userId }, include: { cards: true } }),
      // Saúde
      prisma.workout.findMany({ where: { userId } }),
      prisma.healthMetric.findMany({ where: { userId } }),
      // Agenda (Eventos soltos)
      prisma.event.findMany({ where: { projectId: null, userId } }),
      // CMS
      prisma.managedSite.findMany({ where: { userId }, include: { pages: true } }),
      // Cofre
      prisma.accessItem.findMany({ where: { userId } }),
      // Links
      prisma.savedLink.findMany({ where: { userId } }),
      // IA (Aumentado limite para preservar contexto)
      prisma.aiMessage.findMany({ where: { userId }, take: 500, orderBy: { createdAt: 'desc' } }),
      // Currículo / Portfólio
      prisma.portfolio.findUnique({ where: { userId } }),
      // Desafios de treino
      prisma.challenge.findMany({ where: { userId }, include: { checkins: true } })
    ]);

    // 2. Monta o objeto de Backup com estrutura compatível com a importação
    const backupData = {
      meta: {
        system: "Life OS",
        version: "2.0", // Atualizado para refletir novas features
        date: new Date().toISOString(),
      },
      user,
      settings,
      accounts,
      projects,
      tasksWithoutProject,
      jobApplications,
      studySubjects,
      flashcardDecks,
      workouts,
      healthMetrics,
      events,
      sites,
      accessItems,
      savedLinks, // ✅ Exportando os links
      aiMessages: aiMessages.reverse(), // Reordena para cronológico (Antigo -> Novo)
      portfolio, // ✅ Currículo / Portfólio
      challenges // ✅ Desafios de treino
    };

    // 3. Gera o JSON
    const json = JSON.stringify(backupData, null, 2);

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Nome do arquivo com data: life-os-backup-2023-10-25.json
        'Content-Disposition': `attachment; filename="life-os-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });

  } catch (error) {
    console.error("Erro ao gerar backup:", error);
    return NextResponse.json(
      { error: "Falha ao gerar arquivo de backup." },
      { status: 500 }
    );
  }
}