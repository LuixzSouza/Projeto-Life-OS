import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Target, CalendarClock, ListChecks, Clock, MapPin, Grid3X3, ListTodo, Sun, LayoutList, CalendarDays } from "lucide-react";
import { format, isToday, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getRoutineItems } from "./actions";

import { AgendaHeader } from "@/components/agenda/agenda-header";
import { AgendaCalendar } from "@/components/agenda/agenda-calendar";
import { EventList } from "@/components/agenda/event-list"; 
import { AgendaWeekGrid } from "@/components/agenda/agenda-week-grid"; // 🟢 NOVO
import { AgendaMonthGrid } from "@/components/agenda/agenda-month-grid"; // 🟢 NOVO
import { TaskList } from "@/components/agenda/task-list";
import { RoutineManager } from "@/components/agenda/routine-manager";

const projectSelect = { 
  select: { title: true, color: true } 
} satisfies Prisma.ProjectArgs;

type EventWithProject = Prisma.EventGetPayload<{
  include: { project: typeof projectSelect }
}>;

interface AgendaPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const params = await searchParams;
  const selectedDate = params.date ? parseISO(params.date) : new Date();
  const isSpecificDate = !!params.date;
  const now = new Date();
  
  // 🟢 CORREÇÃO: Vamos buscar o mês inteiro para alimentar a Semana e o Mês!
  const monthStart = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 0 });
  const monthEnd = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 0 });

  const [allEvents, pendingTasks, routineItems] = await Promise.all([
    prisma.event.findMany({
        where: { startTime: { gte: monthStart, lte: monthEnd } },
        orderBy: { startTime: 'asc' },
        include: { project: projectSelect }
    }),
    prisma.task.findMany({
        where: { isDone: false },
        orderBy: { dueDate: 'asc' },
        take: 10, 
        include: { project: projectSelect }, 
    }),
    getRoutineItems()
  ]);

  // Filtros rápidos
  const bookedDays = allEvents.map(e => e.startTime);
  const eventsToday = allEvents.filter(e => isSameDay(e.startTime, selectedDate));
  const remainingEventsCount = eventsToday.filter(e => e.startTime > now).length;
  const nextUpEvent = eventsToday.find(e => e.startTime > now);

  // GroupedEvents (apenas para alimentar o EventList diário sem quebrar)
  const groupedEvents = {
      [format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })]: eventsToday as EventWithProject[]
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] dark:bg-[#09090B] pb-24 animate-in fade-in duration-500">
      
      <AgendaHeader isSpecificDate={isSpecificDate} date={selectedDate} />

      <div className="px-4 md:px-8 py-6 space-y-8 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* SIDEBAR */}
            <div className="lg:col-span-3 space-y-6">
                <Card className="border-border/40 shadow-sm bg-card rounded-[1.5rem] overflow-hidden">
                    <CardContent className="p-4 flex justify-center">
                        <AgendaCalendar bookedDays={bookedDays} />
                    </CardContent>
                </Card>

                <Card className="border-border/40 shadow-sm bg-card rounded-[1.5rem] overflow-hidden">
                    <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                        <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
                            <Target className="h-4 w-4 text-primary" /> Foco do Dia
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-background shadow-sm p-4 rounded-xl border border-border/40 flex flex-col items-center text-center">
                                <CalendarClock className="h-4 w-4 text-blue-500 mb-2" />
                                <span className="text-2xl font-black tabular-nums leading-none">{remainingEventsCount}</span>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Eventos hoje</span>
                            </div>
                            <div className="bg-background shadow-sm p-4 rounded-xl border border-border/40 flex flex-col items-center text-center">
                                <ListChecks className="h-4 w-4 text-amber-500 mb-2" />
                                <span className="text-2xl font-black tabular-nums leading-none">{pendingTasks.length}</span>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Tarefas ativas</span>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Clock className="h-3 w-3" /> Próximo na Fila
                            </h4>
                            {nextUpEvent ? (
                                <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl border-l-4 border-l-primary hover:bg-primary/10 transition-colors cursor-pointer">
                                    <p className="font-bold text-primary truncate text-sm">{nextUpEvent.title}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <Badge variant="outline" className="bg-background border-primary/20 text-primary text-[10px] font-mono px-1.5">
                                            {format(nextUpEvent.startTime, 'HH:mm')}
                                        </Badge>
                                        {nextUpEvent.location && (
                                            <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 truncate max-w-[120px]">
                                                <MapPin className="h-3 w-3" /> {nextUpEvent.location}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4 bg-muted/20 rounded-xl border border-border/40 border-dashed">
                                    <p className="text-xs font-medium text-muted-foreground">Sem compromissos hoje.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ÁREA PRINCIPAL (TABS) */}
            <div className="lg:col-span-9">
                <Card className="border-border/40 shadow-xl bg-card h-[calc(100vh-140px)] min-h-[700px] flex flex-col rounded-[2rem] overflow-hidden">
                    <Tabs defaultValue="day" className="w-full flex-1 flex flex-col h-full">
                        
                        {/* Controles de Visão (HUD) */}
                        <div className="px-6 py-4 border-b border-border/40 flex flex-col sm:flex-row justify-between items-center bg-muted/10 gap-4">
                            <TabsList className="bg-muted/50 p-1 rounded-xl h-12 w-full sm:w-auto shadow-inner border border-border/40 overflow-x-auto">
                                <TabsTrigger value="day" className="rounded-lg px-6 text-[10px] font-black uppercase tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                    <LayoutList className="h-4 w-4" /> O Dia
                                </TabsTrigger>
                                <TabsTrigger value="week" className="rounded-lg px-6 text-[10px] font-black uppercase tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                    <CalendarDays className="h-4 w-4" /> Semana
                                </TabsTrigger>
                                <TabsTrigger value="month" className="rounded-lg px-6 text-[10px] font-black uppercase tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                    <Grid3X3 className="h-4 w-4" /> Mês
                                </TabsTrigger>
                                <div className="h-6 w-px bg-border/60 mx-2 hidden sm:block" />
                                <TabsTrigger value="tasks" className="rounded-lg px-6 text-[10px] font-black uppercase tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <ListTodo className="h-4 w-4" /> Tarefas
                                </TabsTrigger>
                                <TabsTrigger value="routine" className="rounded-lg px-6 text-[10px] font-black uppercase tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <Sun className="h-4 w-4" /> Rotina
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        
                        {/* VISÃO: DIA */}
                        <TabsContent value="day" className="p-0 m-0 flex-1 overflow-hidden flex flex-col h-full data-[state=active]:flex">
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background/50">
                                <EventList groupedEvents={groupedEvents} sortedKeys={Object.keys(groupedEvents)} />
                            </div>
                        </TabsContent>

                        {/* VISÃO: SEMANA */}
                        <TabsContent value="week" className="p-0 m-0 flex-1 overflow-hidden flex flex-col h-full data-[state=active]:flex">
                            <AgendaWeekGrid events={allEvents as EventWithProject[]} selectedDate={selectedDate} />
                        </TabsContent>

                        {/* VISÃO: MÊS */}
                        <TabsContent value="month" className="p-0 m-0 flex-1 overflow-hidden flex flex-col h-full data-[state=active]:flex">
                            <AgendaMonthGrid events={allEvents as EventWithProject[]} selectedDate={selectedDate} />
                        </TabsContent>
                        
                        {/* VISÃO: TAREFAS */}
                        <TabsContent value="tasks" className="p-6 m-0 flex-1 overflow-y-auto data-[state=active]:flex flex-col bg-background/50">
                            <TaskList tasks={pendingTasks} />
                        </TabsContent>

                        {/* VISÃO: ROTINA */}
                        <TabsContent value="routine" className="p-6 m-0 flex-1 overflow-y-auto data-[state=active]:flex flex-col bg-background/50">
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