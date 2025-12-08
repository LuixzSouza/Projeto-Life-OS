import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Coleta TODOS os dados do sistema
    const backupData = {
      meta: {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        system: "Life OS"
      },
      user: await prisma.user.findFirst(),
      settings: await prisma.settings.findFirst(),
      
      // Módulo Financeiro
      accounts: await prisma.account.findMany({ include: { transactions: true } }),
      
      // Módulo Estudos
      studySubjects: await prisma.studySubject.findMany({ include: { sessions: true } }),
      
      // Módulo Projetos
      projects: await prisma.project.findMany({ include: { tasks: true } }),
      tasksWithoutProject: await prisma.task.findMany({ where: { projectId: null } }),
      
      // Módulo Saúde
      workouts: await prisma.workout.findMany(),
      healthMetrics: await prisma.healthMetric.findMany(),
      
      // Módulo Agenda
      events: await prisma.event.findMany(),
      
      // Módulo CMS
      sites: await prisma.managedSite.findMany({ include: { pages: true } }),
      
      // Módulo IA
      chats: await prisma.aiChat.findMany({ include: { messages: true } }),
    };

    // 2. Cria o nome do arquivo com a data de hoje (ex: life-os-backup-2025-10-10.json)
    const date = new Date().toISOString().split("T")[0];
    const filename = `life-os-backup-${date}.json`;

    // 3. Retorna como Download
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("Erro no backup:", error);
    return NextResponse.json({ error: "Falha ao gerar backup" }, { status: 500 });
  }
}