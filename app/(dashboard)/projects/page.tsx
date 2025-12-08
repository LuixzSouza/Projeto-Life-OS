import { prisma } from "@/lib/prisma";
import { createProject, createTask } from "./actions";
import { TaskItem } from "@/components/projects/task-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Folder, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ProjectsPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  // 1. Busca todos os projetos
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
  
  // 2. Identifica qual projeto está selecionado (ou se é Inbox)
  // Nota: No Next.js App Router, searchParams é uma Promise em versões futuras, 
  // mas na atual funciona direto. Se der erro de tipo, usaremos 'any' temporário no props.
  const params = await searchParams;
  const selectedProjectId = params?.id || "inbox"
  
  
  // 3. Busca as tarefas baseadas na seleção
  const tasks = await prisma.task.findMany({
    where: {
      projectId: selectedProjectId === "inbox" ? null : selectedProjectId
    },
    orderBy: { createdAt: 'desc' }
  });

  // Descobrir o nome do projeto atual
  const currentProjectName = selectedProjectId === "inbox" 
    ? "Inbox (Tarefas Avulsas)" 
    : projects.find(p => p.id === selectedProjectId)?.title || "Projeto";

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-8rem)]">
      
      {/* COLUNA ESQUERDA: LISTA DE PROJETOS */}
      <aside className="w-full md:w-64 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" /> Projetos
          </h2>
          
          {/* Modal Criar Projeto */}
          <Dialog>
            <DialogTrigger asChild>
                <Button size="icon" variant="ghost"><Plus className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
                <form action={createProject} className="space-y-4">
                    <Input name="title" placeholder="Nome do Projeto" required />
                    <Input name="description" placeholder="Descrição curta (opcional)" />
                    <Button type="submit" className="w-full">Criar Projeto</Button>
                </form>
            </DialogContent>
          </Dialog>
        </div>

        <nav className="space-y-1 overflow-y-auto pr-2">
            {/* Link para Inbox */}
            <a href="/projects?id=inbox">
                <Button variant={selectedProjectId === "inbox" ? "secondary" : "ghost"} className="w-full justify-start">
                    <Folder className="mr-2 h-4 w-4 text-zinc-400" /> Inbox
                </Button>
            </a>

            {/* Lista de Projetos do Banco */}
            {projects.map(project => (
                <a key={project.id} href={`/projects?id=${project.id}`}>
                    <Button 
                        variant={selectedProjectId === project.id ? "secondary" : "ghost"} 
                        className="w-full justify-start truncate"
                    >
                        <span className="mr-2 h-2 w-2 rounded-full bg-blue-500" />
                        {project.title}
                    </Button>
                </a>
            ))}
        </nav>
      </aside>

      {/* COLUNA DIREITA: TAREFAS */}
      <main className="flex-1 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col shadow-sm">
            <CardHeader className="border-b py-4">
                <CardTitle className="text-xl flex items-center justify-between">
                    {currentProjectName}
                    <span className="text-sm font-normal text-zinc-500">{tasks.length} tarefas</span>
                </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-0 bg-zinc-50/30 dark:bg-zinc-900/10">
                {/* Lista de Tarefas */}
                <div className="p-4 space-y-2">
                    {tasks.length === 0 ? (
                        <div className="text-center py-10 text-zinc-500">
                            <p>Tudo limpo por aqui! 🎉</p>
                            <p className="text-xs">Adicione uma tarefa abaixo.</p>
                        </div>
                    ) : (
                        tasks.map(task => <TaskItem key={task.id} task={task} />)
                    )}
                </div>
            </CardContent>

            {/* Input para Adicionar Tarefa Rápida */}
            <div className="p-4 border-t bg-white dark:bg-zinc-950 rounded-b-lg">
                <form action={createTask} className="flex gap-2">
                    <input type="hidden" name="projectId" value={selectedProjectId} />
                    <Input name="title" placeholder={`Adicionar tarefa em ${currentProjectName}...`} className="flex-1" autoComplete="off" />
                    <Button type="submit">Adicionar</Button>
                </form>
            </div>
        </Card>
      </main>
    </div>
  );
}