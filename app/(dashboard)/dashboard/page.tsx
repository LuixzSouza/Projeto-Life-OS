import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, BookOpen, DollarSign, CheckSquare, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { FinanceChart } from "@/components/dashboard/finance-chart";
import { StudyChart } from "@/components/dashboard/study-chart";
import Link from "next/link";

export default async function DashboardPage() {
  const today = new Date();
  
  // 1. DADOS DE USUÁRIO (Para saudação)
  const user = await prisma.user.findFirst();
  const hours = today.getHours();
  let greeting = "Bom dia";
  if (hours >= 12 && hours < 18) greeting = "Boa tarde";
  if (hours >= 18) greeting = "Boa noite";

  // 2. DADOS FINANCEIROS
  const accounts = await prisma.account.findMany();
  const totalBalance = accounts.reduce((acc, item) => acc + Number(item.balance), 0);
  
  // Últimas 5 transações
  const recentTransactions = await prisma.transaction.findMany({
    take: 5,
    orderBy: { date: 'desc' },
    include: { account: true }
  });

  // Dados para o Gráfico (Agrupados por tipo: Receita vs Despesa)
  // Nota: Isso é uma simplificação. Num app real faríamos group by no banco.
  const transactionsAll = await prisma.transaction.findMany();
  const income = transactionsAll.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0);
  const expense = transactionsAll.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);
  const financeData = [
    { name: 'Receitas', total: income },
    { name: 'Despesas', total: expense },
  ];

  // 3. DADOS DE TAREFAS
  const pendingTasksCount = await prisma.task.count({ where: { isDone: false } });
  const completedTasksCount = await prisma.task.count({ where: { isDone: true } });
  
  // 4. DADOS DE ESTUDOS
  const studySessions = await prisma.studySession.findMany({ include: { subject: true } });
  // Agrupar tempo por matéria para o gráfico
  const studyMap = new Map();
  studySessions.forEach(s => {
    const current = studyMap.get(s.subject.title) || 0;
    studyMap.set(s.subject.title, current + s.durationMinutes);
  });
  const studyData = Array.from(studyMap, ([name, value]) => ({ name, value }));

  // 5. PRÓXIMO EVENTO
  const nextEvent = await prisma.event.findFirst({
    where: { startTime: { gte: new Date() } },
    orderBy: { startTime: 'asc' }
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER DE SAUDAÇÃO */}
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">{greeting}, {user?.name?.split(" ")[0] || "Luiz"}!</h1>
            <p className="text-zinc-500">Aqui está o resumo do seu Life OS hoje.</p>
        </div>
        <div className="text-right hidden md:block">
            <p className="text-2xl font-bold text-zinc-700 dark:text-zinc-300">
                {today.toLocaleDateString('pt-BR', { weekday: 'long' })}
            </p>
            <p className="text-sm text-zinc-500">
                {today.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
        </div>
      </div>

      {/* WIDGETS PRINCIPAIS (KPIs) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Financeiro */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalBalance.toFixed(2)}</div>
            <p className="text-xs text-zinc-500 flex items-center mt-1">
                {income > expense ? (
                    <span className="text-green-600 flex items-center"><ArrowUpRight className="h-3 w-3 mr-1"/> Superávit</span>
                ) : (
                    <span className="text-red-600 flex items-center"><ArrowDownRight className="h-3 w-3 mr-1"/> Déficit</span>
                )}
            </p>
          </CardContent>
        </Card>

        {/* Tarefas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
            <CheckSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasksCount}</div>
            <p className="text-xs text-zinc-500 mt-1">
                {completedTasksCount} concluídas hoje
            </p>
          </CardContent>
        </Card>

        {/* Estudos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões de Estudo</CardTitle>
            <BookOpen className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studySessions.length}</div>
            <p className="text-xs text-zinc-500 mt-1">Total registrado</p>
          </CardContent>
        </Card>

        {/* Próximo Evento */}
        <Card className={nextEvent ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Evento</CardTitle>
            <CalendarIcon className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            {nextEvent ? (
                <>
                    <div className="text-lg font-bold truncate" title={nextEvent.title}>{nextEvent.title}</div>
                    <p className="text-xs text-zinc-500">
                        {new Date(nextEvent.startTime).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                </>
            ) : (
                <div className="text-sm text-zinc-500">Agenda livre 🎉</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ÁREA DE CONTEÚDO (Gráficos e Listas) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Gráfico Financeiro (Maior) */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Fluxo de Caixa</CardTitle>
            <CardDescription>Receitas vs Despesas (Histórico Geral)</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <FinanceChart data={financeData} />
          </CardContent>
        </Card>

        {/* Gráfico de Estudos (Menor) */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Distribuição de Estudos</CardTitle>
            <CardDescription>Onde você tem focado mais tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <StudyChart data={studyData} />
          </CardContent>
        </Card>
      </div>

      {/* ÚLTIMAS ATIVIDADES */}
      <div className="grid gap-4 md:grid-cols-2">
          <Card>
              <CardHeader><CardTitle>Últimas Transações</CardTitle></CardHeader>
              <CardContent>
                  <div className="space-y-4">
                      {recentTransactions.length === 0 ? (
                          <p className="text-sm text-zinc-500">Nenhuma movimentação.</p>
                      ) : recentTransactions.map(t => (
                          <div key={t.id} className="flex justify-between items-center border-b last:border-0 pb-2 last:pb-0">
                              <div>
                                  <p className="font-medium text-sm">{t.description}</p>
                                  <p className="text-xs text-zinc-500">{t.account.name}</p>
                              </div>
                              <span className={`font-bold text-sm ${t.type === 'INCOME' ? 'text-green-600' : 'text-zinc-600'}`}>
                                  {t.type === 'INCOME' ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                              </span>
                          </div>
                      ))}
                  </div>
                  <div className="mt-4">
                      <Link href="/finance">
                        <span className="text-xs text-blue-500 hover:underline cursor-pointer">Ver financeiro completo &rarr;</span>
                      </Link>
                  </div>
              </CardContent>
          </Card>

          {/* Atalhos Rápidos */}
          <Card>
              <CardHeader><CardTitle>Acesso Rápido</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                  <Link href="/projects?id=inbox">
                    <div className="p-4 rounded-lg border hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer text-center">
                        <CheckSquare className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                        <span className="text-sm font-medium">Inbox Tarefas</span>
                    </div>
                  </Link>
                  <Link href="/studies">
                    <div className="p-4 rounded-lg border hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer text-center">
                        <BookOpen className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                        <span className="text-sm font-medium">Iniciar Estudo</span>
                    </div>
                  </Link>
                  <Link href="/health">
                    <div className="p-4 rounded-lg border hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer text-center">
                        <Activity className="h-6 w-6 mx-auto mb-2 text-red-500" />
                        <span className="text-sm font-medium">Registrar Treino</span>
                    </div>
                  </Link>
                  <Link href="/ai">
                    <div className="p-4 rounded-lg border hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer text-center">
                        <div className="h-6 w-6 mx-auto mb-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                        <span className="text-sm font-medium">Falar com IA</span>
                    </div>
                  </Link>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}