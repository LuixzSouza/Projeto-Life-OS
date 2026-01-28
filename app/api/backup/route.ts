import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
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
      aiMessages
    ] = await Promise.all([
      prisma.user.findFirst(),
      prisma.settings.findFirst(),
      // Finanças
      prisma.account.findMany({ include: { transactions: true } }),
      // Projetos e Tarefas
      prisma.project.findMany({ include: { tasks: true, events: true } }),
      prisma.task.findMany({ where: { projectId: null } }), // Inbox
      // Carreira
      prisma.jobApplication.findMany(),
      // Estudos
      prisma.studySubject.findMany({ include: { sessions: true } }),
      prisma.flashcardDeck.findMany({ include: { cards: true } }),
      // Saúde
      prisma.workout.findMany(),
      prisma.healthMetric.findMany(),
      // Agenda (Eventos soltos)
      prisma.event.findMany({ where: { projectId: null } }),
      // CMS
      prisma.managedSite.findMany({ include: { pages: true } }),
      // Cofre
      prisma.accessItem.findMany(),
      // Links
      prisma.savedLink.findMany(), 
      // IA (Aumentado limite para preservar contexto)
      prisma.aiMessage.findMany({ take: 500, orderBy: { createdAt: 'desc' } }) 
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
      aiMessages: aiMessages.reverse() // Reordena para cronológico (Antigo -> Novo)
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