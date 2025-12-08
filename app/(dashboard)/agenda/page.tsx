import { prisma } from "@/lib/prisma";
import { createEvent, deleteEvent, toggleTaskDone } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
    Calendar as CalendarIcon, 
    CheckSquare, 
    Trash2, 
    Plus, 
    ChevronRight,
    Bell,
    CheckCircle2,
    Circle,
    Folder,
    Filter
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EventDeleteButton } from "@/components/agenda/event-delete-button"; 
import Link from 'next/link';

// TIPAGEM FORTE (Mantida)
interface ProjectData {
    title: string;
    color: string | null;
}
interface EventWithProject {
    id: string;
    title: string;
    startTime: Date;
    description: string | null;
    project: ProjectData | null;
}
interface TaskWithProject {
    id: string;
    title: string;
    isDone: boolean;
    dueDate: Date | null;
    project: ProjectData | null;
}

// Componente helper para formatar a data
const formatEventDate = (date: Date) => {
    if (isToday(date)) return "Hoje";
    return format(date, 'EEE, d MMM', { locale: ptBR });
};


export default async function AgendaPage() {
    const today = new Date();
    const todayFormatted = format(today, 'yyyy-MM-dd');
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfTomorrow = new Date(today);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    // DEFINE O SELECT REUTILIZÁVEL E TIPADO (AGORA COMO UMA VARIÁVEL SIMPLES)
    // O Prisma requer que o select/include seja um objeto literal simples para funcionar
    const projectSelection = { title: true as const, color: true as const }; 

    // 1. Buscar Eventos (CORREÇÃO APLICADA AQUI)
    const events = await prisma.event.findMany({
        where: { startTime: { gte: startOfToday } },
        orderBy: { startTime: 'asc' },
        take: 20,
        // PASSANDO O OBJETO DE SELEÇÃO DIRETAMENTE NO INCLUDE
        include: { 
            project: { select: projectSelection } // Estrutura correta para include + select
        } 
    }) as unknown as EventWithProject[];

    // 2. Buscar Tarefas Pendentes (CORREÇÃO APLICADA AQUI)
    const pendingTasks = await prisma.task.findMany({
        where: { isDone: false },
        orderBy: { dueDate: 'asc' }, 
        take: 7, 
        include: { 
            project: { select: projectSelection } 
        }, 
    }) as unknown as TaskWithProject[];

    // Eventos de hoje (Filtra do array completo)
    const todaysEvents = events.filter(event => 
        new Date(event.startTime) >= startOfToday && 
        new Date(event.startTime) < startOfTomorrow
    ).slice(0, 5);

    // 3. Agrupamento para a Linha do Tempo
    const groupedEvents = events.reduce((groups, event) => {
        const date = event.startTime;
        const key = formatEventDate(date);

        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(event);
        return groups;
    }, {} as Record<string, EventWithProject[]>);

    const sortedGroupKeys = Object.keys(groupedEvents).sort((a, b) => {
        const dateA = groupedEvents[a][0].startTime;
        const dateB = groupedEvents[b][0].startTime;
        return dateA.getTime() - dateB.getTime();
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Cabeçalho */}
                <header className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agenda Central</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                {new Date().toLocaleDateString('pt-BR', { 
                                    weekday: 'long', 
                                    day: 'numeric', 
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" className="gap-2">
                                <Filter className="h-4 w-4" /> Filtrar
                            </Button>
                            <Button className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                                <Plus className="h-4 w-4" /> Novo Evento
                            </Button>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* COLUNA ESQUERDA - CALENDÁRIO & NOVO EVENTO */}
                    <div className="lg:col-span-1 space-y-8">
                        
                        {/* Calendário Visual */}
                        <Card className="border-none shadow-lg">
                            <CardContent className="p-4 flex justify-center">
                                <Calendar mode="single" selected={today} className="w-full" />
                            </CardContent>
                        </Card>

                        {/* Novo Evento Form */}
                        <Card className="border-none shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-lg">Agendar Rápido</CardTitle>
                                <CardDescription>Preencha os detalhes do seu novo compromisso</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form action={createEvent} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Título</Label>
                                        <Input id="title" name="title" placeholder="Ex: Reunião de equipe" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Descrição (Opcional)</Label>
                                        <Textarea id="description" name="description" placeholder="Detalhes adicionais sobre o compromisso" rows={2} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="date">Data</Label>
                                            <Input id="date" name="date" type="date" required className="block" defaultValue={todayFormatted} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="time">Horário</Label>
                                            <Input id="time" name="time" type="time" required className="block" defaultValue="09:00" />
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input type="checkbox" id="notification" name="notification" className="rounded border-gray-300" defaultChecked />
                                        <Label htmlFor="notification" className="text-sm flex items-center gap-1">
                                            <Bell className="h-4 w-4" /> Lembrete (30 min antes)
                                        </Label>
                                    </div>

                                    <Button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                                        <CalendarIcon className="h-4 w-4 mr-2" /> Agendar Compromisso
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* COLUNA DIREITA - AGENDA DO DIA & LINHA DO TEMPO & TAREFAS */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* 1. Agenda do Dia (Destaque) */}
                        <Card className="border-none shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg">Compromissos de Hoje</CardTitle>
                                        <CardDescription>{todaysEvents.length} eventos agendados</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {todaysEvents.length === 0 ? (
                                    <div className="text-center py-8">
                                        <CalendarIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                        <p className="text-gray-500 dark:text-gray-400">Nenhum evento para hoje</p>
                                    </div>
                                ) : (
                                    todaysEvents.map(event => (
                                        <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                            <div className="flex-shrink-0 w-12 text-center pt-1">
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(event.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{event.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {event.project && (
                                                        <Badge variant="secondary" className="text-xs" style={{ 
                                                            borderColor: event.project.color || '#6366f1',
                                                            backgroundColor: `${event.project.color}20` || '#6366f120'
                                                        }}>
                                                            {event.project.title}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <EventDeleteButton eventId={event.id} eventTitle={event.title} />
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* 2. Próxima Linha do Tempo e Tarefas (Tabs) */}
                        <Card className="border-none shadow-lg">
                            <CardContent className="p-0">
                                <Tabs defaultValue="events" className="w-full">
                                    <TabsList className="grid grid-cols-2 w-full rounded-t-lg">
                                        <TabsTrigger value="events" className="rounded-tl-lg">
                                            <CalendarIcon className="h-4 w-4 mr-2" /> Próximos Eventos
                                        </TabsTrigger>
                                        <TabsTrigger value="tasks" className="rounded-tr-lg">
                                            <CheckSquare className="h-4 w-4 mr-2" /> Foco do Dia
                                        </TabsTrigger>
                                    </TabsList>
                                    
                                    {/* Tab 1: Linha do Tempo Agrupada */}
                                    <TabsContent value="events" className="p-6 space-y-6">
                                        {sortedGroupKeys.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                Nenhum evento futuro agendado
                                            </div>
                                        ) : (
                                            sortedGroupKeys.map(dateKey => (
                                                <div key={dateKey} className="space-y-3">
                                                    <h3 className="font-semibold text-indigo-600 dark:text-indigo-400 text-sm uppercase border-b border-dashed pb-1">
                                                        {dateKey}
                                                    </h3>
                                                    {groupedEvents[dateKey].map(event => (
                                                        <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                            <div className="flex-shrink-0 w-12 text-center pt-1">
                                                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                    {new Date(event.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium truncate">{event.title}</p>
                                                                {event.project && (
                                                                    <Badge variant="secondary" className="text-xs mt-1" style={{ 
                                                                        borderColor: event.project.color || '#6366f1',
                                                                        backgroundColor: `${event.project.color}20` || '#6366f120'
                                                                    }}>
                                                                        {event.project.title}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <EventDeleteButton eventId={event.id} eventTitle={event.title} />
                                                        </div>
                                                    ))}
                                                </div>
                                            ))
                                        )}
                                    </TabsContent>
                                    
                                    {/* Tab 2: Tarefas Pendentes */}
                                    <TabsContent value="tasks" className="p-6 space-y-4">
                                        {pendingTasks.length === 0 ? (
                                            <div className="text-center py-8 text-green-600 dark:text-green-400 border border-dashed rounded-lg">
                                                <CheckCircle2 className="h-12 w-12 mx-auto mb-4" />
                                                <p>Nenhuma tarefa pendente! Bom trabalho!</p>
                                            </div>
                                        ) : (
                                            pendingTasks.map(task => (
                                                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                    <form action={toggleTaskDone.bind(null, task.id)}>
                                                        <Button type="submit" size="icon" variant="ghost" className="h-6 w-6 rounded-full p-0">
                                                            {task.isDone ? (
                                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                            ) : (
                                                                <Circle className="h-5 w-5 text-gray-400 hover:text-green-500" />
                                                            )}
                                                        </Button>
                                                    </form>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{task.title}</p>
                                                        {task.dueDate && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                Vence em {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {task.project && (
                                                        <Badge variant="secondary" className="text-xs flex items-center gap-1" style={{ 
                                                            borderColor: task.project.color || '#6366f1',
                                                            backgroundColor: `${task.project.color}20` || '#6366f120'
                                                        }}>
                                                            <Folder className="h-3 w-3" /> {task.project.title}
                                                        </Badge>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                        <Button variant="outline" className="w-full mt-4" asChild>
                                            <Link href="/projects">
                                                Gerenciar todas as tarefas <ChevronRight className="h-4 w-4 ml-2" />
                                            </Link>
                                        </Button>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                        
                        {/* 3. Estatísticas Rápidas (Mantido, mas estilizado) */}
                        <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                            <CardContent className="p-6">
                                <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Resumo da Produtividade</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{events.length}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Próximos Eventos</p>
                                    </div>
                                    <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{pendingTasks.length}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Tarefas Pendentes</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </div>
    );
}