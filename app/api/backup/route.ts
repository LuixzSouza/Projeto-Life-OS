import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Busca TUDO do banco de dados
    // Usamos Promise.all para buscar tabelas independentes em paralelo
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
      aiMessages
    ] = await Promise.all([
      prisma.user.findFirst(),
      prisma.settings.findFirst(),
      prisma.account.findMany({ include: { transactions: true } }), // Inclui transações dentro das contas
      prisma.project.findMany({ include: { tasks: true, events: true } }), // Inclui tarefas e eventos do projeto
      prisma.task.findMany({ where: { projectId: null } }), // Tarefas soltas (Inbox)
      prisma.jobApplication.findMany(),
      prisma.studySubject.findMany({ include: { sessions: true } }), // Inclui sessões de estudo
      prisma.flashcardDeck.findMany({ include: { cards: true } }), // Inclui flashcards
      prisma.workout.findMany(),
      prisma.healthMetric.findMany(),
      prisma.event.findMany({ where: { projectId: null } }), // Eventos soltos (sem projeto)
      prisma.managedSite.findMany({ include: { pages: true } }), // CMS
      prisma.accessItem.findMany(),
      prisma.aiMessage.findMany({ take: 100, orderBy: { createdAt: 'desc' } }) // Últimas 100 msgs de IA (opcional)
    ]);

    // 2. Monta o objeto de Backup
    const backupData = {
      meta: {
        system: "Life OS",
        version: "1.0",
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
      events, // Eventos que não estão dentro de projetos
      sites, // ManagedSite
      accessItems,
      aiMessages: aiMessages.reverse() // Reordena cronologicamente
    };

    // 3. Prepara a resposta como arquivo JSON para download
    const json = JSON.stringify(backupData, null, 2); // Identação bonita

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
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