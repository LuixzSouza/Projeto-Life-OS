import { prisma } from "@/lib/prisma";
import { createEvent, deleteEvent } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Clock, CheckSquare, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar"; // Componente do Shadcn

export default async function AgendaPage() {
  // 1. Buscar Eventos Futuros (Ordenados)
  const events = await prisma.event.findMany({
    where: { startTime: { gte: new Date() } }, // Apenas futuros ou hoje
    orderBy: { startTime: 'asc' },
    take: 10
  });

  // 2. Buscar Tarefas Pendentes (Do módulo de Projetos)
  // Vamos mostrar apenas as que não foram feitas para ajudar no foco
  const pendingTasks = await prisma.task.findMany({
    where: { isDone: false },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="flex flex-col md:flex-row gap-8 min-h-[calc(100vh-8rem)]">
      
      {/* LADO ESQUERDO: CALENDÁRIO & NOVO EVENTO */}
      <div className="w-full md:w-80 space-y-6">
        <Card>
            <CardContent className="p-4 flex justify-center">
                {/* Calendário Visual (Apenas visual por enquanto) */}
                <Calendar 
                    mode="single"
                    selected={new Date()}
                    className="rounded-md border shadow-sm"
                />
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle className="text-base">Novo Compromisso</CardTitle></CardHeader>
            <CardContent>
                <form action={createEvent} className="space-y-3">
                    <Input name="title" placeholder="Ex: Dentista" required />
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <span className="text-xs text-zinc-500">Data</span>
                            <Input name="date" type="date" required className="block" />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-zinc-500">Hora</span>
                            <Input name="time" type="time" required className="block" />
                        </div>
                    </div>
                    
                    <Button type="submit" className="w-full">Agendar</Button>
                </form>
            </CardContent>
        </Card>
      </div>

      {/* LADO DIREITO: LINHA DO TEMPO */}
      <div className="flex-1 space-y-6">
        
        {/* Seção 1: Agenda Cronológica */}
        <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-indigo-500" /> Próximos Eventos
            </h2>
            
            <div className="grid gap-3">
                {events.length === 0 ? (
                    <p className="text-zinc-500 text-sm">Agenda livre nos próximos dias.</p>
                ) : events.map(event => (
                    <div key={event.id} className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-lg border border-l-4 border-l-indigo-500 shadow-sm">
                        <div className="text-center min-w-[3rem]">
                            <p className="text-xs font-bold text-zinc-500 uppercase">
                                {new Date(event.startTime).toLocaleDateString('pt-BR', { month: 'short' })}
                            </p>
                            <p className="text-xl font-bold leading-none">
                                {new Date(event.startTime).getDate()}
                            </p>
                        </div>
                        
                        <div className="flex-1 border-l pl-4 border-zinc-100 dark:border-zinc-800">
                            <p className="font-semibold">{event.title}</p>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                                <Clock className="h-3 w-3" />
                                {new Date(event.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>

                        {/* Botão de Excluir (Formulário pequeno para server action) */}
                        <form action={deleteEvent.bind(null, event.id)}>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-500">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                ))}
            </div>
        </div>

        {/* Seção 2: Backlog de Tarefas (Integração com Projetos) */}
        <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 mt-8">
                <CheckSquare className="h-5 w-5 text-green-500" /> Tarefas Pendentes
            </h2>
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4 border space-y-2">
                {pendingTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-2 bg-background rounded border">
                        <span className="text-sm">{task.title}</span>
                        <span className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500">
                            Projeto
                        </span>
                    </div>
                ))}
                {pendingTasks.length === 0 && <p className="text-sm text-zinc-500">Nenhuma tarefa pendente.</p>}
                
                <a href="/projects" className="block text-center text-xs text-blue-500 hover:underline mt-2">
                    Gerenciar tarefas em Projetos &rarr;
                </a>
            </div>
        </div>

      </div>
    </div>
  );
}