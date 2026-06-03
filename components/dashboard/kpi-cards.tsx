import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { DollarSign, CheckSquare, BookOpen, Landmark, AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import type { BusinessStats, DashboardEvent } from "@/components/dashboard/types";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { Reveal } from "@/components/dashboard/reveal";

interface KpiCardsProps {
  totalBalance: number;
  margin: number;
  businessStats: BusinessStats;
  pendingTasksCount: number;
  completedTasksCount: number;
  totalStudyMinutes: number;
  studySessionsCount: number;
  nextEvent: DashboardEvent | null;
  formatCurrency: (val: number) => string;
  currency: string;
}

export function KpiCards({
  totalBalance,
  margin,
  businessStats,
  pendingTasksCount,
  completedTasksCount,
  totalStudyMinutes,
  studySessionsCount,
  nextEvent,
  formatCurrency,
  currency,
}: KpiCardsProps) {
  const studyHours = Math.floor(totalStudyMinutes / 60);
  const studyMins = totalStudyMinutes % 60;

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      {/* Saldo Pessoal */}
      <Reveal delay={0} className="h-full">
        <Card className="h-full bg-card shadow-sm border-border/50 hover:shadow-md hover:border-primary/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Saldo Pessoal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground/50" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">
              <AnimatedNumber value={totalBalance} format="currency" currency={currency} />
            </div>
            <div className="mt-1">
              <Badge variant="secondary" className={cn("text-[10px] font-mono", margin >= 0 ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10")}>
                {margin >= 0 ? '+' : ''}{margin.toFixed(0)}% margem
              </Badge>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* Negócios: A Receber */}
      <Reveal delay={0.06} className="h-full">
        <Card className={cn("h-full shadow-sm transition-all", businessStats.totalOverdue > 0 ? "bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30" : "bg-card border-border/50 hover:border-primary/30 hover:shadow-md")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={cn("text-xs font-medium", businessStats.totalOverdue > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
              Negócios: A Receber
            </CardTitle>
            <Landmark className={cn("h-4 w-4", businessStats.totalOverdue > 0 ? "text-red-500/70" : "text-muted-foreground/50")} />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-foreground">
              <AnimatedNumber value={businessStats.totalReceivable + businessStats.totalOverdue} format="currency" currency={currency} />
            </div>
            {businessStats.totalOverdue > 0 ? (
              <p className="text-[10px] text-red-500 font-medium flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" /> {formatCurrency(businessStats.totalOverdue)} em atraso
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-1">Tudo em dia 🎉</p>
            )}
          </CardContent>
        </Card>
      </Reveal>

      {/* Tarefas */}
      <Reveal delay={0.12} className="h-full">
        <Card className="h-full bg-card shadow-sm border-border/50 hover:shadow-md hover:border-primary/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Tarefas</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground/50" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-xl lg:text-2xl font-bold">
                <AnimatedNumber value={pendingTasksCount} format="int" /> <span className="text-sm font-normal text-muted-foreground">pendentes</span>
              </div>
              <div className="text-[10px] text-muted-foreground mb-1">{completedTasksCount} feitas</div>
            </div>
            <Progress value={(completedTasksCount / (completedTasksCount + pendingTasksCount || 1)) * 100} className="h-1 mt-2.5 bg-muted/50" />
          </CardContent>
        </Card>
      </Reveal>

      {/* Tempo de Foco */}
      <Reveal delay={0.18} className="h-full">
        <Card className="h-full bg-card shadow-sm border-border/50 hover:shadow-md hover:border-primary/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Tempo de Foco</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground/50" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">
              <AnimatedNumber value={studyHours} format="int" /><span className="text-sm font-normal text-muted-foreground">h</span>{" "}
              <AnimatedNumber value={studyMins} format="int" /><span className="text-sm font-normal text-muted-foreground">m</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wide">
              {studySessionsCount} sessões hoje
            </p>
          </CardContent>
        </Card>
      </Reveal>

      {/* Próximo Evento */}
      <Reveal delay={0.24} className="h-full">
        <Card className="h-full bg-primary/5 border-primary/20 shadow-sm relative overflow-hidden group">
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
      </Reveal>
    </div>
  );
}
