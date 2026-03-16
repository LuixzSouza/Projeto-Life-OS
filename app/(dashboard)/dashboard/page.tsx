import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    BookOpen, DollarSign, CheckSquare, Calendar as CalendarIcon, 
    ArrowUpRight, ArrowDownRight, TrendingUp, PlayCircle, 
    Briefcase, Star, Clock, Target, Landmark, AlertCircle, CalendarDays,
    Cake, Heart, Flame, Droplets, Bot, Shirt, Link as LinkIcon, Server
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Importamos do nosso novo arquivo 'client-charts'
import { FinanceChart, StudyChart } from "@/components/dashboard/client-charts";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { WelcomeTour } from "@/components/dashboard/welcome-tour";

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  // --- CARREGAMENTO DE DADOS PARALELO ---
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
    settings,
    rawBusiness,
    friends,
    // 🟢 NOVOS: Dados para a seção inferior
    waterStats,
    mealStats,
    aiMessagesCount,
    recentLinks,
    favoriteClothes
  ] = await Promise.all([
    prisma.user.findFirst(),
    prisma.account.findMany({ select: { balance: true } }),
    prisma.transaction.aggregate({ where: { type: 'INCOME' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: 'EXPENSE' }, _sum: { amount: true } }),
    prisma.transaction.findMany({ take: 5, orderBy: { date: 'desc' }, include: { account: true } }),
    prisma.task.count({ where: { isDone: false } }),
    prisma.task.count({ where: { isDone: true } }),
    prisma.studySession.findMany({ include: { subject: true } }),
    prisma.event.findFirst({ where: { startTime: { gte: new Date() } }, orderBy: { startTime: 'asc' } }),
    prisma.mediaItem.findMany({ where: { status: 'IN_PROGRESS' }, take: 3 }), 
    prisma.project.findMany({take: 3, orderBy: {updatedAt: 'desc'}}),
    prisma.settings.findFirst(),
    prisma.client.findMany({ 
        include: { billings: { include: { invoices: true } } } 
    }),
    prisma.friend.findMany({ 
        where: { birthday: { not: null } },
        select: { id: true, name: true, birthday: true, imageUrl: true, proximity: true }
    }),
    // Fetchs Novos
    prisma.healthMetric.aggregate({ where: { type: "WATER", date: { gte: today } }, _sum: { value: true } }),
    prisma.meal.aggregate({ where: { date: { gte: today } }, _sum: { calories: true } }),
    prisma.aiMessage.count({ where: { createdAt: { gte: today } } }),
    prisma.savedLink.findMany({ take: 4, orderBy: { createdAt: 'desc' } }),
    prisma.wardrobeItem.findMany({ where: { isFavorite: true }, take: 3 })
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

  // 3. Estudos
  const studyMap = new Map<string, number>();
  studyStats.forEach(s => {
    const current = studyMap.get(s.subject.title) || 0;
    studyMap.set(s.subject.title, current + s.durationMinutes);
  });
  const studyData = Array.from(studyMap, ([name, value]) => ({ name, value }));
  const totalStudyMinutes = studyStats.reduce((acc, s) => acc + s.durationMinutes, 0);

  // 4. Score de Produtividade
  const rawScore = (completedTasksCount * 10) + Math.floor(totalStudyMinutes / 3);
  const productivityScore = Math.min(rawScore, 100);

  // 5. Negócios (Freelance/Empresa)
  const upcomingInvoices: Array<{ id: string, title: string, value: number, dueDate: Date, status: string, clientName: string, billingTitle: string }> = [];
  const businessStats = rawBusiness.reduce((acc, client) => {
    client.billings.forEach(billing => {
        billing.invoices.forEach(inv => {
            const val = Number(inv.value);
            if (inv.status === 'PENDING' || inv.status === 'OVERDUE') {
                const dueDate = new Date(inv.dueDate);
                const isLate = dueDate < today || inv.status === 'OVERDUE';
                if (isLate) acc.totalOverdue += val;
                else acc.totalReceivable += val;
                upcomingInvoices.push({ ...inv, value: val, dueDate, clientName: client.name, billingTitle: billing.title });
            }
        });
    });
    return acc;
  }, { totalReceivable: 0, totalOverdue: 0 });

  upcomingInvoices.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const topUpcomingInvoices = upcomingInvoices.slice(0, 5);

  // 6. Aniversários Próximos
  const upcomingBirthdays = friends.map(f => {
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

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      
      {!settings?.onboardingCompleted && <WelcomeTour />}

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
        <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                {greeting}, <span className="text-primary">{user?.name?.split(" ")[0] || "Usuário"}</span>
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1.5 text-sm">
                <CalendarIcon className="h-4 w-4" />
                <span className="capitalize">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
            </p>
        </div>
        
        <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Score Diário</p>
                <div className="flex items-center gap-2 text-primary font-bold text-2xl leading-none">
                    {productivityScore} <TrendingUp className="h-5 w-5 opacity-80" />
                </div>
            </div>
            <div className="h-10 w-px bg-border/50 hidden md:block" />
            <QuickActions />
        </div>
      </div>

      {/* --- KPI CARDS --- */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <Card className="bg-card shadow-sm border-border/50 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Saldo Pessoal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground/50" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div className="mt-1">
                <Badge variant="secondary" className={cn("text-[10px] font-mono", margin >= 0 ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10")}>
                    {margin >= 0 ? '+' : ''}{margin.toFixed(0)}% margem
                </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("shadow-sm transition-all", businessStats.totalOverdue > 0 ? "bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30" : "bg-card border-border/50")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={cn("text-xs font-medium", businessStats.totalOverdue > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                Negócios: A Receber
            </CardTitle>
            <Landmark className={cn("h-4 w-4", businessStats.totalOverdue > 0 ? "text-red-500/70" : "text-muted-foreground/50")} />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-foreground">
                {formatCurrency(businessStats.totalReceivable + businessStats.totalOverdue)}
            </div>
            {businessStats.totalOverdue > 0 ? (
                <p className="text-[10px] text-red-500 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3"/> {formatCurrency(businessStats.totalOverdue)} em atraso
                </p>
            ) : (
                <p className="text-[10px] text-muted-foreground mt-1">Tudo em dia 🎉</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border/50 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Tarefas</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground/50" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
                <div className="text-xl lg:text-2xl font-bold">{pendingTasksCount} <span className="text-sm font-normal text-muted-foreground">pendentes</span></div>
                <div className="text-[10px] text-muted-foreground mb-1">{completedTasksCount} feitas</div>
            </div>
            <Progress value={(completedTasksCount / (completedTasksCount + pendingTasksCount || 1)) * 100} className="h-1 mt-2.5 bg-muted/50" />
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border/50 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Tempo de Foco</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground/50" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">
                {Math.floor(totalStudyMinutes / 60)}<span className="text-sm font-normal text-muted-foreground">h</span> {totalStudyMinutes % 60}<span className="text-sm font-normal text-muted-foreground">m</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wide">
                {studyStats.length} sessões hoje
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <CalendarIcon className="h-16 w-16 text-primary" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-xs font-medium text-primary uppercase tracking-wider">Próximo Evento</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            {nextEvent ? (
                <div className="space-y-1">
                    <div className="text-base font-bold truncate leading-tight">{nextEvent.title}</div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Badge variant="outline" className="bg-background/80 font-mono text-[9px] border-primary/20 text-primary">
                            {new Date(nextEvent.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </Badge>
                        <span className="truncate">{new Date(nextEvent.startTime).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
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
            <Card className="shadow-sm border-border/50">
                <CardHeader className="pb-4">
                    <CardTitle className="text-sm">Fluxo de Caixa (Pessoal)</CardTitle>
                    <CardDescription className="text-xs">Comparativo de entradas e saídas.</CardDescription>
                </CardHeader>
                <CardContent className="pl-0 pb-2">
                    <FinanceChart data={financeData} />
                </CardContent>
            </Card>

            {/* Projetos Ativos */}
            <Card className="shadow-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" /> Projetos Pessoais
                    </CardTitle>
                    <Link href="/projects" className="text-xs text-primary hover:underline">Ver tudo</Link>
                </CardHeader>
                <CardContent>
                    {activeProjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-xs border border-dashed border-border/60 rounded-lg bg-muted/10">
                            Nenhum projeto ativo.
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {activeProjects.map(proj => (
                                <Link key={proj.id} href={`/projects/${proj.id}`}>
                                    <div className="group flex flex-col p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/30 hover:border-primary/30 transition-all cursor-pointer shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <Briefcase className="h-3.5 w-3.5" />
                                            </div>
                                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-normal">Andamento</Badge>
                                        </div>
                                        <span className="font-medium text-sm truncate">{proj.title}</span>
                                        <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{proj.description || "Sem descrição"}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Próximos Recebimentos (Clientes) */}
            <Card className="shadow-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-muted-foreground" /> Faturas a Receber
                    </CardTitle>
                    <Link href="/business" className="text-xs text-primary hover:underline">Ir para Negócios</Link>
                </CardHeader>
                <CardContent>
                    {topUpcomingInvoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-xs border border-dashed border-border/60 rounded-lg bg-muted/10">
                            Nenhuma fatura pendente.
                        </div>
                    ) : (
                        <ScrollArea className="h-[200px] pr-4 -mr-4">
                            <div className="space-y-1">
                                {topUpcomingInvoices.map((inv) => {
                                    const isLate = inv.dueDate < today || inv.status === 'OVERDUE';
                                    return (
                                        <div key={inv.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/40 transition-colors group">
                                            <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", isLate ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary")}>
                                                    <DollarSign className="h-4 w-4" />
                                                </div>
                                                <div className="truncate min-w-0">
                                                    <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{inv.clientName}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{inv.title} • {inv.billingTitle}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end shrink-0 pl-2">
                                                <span className="font-mono text-sm font-semibold">{formatCurrency(inv.value)}</span>
                                                <span className={cn("text-[9px] flex items-center gap-1", isLate ? "text-red-500 font-bold" : "text-muted-foreground")}>
                                                    <CalendarDays size={9} /> {inv.dueDate.toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

        </div>

        {/* DIREITA (3 colunas) */}
        <div className="lg:col-span-3 space-y-6">
            
            {/* ANIVERSÁRIOS */}
            <Card className="shadow-sm border-pink-200/50 dark:border-pink-900/30 bg-gradient-to-br from-pink-50/30 to-background dark:from-pink-950/10">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-pink-600 dark:text-pink-400">
                        <Cake className="h-4 w-4" /> Aniversários
                    </CardTitle>
                    <Link href="/social" className="text-xs text-muted-foreground hover:text-pink-500 hover:underline">Ver rede</Link>
                </CardHeader>
                <CardContent>
                    {upcomingBirthdays.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-xs">
                            Nenhum aniversário salvo.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upcomingBirthdays.map((friend) => (
                                <div key={friend.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border border-background shadow-sm">
                                            <AvatarImage src={friend.imageUrl || ""} />
                                            <AvatarFallback className="bg-pink-100 text-pink-600 font-bold text-xs">{friend.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-sm leading-none group-hover:text-pink-600 transition-colors">{friend.name}</p>
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                                                {friend.proximity === 'FAMILY' && <Heart className="h-2.5 w-2.5 text-purple-500" />}
                                                {friend.proximity === 'CLOSE' && <Star className="h-2.5 w-2.5 text-amber-500" />}
                                                Fazendo {friend.ageTurning} anos
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className={cn("text-[10px] border-none", friend.daysUntil === 0 ? "bg-pink-500 hover:bg-pink-600 text-white animate-pulse shadow-sm" : "bg-muted")}>
                                        {friend.daysUntil === 0 ? 'É Hoje! 🎉' : friend.daysUntil === 1 ? 'Amanhã' : `Em ${friend.daysUntil} dias`}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Mídia / Entretenimento */}
            <Card className="shadow-sm border-border/50 bg-gradient-to-b from-card to-muted/10">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <PlayCircle className="h-4 w-4 text-muted-foreground" /> Consumindo Agora
                    </CardTitle>
                    <Link href="/entertainment" className="text-[10px] uppercase font-bold text-muted-foreground hover:text-primary transition-colors">Ver tudo</Link>
                </CardHeader>
                <CardContent>
                    {activeMedia.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-xs border border-dashed border-border/60 rounded-lg bg-muted/10">
                            Nada no momento.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeMedia.map(item => (
                                <div key={item.id} className="flex gap-3 items-center group cursor-pointer">
                                    <div className="h-10 w-10 bg-muted rounded border border-border/50 overflow-hidden shrink-0">
                                        {item.coverUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center"><Star className="h-3 w-3 text-muted-foreground/30" /></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{item.title}</p>
                                        <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider">{item.type}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

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

            {/* Transações Recentes */}
            <Card className="shadow-sm border-border/50">
                <CardHeader className="pb-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" /> Movimentações
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[200px] pr-4 -mr-4">
                        <div className="space-y-1">
                            {recentTransactions.map(t => (
                                <div key={t.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/40 transition-colors group">
                                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {t.type === 'INCOME' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                        </div>
                                        <div className="truncate min-w-0">
                                            <p className="font-medium text-sm truncate">{t.description}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{t.account.name} • {new Date(t.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className={`font-mono text-xs font-medium whitespace-nowrap shrink-0 pl-2 ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-foreground'}`}>
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

      {/* ============================================================================== */}
      {/* 🟢 NOVA SEÇÃO: MÓDULOS DO SISTEMA (Abaixo da Grid Principal)                 */}
      {/* ============================================================================== */}
      
      <div className="pt-6 border-t border-border/40">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" /> 
            Módulos do Sistema
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Saúde Rapida */}
            <Card className="shadow-sm border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <Flame className="h-3.5 w-3.5 text-emerald-500" /> Ingestão
                        </span>
                        <Link href="/health" className="text-[10px] text-primary hover:underline">Monitor</Link>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                            <span>{calsToday} kcal</span>
                            <span className="text-muted-foreground">2500 kcal</span>
                        </div>
                        <Progress value={(calsToday / 2500) * 100} className="h-1.5" />
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-none"><Droplets className="h-3 w-3 mr-1"/> {waterToday}ml</Badge>
                    </div>
                </CardContent>
            </Card>

            {/* IA e Automação */}
            <Card className="shadow-sm border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <Bot className="h-3.5 w-3.5 text-primary" /> Assistente IA
                        </span>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{aiMessagesCount} <span className="text-sm font-normal text-muted-foreground">pings hoje</span></div>
                    </div>
                    <Link href="/ai" className="mt-4">
                        <Badge variant="outline" className="w-full justify-center hover:bg-muted py-1">Abrir Chat</Badge>
                    </Link>
                </CardContent>
            </Card>

            {/* Closet */}
            <Card className="shadow-sm border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <Shirt className="h-3.5 w-3.5 text-amber-500" /> Closet
                        </span>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{favoriteClothes.length} <span className="text-sm font-normal text-muted-foreground">peças favoritas</span></div>
                    </div>
                    <Link href="/wardrobe" className="mt-4">
                        <Badge variant="outline" className="w-full justify-center hover:bg-muted py-1">Acessar</Badge>
                    </Link>
                </CardContent>
            </Card>

            {/* Links e Sites */}
            <Card className="shadow-sm border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <LinkIcon className="h-3.5 w-3.5 text-indigo-500" /> Links Salvos
                        </span>
                        <Link href="/links" className="text-[10px] text-primary hover:underline">Ver Todos</Link>
                    </div>
                    <div className="space-y-2 flex-1">
                        {recentLinks.length === 0 ? (
                            <div className="text-xs text-muted-foreground py-2">Nenhum link salvo.</div>
                        ) : (
                            recentLinks.slice(0, 2).map(link => (
                                <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted transition-colors">
                                    <div className="h-6 w-6 rounded bg-muted/50 flex items-center justify-center shrink-0">
                                        <LinkIcon className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                    <span className="text-xs font-medium truncate">{link.title}</span>
                                </a>
                            ))
                        )}
                    </div>
                    <Link href="/cms" className="mt-2 block">
                        <Badge variant="outline" className="w-full justify-center hover:bg-muted py-1 border-dashed">Gerenciar CMS</Badge>
                    </Link>
                </CardContent>
            </Card>

        </div>
      </div>

    </div>
  );
}