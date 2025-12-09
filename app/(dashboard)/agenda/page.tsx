import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Calendar as CalendarIcon, 
    CheckSquare, 
    ChevronRight, 
    CheckCircle2, 
    Circle, 
    Folder, 
    MapPin, 
    Filter, 
    Plus, 
    Pencil,
    Layout,
    Clock,
    Sparkles,
    Target,
    ListChecks,
    CalendarClock
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EventDeleteButton } from "@/components/agenda/event-delete-button"; 
import { toggleTaskDone, getRoutineItems } from "./actions";
import Link from 'next/link';

// Componentes Client
import { AgendaCalendar } from "@/components/agenda/agenda-calendar";
import { EventForm } from "@/components/agenda/event-form";
import { RoutineManager } from "@/components/agenda/routine-manager";

// --- 1. CONFIGURAÇÃO DE TIPAGEM E QUERY ---

const projectSelect = { 
    select: { title: true, color: true } 
} satisfies Prisma.ProjectArgs;

type EventWithProject = Prisma.EventGetPayload<{
    include: { project: typeof projectSelect }
}>;

type TaskWithProject = Prisma.TaskGetPayload<{
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

    // --- 2. BUSCA DE DADOS OTIMIZADA ---
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

    // Processamento para o novo card de "Foco"
    const remainingEventsCount = events.filter(e => e.startTime > now).length;
    // Encontra o próximo evento (o primeiro da lista que começa no futuro)
    const nextUpEvent = events.find(e => e.startTime > now);

    const groupedEvents = events.reduce((groups, event) => {
        const key = formatEventDate(event.startTime);
        if (!groups[key]) groups[key] = [];
        groups[key].push(event as EventWithProject);
        return groups;
    }, {} as Record<string, EventWithProject[]>);

    const sortedGroupKeys = Object.keys(groupedEvents); 
    
    const pageTitle = isSpecificDate 
        ? `Agenda de ${format(startFilter, "d 'de' MMMM", { locale: ptBR })}`
        : "Próximos Compromissos";

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* --- HEADER CLEAN --- */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Agenda</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-lg capitalize flex items-center gap-2">
                            <Clock className="h-5 w-5 text-zinc-400" />
                            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {isSpecificDate && (
                            <Link href="/agenda">
                                <Button variant="ghost" className="gap-2 text-zinc-500 hover:text-zinc-900">
                                    <Filter className="h-4 w-4" /> Limpar Filtro
                                </Button>
                            </Link>
                        )}
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="h-10 px-6 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm transition-all hover:scale-105">
                                    <Plus className="h-4 w-4 mr-2" /> Novo Evento
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Novo Compromisso</DialogTitle>
                                    <CardDescription>O que você vai fazer?</CardDescription>
                                </DialogHeader>
                                <EventForm /> 
                            </DialogContent>
                        </Dialog>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* --- COLUNA ESQUERDA --- */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Calendário */}
                        <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
                            <CardContent className="p-4 flex justify-center">
                                <AgendaCalendar bookedDays={bookedDays} />
                            </CardContent>
                        </Card>

                        {/* NOVO CARD: Resumo e Foco */}
                        <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 overflow-hidden">
                            <CardHeader className="pb-3 border-b border-zinc-50 dark:border-zinc-800/50">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                                    <Target className="h-5 w-5 text-indigo-500" /> Visão do Dia
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-5">
                                
                                {/* Contadores */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col">
                                        <CalendarClock className="h-5 w-5 text-zinc-400 mb-2" />
                                        <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">{remainingEventsCount}</span>
                                        <span className="text-xs text-zinc-500 mt-1">Eventos restantes</span>
                                    </div>
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col">
                                        <ListChecks className="h-5 w-5 text-zinc-400 mb-2" />
                                        <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">{pendingTasks.length}</span>
                                        <span className="text-xs text-zinc-500 mt-1">Tarefas foco</span>
                                    </div>
                                </div>

                                {/* Próximo Compromisso em Destaque */}
                                <div>
                                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Próximo na agenda</h4>
                                    {nextUpEvent ? (
                                        <div className="bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/50 p-3 rounded-lg border-l-4 border-l-indigo-500 transition-all hover:shadow-sm">
                                            <p className="font-semibold text-indigo-900 dark:text-indigo-100 truncate">{nextUpEvent.title}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                                                    <Clock className="h-4 w-4" />
                                                    {format(nextUpEvent.startTime, 'HH:mm')}
                                                </p>
                                                {nextUpEvent.location && (
                                                     <p className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 truncate max-w-[120px]">
                                                        <MapPin className="h-3 w-3" /> {nextUpEvent.location}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                            <p className="text-sm text-zinc-500 italic">Nenhum evento próximo hoje.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* --- COLUNA DIREITA (Conteúdo Principal) --- */}
                    <div className="lg:col-span-8">
                        
                        <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 h-full min-h-[600px] flex flex-col">
                            
                            {/* Tabs Header */}
                            <Tabs defaultValue="events" className="w-full flex-1 flex flex-col">
                                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/30 dark:bg-zinc-900/30">
                                    <TabsList className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg h-auto">
                                        <TabsTrigger value="events" className="rounded-md px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-zinc-700">Linha do Tempo</TabsTrigger>
                                        <TabsTrigger value="tasks" className="rounded-md px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-zinc-700">Foco do Dia</TabsTrigger>
                                        <TabsTrigger value="routine" className="rounded-md px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-zinc-700">Rotina</TabsTrigger>
                                    </TabsList>
                                    <Badge variant="secondary" className="hidden sm:flex bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                        {events.length} eventos
                                    </Badge>
                                </div>
                                
                                {/* ABA 1: EVENTOS */}
                                <TabsContent value="events" className="p-0 flex-1">
                                    <div className="p-6 space-y-8">
                                        {events.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                                                <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                                    <CalendarIcon className="h-8 w-8 opacity-40" />
                                                </div>
                                                <p className="font-medium">Agenda livre.</p>
                                                <p className="text-sm">Aproveite o tempo livre ou planeje algo novo.</p>
                                            </div>
                                        ) : (
                                            sortedGroupKeys.map(dateKey => (
                                                <div key={dateKey} className="relative pl-4 border-l-2 border-zinc-100 dark:border-zinc-800 space-y-6">
                                                    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-700 border-4 border-white dark:border-zinc-950"></div>
                                                    
                                                    <div>
                                                        <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg capitalize mb-4 leading-none transform -translate-y-1">
                                                            {dateKey}
                                                        </h3>
                                                        
                                                        <div className="grid gap-3">
                                                            {groupedEvents[dateKey].map(event => (
                                                                <div key={event.id} className="group relative flex items-center gap-4 p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-700/50 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-md hover:border-zinc-200 transition-all duration-300">
                                                                    
                                                                    {/* Barra de Cor */}
                                                                    <div className="w-1.5 h-12 rounded-full shrink-0" style={{ backgroundColor: event.color || '#6366f1' }} />
                                                                    
                                                                    {/* Hora */}
                                                                    <div className="flex flex-col w-16 shrink-0">
                                                                        <span className="text-lg font-bold text-zinc-700 dark:text-zinc-200">
                                                                            {format(event.startTime, 'HH:mm')}
                                                                        </span>
                                                                        {event.endTime && (
                                                                            <span className="text-xs text-zinc-400">
                                                                                - {format(event.endTime, 'HH:mm')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Conteúdo */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-0.5">
                                                                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{event.title}</h4>
                                                                            {event.project && (
                                                                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-zinc-200 text-zinc-500 font-normal">
                                                                                    {event.project.title}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                                                                            {event.location && (
                                                                                <span className="flex items-center gap-1">
                                                                                    <MapPin className="h-3 w-3" /> {event.location}
                                                                                </span>
                                                                            )}
                                                                            {event.description && (
                                                                                <span className="truncate max-w-[200px] opacity-70">
                                                                                    {event.description}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Ações */}
                                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Dialog>
                                                                            <DialogTrigger asChild>
                                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50">
                                                                                    <Pencil className="h-4 w-4" />
                                                                                </Button>
                                                                            </DialogTrigger>
                                                                            <DialogContent className="sm:max-w-[425px]">
                                                                                <DialogHeader>
                                                                                    <DialogTitle>Editar Compromisso</DialogTitle>
                                                                                    <CardDescription>Atualize os detalhes.</CardDescription>
                                                                                </DialogHeader>
                                                                                
                                                                                {/* CORREÇÃO: Mapeamento explícito para satisfazer a tipagem */}
                                                                                <EventForm initialData={{
                                                                                    id: event.id,
                                                                                    title: event.title,
                                                                                    startTime: event.startTime,
                                                                                    // Garante que null seja passado se não existir, evitando undefined
                                                                                    description: event.description || null,
                                                                                    location: event.location || null,
                                                                                    color: event.color || null
                                                                                }} /> 
                                                                            </DialogContent>
                                                                        </Dialog>
                                                                        <EventDeleteButton eventId={event.id} eventTitle={event.title} />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </TabsContent>
                                
                                {/* ABA 2: TAREFAS */}
                                <TabsContent value="tasks" className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                                            <CheckSquare className="h-5 w-5 text-indigo-500" /> Prioridade Alta
                                        </h3>
                                        <Badge variant="secondary">{pendingTasks.length} pendentes</Badge>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {pendingTasks.length === 0 ? (
                                             <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50">
                                                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                                                <p className="text-zinc-500">Tudo limpo por aqui!</p>
                                             </div>
                                        ) : (
                                            pendingTasks.map(task => (
                                                <div key={task.id} className="group flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 transition-all shadow-sm">
                                                    <form action={toggleTaskDone.bind(null, task.id)}>
                                                        <Button type="submit" size="icon" variant="ghost" className="h-6 w-6 rounded-full p-0 text-zinc-300 hover:text-green-600 hover:bg-green-50">
                                                            <Circle className="h-5 w-5" />
                                                        </Button>
                                                    </form>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200">{task.title}</p>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            {task.dueDate && (
                                                                <span className={`text-xs font-medium ${new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-zinc-500'}`}>
                                                                    {format(task.dueDate, 'dd MMM')}
                                                                </span>
                                                            )}
                                                            {task.project && (
                                                                <span className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                                                                    <Folder className="h-3 w-3" /> {task.project.title}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    
                                    <Button variant="ghost" className="w-full mt-6 text-zinc-500 hover:text-indigo-600" asChild>
                                        <Link href="/projects">Ver quadro de projetos completo &rarr;</Link>
                                    </Button>
                                </TabsContent>

                                {/* ABA 3: ROTINA */}
                                <TabsContent value="routine" className="h-full flex flex-col">
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