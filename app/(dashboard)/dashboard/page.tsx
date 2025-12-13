import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    BookOpen, DollarSign, CheckSquare, Calendar as CalendarIcon, 
    ArrowUpRight, ArrowDownRight, TrendingUp, PlayCircle, 
    Gamepad2, Film, Music, Briefcase, Star, Tv 
} from "lucide-react";
import { FinanceChart } from "@/components/dashboard/finance-chart";
import { StudyChart } from "@/components/dashboard/study-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { WelcomeTour } from "@/components/dashboard/welcome-tour";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

// Interfaces
interface FinanceData { 
  name: string; 
  total: number; 
  type: 'INCOME' | 'EXPENSE';
  [key: string]: string | number; 
}

interface StudyData { 
  name: string; 
  value: number; 
  [key: string]: string | number;
}

export default async function DashboardPage() {
  const today = new Date();
  
  // --- CARREGAMENTO DE DADOS ---
  const [
    user,
    accounts,
    transactionsAll,
    recentTransactions,
    pendingTasksCount,
    completedTasksCount,
    studySessions,
    nextEvent,
    activeMedia,
    activeProjects,
    settings
  ] = await Promise.all([
    prisma.user.findFirst(),
    prisma.account.findMany(),
    prisma.transaction.findMany(),
    prisma.transaction.findMany({ take: 4, orderBy: { date: 'desc' }, include: { account: true } }),
    prisma.task.count({ where: { isDone: false } }),
    prisma.task.count({ where: { isDone: true } }),
    prisma.studySession.findMany({ include: { subject: true } }),
    prisma.event.findFirst({ where: { startTime: { gte: new Date() } }, orderBy: { startTime: 'asc' } }),
    prisma.mediaItem.findMany({ where: { category: 'PLAYING' }, take: 3 }), 
    prisma.project.findMany({ where: { status: 'IN_PROGRESS' }, take: 3 }),
    prisma.settings.findFirst()
  ]);

  // --- LÓGICA ---

  // 1. Saudação
  const hours = today.getHours();
  let greeting = "Bom dia";
  if (hours >= 12 && hours < 18) greeting = "Boa tarde";
  if (hours >= 18) greeting = "Boa noite";

  // 2. Financeiro
  const totalBalance = accounts.reduce((acc, item) => acc + Number(item.balance), 0);
  const income = transactionsAll.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0);
  const expense = transactionsAll.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);
  
  const financeData: FinanceData[] = [
    { name: 'Entradas', total: income, type: 'INCOME' },
    { name: 'Saídas', total: expense, type: 'EXPENSE' },
  ];

  // 3. Estudos
  const studyMap = new Map<string, number>();
  studySessions.forEach(s => {
    const current = studyMap.get(s.subject.title) || 0;
    studyMap.set(s.subject.title, current + s.durationMinutes);
  });
  const studyData: StudyData[] = Array.from(studyMap, ([name, value]) => ({ name, value }));

  // 4. Score
  const totalStudyMinutes = studySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const productivityScore = (completedTasksCount * 10) + Math.floor(totalStudyMinutes / 10);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2 md:p-4">
      
      {/* TOUR GUIADO (Se necessário) */}
      {!settings?.onboardingCompleted && <WelcomeTour />}

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                {greeting}, {user?.name?.split(" ")[0] || "Viajante"}! 
                <span className="text-2xl">👋</span>
            </h1>
            <div className="flex items-center gap-2 text-zinc-500 mt-1">
                <CalendarIcon className="h-4 w-4" />
                <span className="capitalize">
                    {today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
            </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="px-3 border-r border-zinc-200 dark:border-zinc-700">
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Score Diário</p>
                <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold text-xl">
                    <TrendingUp className="h-5 w-5" /> {productivityScore}
                </div>
            </div>
            <QuickActions />
        </div>
      </div>

      {/* --- KPI CARDS (LAYOUT CLÁSSICO) --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Financeiro */}
        <Card className="hover:border-green-500/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Saldo Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalBalance.toFixed(2)}</div>
            <div className="flex items-center gap-2 mt-1">
                <Badge variant={income > expense ? "default" : "destructive"} className="text-[10px] h-5 px-1.5">
                    {income > expense ? <ArrowUpRight className="h-3 w-3 mr-1"/> : <ArrowDownRight className="h-3 w-3 mr-1"/>}
                    {income > 0 ? ((income - expense) / income * 100).toFixed(0) : 0}% margem
                </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tarefas */}
        <Card className="hover:border-blue-500/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Tarefas Pendentes</CardTitle>
            <CheckSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasksCount}</div>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                <CheckSquare className="h-3 w-3 text-green-500" /> {completedTasksCount} concluídas hoje
            </p>
          </CardContent>
        </Card>

        {/* Estudos */}
        <Card className="hover:border-yellow-500/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Tempo de Foco</CardTitle>
            <BookOpen className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m</div>
            <p className="text-xs text-zinc-500 mt-1">
                em {studySessions.length} sessões
            </p>
          </CardContent>
        </Card>

        {/* Próximo Evento */}
        <Card className={`hover:border-indigo-500/50 transition-colors ${nextEvent ? "bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-zinc-950" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Agenda</CardTitle>
            <CalendarIcon className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            {nextEvent ? (
                <div className="space-y-1">
                    <div className="text-lg font-bold truncate leading-tight" title={nextEvent.title}>{nextEvent.title}</div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                            {new Date(nextEvent.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>{new Date(nextEvent.startTime).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                </div>
            ) : (
                <div className="text-sm text-zinc-500 italic">Agenda livre 🎉</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- GRID PRINCIPAL (Layout Clássico) --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        
        {/* ESQUERDA (4 colunas) */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* Gráfico Financeiro */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Movimentação Financeira</CardTitle>
                </CardHeader>
                <CardContent>
                    <FinanceChart data={financeData} />
                </CardContent>
            </Card>

            {/* Projetos Ativos */}
            <div className="grid gap-4 sm:grid-cols-2">
                <Card className="sm:col-span-2 bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-zinc-500" /> Projetos em Andamento
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {activeProjects.length === 0 ? (
                            <p className="text-xs text-zinc-500">Nenhum projeto ativo.</p>
                        ) : (
                            <div className="space-y-3">
                                {activeProjects.map(proj => (
                                    <div key={proj.id} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-950 rounded-lg border shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                            <span className="font-medium text-sm">{proj.title}</span>
                                        </div>
                                        <Link href={`/projects/${proj.id}`}>
                                            <Button variant="ghost" size="sm" className="h-7 text-xs">Ver</Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>

        {/* DIREITA (3 colunas) */}
        <div className="lg:col-span-3 space-y-6">
            
            {/* Mídia */}
            <Card className="border-indigo-100 dark:border-indigo-900 bg-gradient-to-b from-white to-indigo-50/30 dark:from-zinc-950 dark:to-indigo-950/10">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2"><PlayCircle className="h-4 w-4 text-purple-500" /> Consumindo Agora</span>
                        <Link href="/entertainment" className="text-xs text-indigo-500 hover:underline">Ver tudo</Link>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activeMedia.length === 0 ? (
                        <div className="text-center py-6 text-zinc-400 text-xs">Nada marcado como &apos;Jogando&apos; ou &apos;Assistindo&apos;.</div>
                    ) : (
                        <div className="space-y-3">
                            {activeMedia.map(item => (
                                <div key={item.id} className="flex gap-3 items-center group">
                                    <div className="h-12 w-8 bg-zinc-200 dark:bg-zinc-800 rounded overflow-hidden shrink-0 shadow-sm">
                                        {item.coverUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center"><Star className="h-3 w-3 text-zinc-300" /></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{item.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <span className="truncate">{item.subtitle}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Estudos */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Foco por Matéria</CardTitle>
                </CardHeader>
                <CardContent>
                    <StudyChart data={studyData} />
                </CardContent>
            </Card>

            {/* Transações */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[200px] pr-4">
                        <div className="space-y-3">
                            {recentTransactions.map(t => (
                                <div key={t.id} className="flex justify-between items-center text-sm border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0">
                                    <div className="truncate pr-2">
                                        <p className="font-medium truncate">{t.description}</p>
                                        <p className="text-[10px] text-zinc-500">{t.account.name}</p>
                                    </div>
                                    <span className={`font-mono font-bold whitespace-nowrap ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                                        {t.type === 'INCOME' ? '+' : '-'} {Number(t.amount).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

        </div>
      </div>
    </div>
  );
}