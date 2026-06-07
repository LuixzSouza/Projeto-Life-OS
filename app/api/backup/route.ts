import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    // Seleção de módulos (Exportação Avançada). Sem o parâmetro = exporta tudo.
    const modulesParam = new URL(request.url).searchParams.get("modules");
    const selected = modulesParam
      ? new Set(modulesParam.split(",").map((s) => s.trim()).filter(Boolean))
      : null;
    const include = (id: string) => !selected || selected.has(id);

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

    // 2. Monta o objeto de Backup com estrutura compatível com a importação.
    // Inclui só os módulos selecionados (mapa idêntico ao da Exportação Avançada).
    // `meta` e `user` sempre vão (necessários para a importação reconstruir).
    const backupData = {
      meta: {
        system: "Life OS",
        version: "2.0",
        date: new Date().toISOString(),
        modules: selected ? Array.from(selected) : "all",
      },
      user,
      ...(include("tasks") && { projects, tasksWithoutProject, jobApplications, events }),
      ...(include("finance") && { accounts }),
      ...(include("notes") && { studySubjects, flashcardDecks }),
      ...(include("health") && { workouts, healthMetrics, challenges }),
      ...(include("system") && {
        settings,
        sites,
        accessItems,
        savedLinks,
        aiMessages: aiMessages.reverse(), // cronológico (antigo -> novo)
        portfolio,
      }),
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