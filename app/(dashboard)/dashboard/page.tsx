import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { formatCurrency as formatCurrencyUtil } from "@/lib/utils";

// Gráficos client-side
import { FinanceChart, StudyChart } from "@/components/dashboard/client-charts";
import { WelcomeTour } from "@/components/dashboard/welcome-tour";

// Seções do dashboard
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ProjectsCard } from "@/components/dashboard/projects-card";
import { InvoicesCard } from "@/components/dashboard/invoices-card";
import { BirthdaysCard } from "@/components/dashboard/birthdays-card";
import { NowPlayingCard } from "@/components/dashboard/now-playing-card";
import { TransactionsCard } from "@/components/dashboard/transactions-card";
import { SystemModules } from "@/components/dashboard/system-modules";
import type { DashboardInvoice, DashboardBirthday } from "@/components/dashboard/types";

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const userId = await getCurrentUserId();

  // --- CARREGAMENTO DE DADOS PARALELO ---
  const [
    user,
    accounts,
    incomeSum,
    expenseSum,
    recentTransactions,
    pendingTasksCount,
    completedTasksCount,
    studyAgg,
    nextEvent,
    activeMedia,
    activeProjects,
    settings,
    businessReceivable,
    businessOverdue,
    topInvoicesRaw,
    friends,
    waterStats,
    mealStats,
    aiMessagesCount,
    recentLinks,
    favoriteClothes,
    subjectsForChart
  ] = await Promise.all([
    userId ? prisma.user.findUnique({ where: { id: userId } }) : null,
    prisma.account.findMany({ where: { userId }, select: { balance: true } }),
    prisma.transaction.aggregate({ where: { type: 'INCOME', userId, deletedAt: null }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: 'EXPENSE', userId, deletedAt: null }, _sum: { amount: true } }),
    prisma.transaction.findMany({ where: { userId, deletedAt: null }, take: 5, orderBy: { date: 'desc' }, include: { account: true } }),
    prisma.task.count({ where: { isDone: false, userId, deletedAt: null } }),
    prisma.task.count({ where: { isDone: true, userId, deletedAt: null } }),
    prisma.studySession.groupBy({ by: ['subjectId'], where: { userId }, _sum: { durationMinutes: true }, _count: true }),
    prisma.event.findFirst({ where: { startTime: { gte: new Date() }, userId, deletedAt: null }, orderBy: { startTime: 'asc' } }),
    prisma.mediaItem.findMany({ where: { status: 'IN_PROGRESS', userId, deletedAt: null }, take: 3 }),
    prisma.project.findMany({ where: { userId, deletedAt: null }, take: 3, orderBy: { updatedAt: 'desc' } }),
    userId ? prisma.settings.findUnique({ where: { userId } }) : null,
    // Negócios: recebíveis/atrasados agregados no banco (usa índice [userId, status, dueDate])
    // em vez de carregar todos os clientes → billings → faturas na memória.
    // Recebível = PENDING e a vencer (dueDate >= hoje).
    prisma.invoice.aggregate({
      where: { userId, status: 'PENDING', dueDate: { gte: today }, billing: { client: { deletedAt: null } } },
      _sum: { value: true },
    }),
    // Atrasado = OVERDUE, ou PENDING já vencido (dueDate < hoje).
    prisma.invoice.aggregate({
      where: {
        userId,
        status: { in: ['PENDING', 'OVERDUE'] },
        billing: { client: { deletedAt: null } },
        OR: [{ dueDate: { lt: today } }, { status: 'OVERDUE' }],
      },
      _sum: { value: true },
    }),
    // As 5 faturas em aberto mais próximas do vencimento.
    prisma.invoice.findMany({
      where: { userId, status: { in: ['PENDING', 'OVERDUE'] }, billing: { client: { deletedAt: null } } },
      orderBy: { dueDate: 'asc' },
      take: 5,
      select: {
        id: true, title: true, value: true, dueDate: true, status: true,
        billing: { select: { title: true, client: { select: { name: true } } } },
      },
    }),
    prisma.friend.findMany({
      where: { birthday: { not: null }, userId: userId ?? "", deletedAt: null },
      select: { id: true, name: true, birthday: true, imageUrl: true, proximity: true }
    }),
    prisma.healthMetric.aggregate({ where: { type: "WATER", date: { gte: today }, userId }, _sum: { value: true } }),
    prisma.meal.aggregate({ where: { date: { gte: today }, userId }, _sum: { calories: true } }),
    prisma.aiMessage.count({ where: { createdAt: { gte: today }, userId } }),
    prisma.savedLink.findMany({ where: { userId, deletedAt: null }, take: 4, orderBy: { createdAt: 'desc' } }),
    prisma.wardrobeItem.findMany({ where: { isFavorite: true, userId: userId ?? "", deletedAt: null }, take: 3 }),
    prisma.studySubject.findMany({ where: { userId }, select: { id: true, title: true } })
  ]);

  // --- LÓGICA DE APRESENTAÇÃO ---

  // 1. Saudação
  const hours = new Date().getHours();
  const greeting = hours < 12 ? "Bom dia" : hours < 18 ? "Boa tarde" : "Boa noite";

  // 2. Financeiro Pessoal
  const totalBalance = accounts.reduce((acc, item) => acc + Number(item.balance), 0);
  const income = Number(incomeSum._sum.amount || 0);
  const expense = Number(expenseSum._sum.amount || 0);
  const margin = income > 0 ? ((income - expense) / income * 100) : 0;

  const financeData = [
    { name: 'Entradas', total: income, type: 'INCOME' as const },
    { name: 'Saídas', total: expense, type: 'EXPENSE' as const },
  ];

  // 3. Estudos — somatório por matéria agregado no banco (groupBy), em vez de
  // carregar todas as sessões na memória (não escala com anos de histórico).
  const subjectTitleById = new Map(subjectsForChart.map(s => [s.id, s.title]));
  const studyData = studyAgg
    .map(g => ({ name: subjectTitleById.get(g.subjectId) ?? "Sem matéria", value: g._sum.durationMinutes ?? 0 }))
    .filter(d => d.value > 0);
  const totalStudyMinutes = studyAgg.reduce((acc, g) => acc + (g._sum.durationMinutes ?? 0), 0);
  const totalStudySessions = studyAgg.reduce((acc, g) => acc + g._count, 0);

  // 4. Score de Produtividade
  const rawScore = (completedTasksCount * 10) + Math.floor(totalStudyMinutes / 3);
  const productivityScore = Math.min(rawScore, 100);

  // 5. Negócios (Freelance/Empresa) — totais agregados no banco
  const businessStats = {
    totalReceivable: Number(businessReceivable._sum.value ?? 0),
    totalOverdue: Number(businessOverdue._sum.value ?? 0),
  };

  const topUpcomingInvoices: DashboardInvoice[] = topInvoicesRaw.map(inv => ({
    id: inv.id,
    title: inv.title,
    value: Number(inv.value),
    dueDate: inv.dueDate,
    status: inv.status,
    clientName: inv.billing.client?.name ?? '—',
    billingTitle: inv.billing.title,
  }));

  // 6. Aniversários Próximos
  const upcomingBirthdays: DashboardBirthday[] = friends.map(f => {
    const bday = new Date(f.birthday!);
    const nextBday = new Date(today.getFullYear(), bday.getUTCMonth(), bday.getUTCDate());

    if (nextBday < today && nextBday.getTime() !== today.getTime()) {
      nextBday.setFullYear(today.getFullYear() + 1);
    }

    const diffTime = nextBday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { ...f, daysUntil: diffDays, ageTurning: today.getFullYear() - bday.getUTCFullYear() + (nextBday.getFullYear() > today.getFullYear() ? 1 : 0) };
  })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 4);

  // 7. Dados de Saúde
  const waterToday = waterStats._sum.value || 0;
  const calsToday = mealStats._sum.calories || 0;

  // Normaliza transações (Decimal -> number) para o componente de apresentação
  const transactionsData = recentTransactions.map(t => ({
    id: t.id,
    type: t.type,
    description: t.description,
    amount: Number(t.amount),
    date: t.date,
    account: { name: t.account.name },
  }));

  // Moeda escolhida pelo usuário (Configurações > Regional).
  // Reaproveita `settings` já carregado acima — evita uma 2ª query ao banco.
  const currency = settings?.currency || "BRL";
  const formatCurrency = (val: number) => formatCurrencyUtil(val, { currency });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-6 py-8 sm:px-8 animate-in fade-in duration-500">

      {!settings?.onboardingCompleted && <WelcomeTour />}

      <DashboardHeader
        greeting={greeting}
        userName={user?.name?.split(" ")[0] || "Usuário"}
        productivityScore={productivityScore}
      />

      <KpiCards
        totalBalance={totalBalance}
        margin={margin}
        businessStats={businessStats}
        pendingTasksCount={pendingTasksCount}
        completedTasksCount={completedTasksCount}
        totalStudyMinutes={totalStudyMinutes}
        studySessionsCount={totalStudySessions}
        nextEvent={nextEvent}
        formatCurrency={formatCurrency}
        currency={currency}
      />

      {/* --- GRID PRINCIPAL --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">

        {/* ESQUERDA (4 colunas) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Gráfico Financeiro */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm">Fluxo de Caixa (Pessoal)</CardTitle>
              <CardDescription className="text-xs">Comparativo de entradas e saídas.</CardDescription>
            </CardHeader>
            <CardContent className="pl-0 pb-2">
              <FinanceChart data={financeData} />
            </CardContent>
          </Card>

          <ProjectsCard projects={activeProjects} />
          <InvoicesCard invoices={topUpcomingInvoices} today={today} formatCurrency={formatCurrency} />

        </div>

        {/* DIREITA (3 colunas) */}
        <div className="lg:col-span-3 space-y-6">

          <BirthdaysCard birthdays={upcomingBirthdays} />
          <NowPlayingCard media={activeMedia} />

          {/* Gráfico de Estudos */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" /> Foco por Matéria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StudyChart data={studyData} />
            </CardContent>
          </Card>

          <TransactionsCard transactions={transactionsData} />

        </div>
      </div>

      <SystemModules
        calsToday={calsToday}
        waterToday={waterToday}
        aiMessagesCount={aiMessagesCount}
        favoriteClothesCount={favoriteClothes.length}
        recentLinks={recentLinks}
      />

    </div>
  );
}
