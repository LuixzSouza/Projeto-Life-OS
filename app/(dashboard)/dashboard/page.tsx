import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    BookOpen, DollarSign, CheckSquare, Calendar as CalendarIcon, 
    ArrowUpRight, ArrowDownRight, TrendingUp, PlayCircle, 
    Briefcase, Star, Clock, Target
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress"; // Certifique-se de ter este componente do shadcn

// Componentes Filhos (Vou pedir eles em seguida)
import { FinanceChart } from "@/components/dashboard/finance-chart";
import { StudyChart } from "@/components/dashboard/study-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { WelcomeTour } from "@/components/dashboard/welcome-tour";

export default async function DashboardPage() {
  const today = new Date();
  
  // --- CARREGAMENTO DE DADOS OTIMIZADO ---
  // Usamos 'aggregate' para somar no banco de dados, não no servidor Node.js
  const [
    user,
    accounts,
    incomeSum,
    expenseSum,
    recentTransactions,
    pendingTasksCount,
    completedTasksCount,
    studyStats,
    nextEvent,
    activeMedia,
    activeProjects,
    settings
  ] = await Promise.all([
    prisma.user.findFirst(),
    prisma.account.findMany({ select: { balance: true } }), // Só traz o saldo
    prisma.transaction.aggregate({ where: { type: 'INCOME' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: 'EXPENSE' }, _sum: { amount: true } }),
    prisma.transaction.findMany({ take: 5, orderBy: { date: 'desc' }, include: { account: true } }),
    prisma.task.count({ where: { isDone: false } }),
    prisma.task.count({ where: { isDone: true } }),
    prisma.studySession.findMany({ include: { subject: true } }), // Mantido para o gráfico
    prisma.event.findFirst({ where: { startTime: { gte: new Date() } }, orderBy: { startTime: 'asc' } }),
    prisma.mediaItem.findMany({ where: { category: 'PLAYING' }, take: 3 }), 
    prisma.project.findMany({ where: { status: 'IN_PROGRESS' }, take: 3 }),
    prisma.settings.findFirst()
  ]);

  // --- LÓGICA ---

  // 1. Saudação
  const hours = today.getHours();
  const greeting = hours < 12 ? "Bom dia" : hours < 18 ? "Boa tarde" : "Boa noite";

  // 2. Financeiro
  const totalBalance = accounts.reduce((acc, item) => acc + Number(item.balance), 0);
  const income = Number(incomeSum._sum.amount || 0);
  const expense = Number(expenseSum._sum.amount || 0);
  const margin = income > 0 ? ((income - expense) / income * 100) : 0;
  
  const financeData = [
    { name: 'Entradas', total: income, type: 'INCOME' as const }, 
    { name: 'Saídas', total: expense, type: 'EXPENSE' as const },
  ];

  // 3. Estudos (Agrupamento)
  const studyMap = new Map<string, number>();
  studyStats.forEach(s => {
    const current = studyMap.get(s.subject.title) || 0;
    studyMap.set(s.subject.title, current + s.durationMinutes);
  });
  const studyData = Array.from(studyMap, ([name, value]) => ({ name, value }));
  const totalStudyMinutes = studyStats.reduce((acc, s) => acc + s.durationMinutes, 0);

  // 4. Score de Produtividade (0 a 100)
  // Lógica arbitrária: 1 tarefa = 10 pts, 1h estudo = 20 pts. Max 100.
  const rawScore = (completedTasksCount * 10) + Math.floor(totalStudyMinutes / 3);
  const productivityScore = Math.min(rawScore, 100);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      
      {!settings?.onboardingCompleted && <WelcomeTour />}

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                {greeting}, <span className="text-primary">{user?.name?.split(" ")[0] || "Usuário"}</span>
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <CalendarIcon className="h-4 w-4" />
                <span className="capitalize">
                    {today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
            </p>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="hidden md:block text-right mr-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Score Diário</p>
                <div className="flex items-center justify-end gap-2 text-primary font-bold text-2xl">
                    {productivityScore} <TrendingUp className="h-5 w-5" />
                </div>
            </div>
            <QuickActions />
        </div>
      </div>

      {/* --- KPI CARDS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Financeiro */}
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-[10px] h-5 px-1.5 border-0 ${margin >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                    {margin >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1"/> : <ArrowDownRight className="h-3 w-3 mr-1"/>}
                    {margin.toFixed(0)}% margem
                </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tarefas */}
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tarefas</CardTitle>
            <CheckSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
                <div className="text-2xl font-bold">{pendingTasksCount} <span className="text-sm font-normal text-muted-foreground">pendentes</span></div>
                <div className="text-xs text-muted-foreground mb-1">{completedTasksCount} concluídas</div>
            </div>
            <Progress value={(completedTasksCount / (completedTasksCount + pendingTasksCount || 1)) * 100} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        {/* Estudos */}
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo de Foco</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {Math.floor(totalStudyMinutes / 60)}<span className="text-sm font-normal text-muted-foreground">h</span> {totalStudyMinutes % 60}<span className="text-sm font-normal text-muted-foreground">m</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
                {studyStats.length} sessões hoje
            </p>
          </CardContent>
        </Card>

        {/* Próximo Evento */}
        <Card className="bg-primary/5 border-primary/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Próximo Evento</CardTitle>
            <CalendarIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {nextEvent ? (
                <div className="space-y-1">
                    <div className="text-lg font-bold truncate leading-tight">{nextEvent.title}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="bg-background/80 px-1.5 py-0.5 rounded font-mono border border-border">
                            {new Date(nextEvent.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>{new Date(nextEvent.startTime).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col justify-center h-full">
                    <span className="text-sm text-muted-foreground italic">Agenda livre 🎉</span>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- GRID PRINCIPAL --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        
        {/* ESQUERDA (4 colunas) */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* Gráfico Financeiro */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Fluxo de Caixa</CardTitle>
                    <CardDescription>Comparativo de entradas e saídas.</CardDescription>
                </CardHeader>
                <CardContent className="pl-0">
                    {/* AQUI ENTRA O COMPONENTE DE GRÁFICO */}
                    <FinanceChart data={financeData} />
                </CardContent>
            </Card>

            {/* Projetos Ativos */}
            <Card className="shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary" /> Projetos em Andamento
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activeProjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                            <Target className="h-8 w-8 mb-2 opacity-50" />
                            Nenhum projeto ativo.
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {activeProjects.map(proj => (
                                <Link key={proj.id} href={`/projects/${proj.id}`}>
                                    <div className="group flex flex-col p-3 rounded-xl border bg-card hover:bg-muted/50 transition-all cursor-pointer">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <Briefcase className="h-4 w-4" />
                                            </div>
                                            {/* Badge mockada, se tiver status no banco use-o */}
                                            <Badge variant="secondary" className="text-[10px]">Em andamento</Badge>
                                        </div>
                                        <span className="font-semibold text-sm truncate">{proj.title}</span>
                                        <span className="text-xs text-muted-foreground line-clamp-1">{proj.description || "Sem descrição"}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* DIREITA (3 colunas) */}
        <div className="lg:col-span-3 space-y-6">
            
            {/* Mídia / Entretenimento */}
            <Card className="bg-gradient-to-b from-card to-muted/20 border-border shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2"><PlayCircle className="h-4 w-4 text-primary" /> Consumindo Agora</span>
                        <Link href="/entertainment" className="text-xs text-primary hover:underline">Ver tudo</Link>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activeMedia.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-xs">
                            Nada marcado como &apos;Jogando&apos; ou &apos;Assistindo&apos;.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeMedia.map(item => (
                                <div key={item.id} className="flex gap-3 items-center group">
                                    <div className="h-12 w-12 bg-muted rounded-lg overflow-hidden shrink-0 shadow-sm border border-border">
                                        {item.coverUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center"><Star className="h-4 w-4 text-muted-foreground/50" /></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">{item.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant="outline" className="h-4 px-1 text-[9px] uppercase border-primary/20 text-primary">{item.type}</Badge>
                                            <span className="truncate">{item.subtitle}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Gráfico de Estudos */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-sm">Foco por Matéria</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* AQUI ENTRA O GRÁFICO DE ESTUDOS */}
                    <StudyChart data={studyData} />
                </CardContent>
            </Card>

            {/* Transações Recentes */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" /> Últimas Transações
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[220px] pr-4">
                        <div className="space-y-4">
                            {recentTransactions.map(t => (
                                <div key={t.id} className="flex justify-between items-center text-sm group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {t.type === 'INCOME' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                        </div>
                                        <div className="truncate">
                                            <p className="font-medium truncate group-hover:text-primary transition-colors">{t.description}</p>
                                            <p className="text-[10px] text-muted-foreground">{t.account.name} • {new Date(t.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className={`font-mono font-bold whitespace-nowrap ${t.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                        {t.type === 'INCOME' ? '+' : '-'} {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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