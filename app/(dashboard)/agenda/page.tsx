import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Target, CalendarClock, ListChecks, Clock, MapPin } from "lucide-react";
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getRoutineItems } from "./actions";

// Componentes Refatorados
import { AgendaHeader } from "@/components/agenda/agenda-header";
import { AgendaCalendar } from "@/components/agenda/agenda-calendar";
import { EventList } from "@/components/agenda/event-list";
import { TaskList } from "@/components/agenda/task-list";
import { RoutineManager } from "@/components/agenda/routine-manager";

// --- 1. CONFIGURAÇÃO DE TIPAGEM ---
const projectSelect = { 
    select: { title: true, color: true } 
} satisfies Prisma.ProjectArgs;

type EventWithProject = Prisma.EventGetPayload<{
    include: { project: typeof projectSelect }
}>;

const formatEventDate = (date: Date) => {
    if (isToday(date)) return "Hoje";
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
};

interface AgendaPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
    const params = await searchParams;
    const selectedDate = params.date ? parseISO(params.date) : new Date();
    const isSpecificDate = !!params.date;
    const now = new Date();
    
    const startFilter = isSpecificDate 
        ? new Date(selectedDate.setHours(0,0,0,0)) 
        : new Date(); 
    
    const endFilter = isSpecificDate
        ? new Date(selectedDate.setHours(23,59,59,999))
        : undefined; 

    // --- 2. BUSCA DE DADOS ---
    const [events, futureEvents, pendingTasks, routineItems] = await Promise.all([
        prisma.event.findMany({
            where: { startTime: { gte: startFilter, lte: endFilter } },
            orderBy: { startTime: 'asc' },
            take: isSpecificDate ? 50 : 20,
            include: { project: projectSelect }
        }),
        prisma.event.findMany({
            where: { startTime: { gte: new Date() } },
            select: { startTime: true }
        }),
        prisma.task.findMany({
            where: { isDone: false },
            orderBy: { dueDate: 'asc' },
            take: 7, 
            include: { project: projectSelect }, 
        }),
        getRoutineItems()
    ]);

    const bookedDays = futureEvents.map(e => e.startTime);
    const remainingEventsCount = events.filter(e => e.startTime > now).length;
    const nextUpEvent = events.find(e => e.startTime > now);

    // Agrupamento de Eventos
    const groupedEvents = events.reduce((groups, event) => {
        const key = formatEventDate(event.startTime);
        if (!groups[key]) groups[key] = [];
        groups[key].push(event as EventWithProject);
        return groups;
    }, {} as Record<string, EventWithProject[]>);

    const sortedGroupKeys = Object.keys(groupedEvents); 

    return (
        <div className="min-h-screen bg-background pb-24 animate-in fade-in duration-500">
            <AgendaHeader isSpecificDate={isSpecificDate} date={selectedDate} />

            <div className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto" >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* --- SIDEBAR (Calendário e Infos) --- */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-border shadow-sm bg-card">
                            <CardContent className="p-4 flex justify-center">
                                <AgendaCalendar bookedDays={bookedDays} />
                            </CardContent>
                        </Card>

                        {/* Widget de Foco */}
                        <Card className="border-border shadow-sm bg-card overflow-hidden">
                            <CardHeader className="pb-3 border-b border-border">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                                    <Target className="h-5 w-5 text-primary" /> Visão do Dia
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-muted/50 p-3 rounded-xl border border-border flex flex-col">
                                        <CalendarClock className="h-5 w-5 text-muted-foreground mb-2" />
                                        <span className="text-2xl font-bold text-foreground leading-none">{remainingEventsCount}</span>
                                        <span className="text-xs text-muted-foreground mt-1">Eventos restantes</span>
                                    </div>
                                    <div className="bg-muted/50 p-3 rounded-xl border border-border flex flex-col">
                                        <ListChecks className="h-5 w-5 text-muted-foreground mb-2" />
                                        <span className="text-2xl font-bold text-foreground leading-none">{pendingTasks.length}</span>
                                        <span className="text-xs text-muted-foreground mt-1">Tarefas foco</span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Próximo na agenda</h4>
                                    {nextUpEvent ? (
                                        <div className="bg-primary/5 border border-primary/10 p-3 rounded-lg border-l-4 border-l-primary transition-all hover:shadow-sm">
                                            <p className="font-semibold text-primary truncate">{nextUpEvent.title}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    {format(nextUpEvent.startTime, 'HH:mm')}
                                                </p>
                                                {nextUpEvent.location && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate max-w-[120px]">
                                                        <MapPin className="h-3 w-3" /> {nextUpEvent.location}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 bg-muted/30 rounded-lg border border-border">
                                            <p className="text-sm text-muted-foreground italic">Nenhum evento próximo hoje.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* --- CONTEÚDO PRINCIPAL (Tabs) --- */}
                    <div className="lg:col-span-8">
                        <Card className="border-border shadow-sm bg-card h-full min-h-[600px] flex flex-col">
                            <Tabs defaultValue="events" className="w-full flex-1 flex flex-col">
                                <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row justify-between items-center bg-muted/10 gap-4">
                                    <TabsList className="bg-muted p-1 rounded-lg h-auto w-full sm:w-auto">
                                        <TabsTrigger value="events" className="rounded-md px-4 py-1.5 text-sm flex-1 sm:flex-none">Linha do Tempo</TabsTrigger>
                                        <TabsTrigger value="tasks" className="rounded-md px-4 py-1.5 text-sm flex-1 sm:flex-none">Foco do Dia</TabsTrigger>
                                        <TabsTrigger value="routine" className="rounded-md px-4 py-1.5 text-sm flex-1 sm:flex-none">Rotina</TabsTrigger>
                                    </TabsList>
                                    <Badge variant="outline" className="hidden sm:flex bg-background text-muted-foreground border-border">
                                        {events.length} eventos
                                    </Badge>
                                </div>
                                
                                <TabsContent value="events" className="p-6 flex-1">
                                    <EventList groupedEvents={groupedEvents} sortedKeys={sortedGroupKeys} />
                                </TabsContent>
                                
                                <TabsContent value="tasks" className="flex-1">
                                    <TaskList tasks={pendingTasks} />
                                </TabsContent>

                                <TabsContent value="routine" className="flex-1 flex flex-col">
                                    <div className="p-6 h-full flex-1">
                                        <RoutineManager items={routineItems} />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}