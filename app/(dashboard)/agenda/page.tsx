import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Target, CalendarClock, ListChecks, Clock, ListTodo, Sun, CalendarRange } from "lucide-react";
import {
  parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay,
} from "date-fns";

import { AgendaHeader } from "@/components/agenda/agenda-header";
import { AgendaCalendar } from "@/components/agenda/agenda-calendar";
import { UnifiedAgenda } from "@/components/agenda/unified-agenda";
import { TaskList } from "@/components/agenda/task-list";
import { RoutineManager } from "@/components/agenda/routine-manager";
import { getRoutineItems } from "./actions";
import { getAgendaItems } from "@/lib/agenda-aggregator";
import { getCurrentUserId } from "@/lib/auth";

const projectSelect = { select: { title: true, color: true } } satisfies Prisma.ProjectArgs;

export const dynamic = "force-dynamic";

interface AgendaPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const params = await searchParams;
  const selectedDate = params.date ? parseISO(params.date) : new Date();
  const isSpecificDate = !!params.date;
  const now = new Date();

  // Intervalo da grade do mês (6 semanas) — alimenta o calendário unificado.
  const rangeStart = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 0 });
  const rangeEnd = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 0 });

  const userId = await getCurrentUserId();

  const [agendaItems, pendingTasks, routineItems] = await Promise.all([
    getAgendaItems(rangeStart, rangeEnd),
    prisma.task.findMany({
      where: { isDone: false, userId, deletedAt: null },
      orderBy: { dueDate: "asc" },
      take: 10,
      include: { project: projectSelect },
    }),
    getRoutineItems(),
  ]);

  // Dias com qualquer registro (para marcar no calendário).
  const bookedDays = agendaItems.map((i) => new Date(i.date));

  // Resumo do dia selecionado.
  const itemsToday = agendaItems.filter((i) => isSameDay(new Date(i.date), selectedDate));
  const nextUp = itemsToday
    .filter((i) => i.time && new Date(i.date) > now)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))[0];

  return (
    <div className="min-h-screen bg-muted/30 pb-24 animate-in fade-in duration-500">
      <AgendaHeader isSpecificDate={isSpecificDate} date={selectedDate} />

      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-6 md:px-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">

          {/* SIDEBAR */}
          <div className="space-y-6 lg:col-span-3">
            <Card className="overflow-hidden rounded-[1.5rem] border-border/40 bg-card shadow-sm">
              <CardContent className="flex justify-center p-4">
                <AgendaCalendar bookedDays={bookedDays} />
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[1.5rem] border-border/40 bg-card shadow-sm">
              <CardHeader className="border-b border-border/40 bg-muted/10 pb-3">
                <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground">
                  <Target className="h-4 w-4 text-primary" /> Resumo do Dia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col items-center rounded-xl border border-border/40 bg-background p-4 text-center shadow-sm">
                    <CalendarClock className="mb-2 h-4 w-4 text-blue-500" />
                    <span className="text-2xl font-black leading-none tabular-nums">{itemsToday.length}</span>
                    <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Registros hoje</span>
                  </div>
                  <div className="flex flex-col items-center rounded-xl border border-border/40 bg-background p-4 text-center shadow-sm">
                    <ListChecks className="mb-2 h-4 w-4 text-amber-500" />
                    <span className="text-2xl font-black leading-none tabular-nums">{pendingTasks.length}</span>
                    <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Tarefas ativas</span>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <Clock className="h-3 w-3" /> Próximo na Fila
                  </h4>
                  {nextUp ? (
                    <div className="cursor-pointer rounded-xl border border-l-4 border-primary/20 border-l-primary bg-primary/5 p-3 transition-colors hover:bg-primary/10">
                      <p className="truncate text-sm font-bold text-primary">{nextUp.title}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge variant="outline" className="border-primary/20 bg-background px-1.5 font-mono text-[10px] text-primary">
                          {nextUp.time}
                        </Badge>
                        {nextUp.subtitle && (
                          <p className="max-w-[120px] truncate text-[10px] font-medium text-muted-foreground">{nextUp.subtitle}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/40 bg-muted/20 py-4 text-center">
                      <p className="text-xs font-medium text-muted-foreground">Sem horários pendentes hoje.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ÁREA PRINCIPAL */}
          <div className="lg:col-span-9">
            <Card className="flex h-[calc(100vh-140px)] min-h-[700px] flex-col overflow-hidden rounded-[2rem] border-border/40 bg-card shadow-xl">
              <Tabs defaultValue="calendar" className="flex h-full w-full flex-1 flex-col">
                <div className="flex items-center justify-between border-b border-border/40 bg-muted/10 px-4 py-3">
                  <TabsList className="h-11 overflow-x-auto rounded-xl border border-border/40 bg-muted/50 p-1 shadow-inner">
                    <TabsTrigger value="calendar" className="gap-2 rounded-lg px-5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                      <CalendarRange className="h-4 w-4" /> Calendário
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="gap-2 rounded-lg px-5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
                      <ListTodo className="h-4 w-4" /> Tarefas
                    </TabsTrigger>
                    <TabsTrigger value="routine" className="gap-2 rounded-lg px-5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
                      <Sun className="h-4 w-4" /> Rotina
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* CALENDÁRIO UNIFICADO */}
                <TabsContent value="calendar" className="m-0 flex h-full flex-1 flex-col overflow-hidden p-0 data-[state=active]:flex">
                  <UnifiedAgenda items={agendaItems} selectedDateISO={selectedDate.toISOString()} />
                </TabsContent>

                {/* TAREFAS */}
                <TabsContent value="tasks" className="m-0 flex-1 overflow-y-auto bg-background/50 p-6 data-[state=active]:flex flex-col">
                  <TaskList tasks={pendingTasks} />
                </TabsContent>

                {/* ROTINA */}
                <TabsContent value="routine" className="m-0 flex-1 overflow-y-auto bg-background/50 p-6 data-[state=active]:flex flex-col">
                  <RoutineManager items={routineItems} />
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
