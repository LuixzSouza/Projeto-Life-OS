// src/lib/services/dashboard.service.ts
import { prisma } from "@/lib/prisma";
import { cache } from "react";
import { getNormalizedToday, getStartOfMonth } from "@/lib/utils/date.utils";
import { formatStudyData } from "@/lib/utils/dashboard.utils";
import type { StudyAggregationItem, StudySubjectItem } from "@/components/dashboard/types";

// Usamos cache do React para deduplicar chamadas caso o mesmo dado seja requisitado em múltiplos componentes
export const getUserSettings = cache(async (userId: string) => {
  const [user, settings] = await Promise.all([
    // Só a identidade que o dashboard usa: nunca puxa o hash `password` nem os base64
    // `avatarUrl`/`coverUrl` (que podem ser enormes) sem necessidade. Um consumidor
    // que precise do avatar deve adicioná-lo ao select explicitamente.
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.settings.findUnique({ where: { userId } })
  ]);
  return { user, settings };
});

export const getFinancialData = cache(async (userId: string) => {
  // Entradas/Saídas são do MÊS ATUAL (os KPIs do dashboard rotulam "(Mês)" e a
  // página de Finanças soma os mesmos buckets mensais — sem o filtro, mostrava o
  // acumulado de toda a vida e os números não batiam entre as telas).
  const monthStart = getStartOfMonth();
  const [accounts, incomeSum, expenseSum, recentTransactions] = await Promise.all([
    prisma.account.findMany({ where: { userId }, select: { balance: true } }),
    prisma.transaction.aggregate({ where: { type: 'INCOME', userId, deletedAt: null, date: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: 'EXPENSE', userId, deletedAt: null, date: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.transaction.findMany({ 
      where: { userId, deletedAt: null }, 
      take: 6,
      orderBy: { date: 'desc' },
      include: { account: { select: { name: true } } }
    })
  ]);

  return { accounts, incomeSum, expenseSum, recentTransactions };
});

export const getBusinessData = cache(async (userId: string) => {
  // Utilizando o helper centralizado (evita bugs de fuso horário)
  const today = getNormalizedToday();

  const [receivable, overdue, topInvoicesRaw] = await Promise.all([
    prisma.invoice.aggregate({
      where: { userId, status: 'PENDING', dueDate: { gte: today }, billing: { client: { deletedAt: null } } },
      _sum: { value: true },
    }),
    prisma.invoice.aggregate({
      where: {
        userId, 
        status: { in: ['PENDING', 'OVERDUE'] }, 
        billing: { client: { deletedAt: null } },
        OR: [{ dueDate: { lt: today } }, { status: 'OVERDUE' }],
      },
      _sum: { value: true },
    }),
    prisma.invoice.findMany({
      where: { userId, status: { in: ['PENDING', 'OVERDUE'] }, billing: { client: { deletedAt: null } } },
      orderBy: { dueDate: 'asc' }, 
      take: 5,
      select: {
        id: true, title: true, value: true, dueDate: true, status: true,
        billing: { select: { title: true, client: { select: { name: true } } } },
      },
    })
  ]);

  return { receivable, overdue, topInvoicesRaw };
});

export const getProductivityData = cache(async (userId: string) => {
  const [
    pendingTasks, 
    completedTasks, 
    studyAggRaw, 
    activeProjects, 
    subjects
  ] = await Promise.all([
    prisma.task.count({ where: { isDone: false, userId, deletedAt: null } }),
    prisma.task.count({ where: { isDone: true, userId, deletedAt: null } }),
    prisma.studySession.groupBy({ by: ['subjectId'], where: { userId }, _sum: { durationMinutes: true }, _count: true }),
    prisma.project.findMany({ where: { userId, deletedAt: null }, take: 4, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, description: true } }),
    prisma.studySubject.findMany({ where: { userId }, select: { id: true, title: true } })
  ]);

  // Aplica o mapeamento diretamente no servidor, liberando o cliente e repassando tipagens estritas
  const formattedStudy = formatStudyData(
    studyAggRaw as unknown as StudyAggregationItem[], 
    subjects as unknown as StudySubjectItem[]
  );
  
  // Ordenamos os dados já no servidor para o gráfico ficar visualmente equilibrado
  const orderedStudyData = formattedStudy.studyData.sort((a, b) => b.value - a.value);

  return { 
    pendingTasks, 
    completedTasks, 
    activeProjects, 
    orderedStudyData,
    totalStudyMinutes: formattedStudy.totalStudyMinutes,
    totalStudyHours: formattedStudy.totalStudyHours,
    // Como a tabela userProductivityLog não existe no schema, 
    // passamos null para o utilitário exibir "Sem histórico comparativo" de forma segura.
    previousPeriodScore: null 
  };
});

export const getPersonalData = cache(async (userId: string) => {
  const today = getNormalizedToday();
  // Para os eventos, precisamos do horário exato do momento (para não mostrar eventos das 08:00 se já são 14:00)
  const exactNow = new Date();

  const [nextEvent, activeMedia, friends, waterStats, mealStats, aiMessages, recentLinks, favoriteClothesCount] = await Promise.all([
    prisma.event.findFirst({ where: { startTime: { gte: exactNow }, userId, deletedAt: null }, orderBy: { startTime: 'asc' } }),
    prisma.mediaItem.findMany({ where: { status: 'IN_PROGRESS', userId, deletedAt: null }, take: 4, select: { id: true, title: true, type: true, coverUrl: true } }),
    prisma.friend.findMany({ where: { birthday: { not: null }, userId, deletedAt: null }, select: { id: true, name: true, birthday: true, imageUrl: true } }),
    prisma.healthMetric.aggregate({ where: { type: "WATER", date: { gte: today }, userId }, _sum: { value: true } }),
    prisma.meal.aggregate({ where: { date: { gte: today }, userId }, _sum: { calories: true } }),
    prisma.aiMessage.count({ where: { createdAt: { gte: today }, userId } }),
    prisma.savedLink.findMany({ where: { userId, deletedAt: null }, take: 4, orderBy: { createdAt: 'desc' }, select: { id: true, url: true, title: true } }),
    prisma.wardrobeItem.count({ where: { userId, deletedAt: null, isFavorite: true } })
  ]);

  return { nextEvent, activeMedia, friends, waterStats, mealStats, aiMessages, recentLinks, favoriteClothesCount };
});