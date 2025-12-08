import { prisma } from "@/lib/prisma";
import { createProject } from "./actions";
import { TaskItem } from "@/components/projects/task-item";
import { JobTracker } from "@/components/projects/job-tracker";
import { ProjectItem } from "@/components/projects/project-item"; // <--- NOVO ITEM
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Folder, Layers, Briefcase } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { TaskInput } from "@/components/projects/task-input";

interface ProjectsPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  // 1. Busca PROJETOS (INCLUINDO TAREFAS PARA CONTAGEM E DELEÇÃO SEGURA)
  const projects = await prisma.project.findMany({ 
    orderBy: { createdAt: 'desc' },
    include: { tasks: true } // <-- Adicionado o include aqui
  });
  
  // 2. Resolve Params e Busca TAREFAS (da mesma forma)
  const params = await searchParams;
  const selectedProjectId = params?.id || "inbox";
  
  const tasks = await prisma.task.findMany({
    where: {
      projectId: selectedProjectId === "inbox" ? null : selectedProjectId
    },
    orderBy: [
        { isDone: 'asc' }, 
        { priority: 'desc' },
        { createdAt: 'desc' }
    ]
  });

  const currentProjectName = selectedProjectId === "inbox" 
    ? "Inbox (Tarefas Avulsas)" 
    : projects.find(p => p.id === selectedProjectId)?.title || "Projeto";

  // 3. Busca VAGAS
  const jobs = await prisma.jobApplication.findMany({
    orderBy: { appliedDate: 'desc' }
  });

  // Cálculo de Progresso
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.isDone).length;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="h-[calc(100vh-8rem)]">
      
      <Tabs defaultValue="projects" className="h-full flex flex-col">
        {/* ... (TabsList e Header mantidos) ... */}
        <div className="flex items-center justify-between mb-6">
            <TabsList>
                <TabsTrigger value="projects" className="gap-2"><Layers className="h-4 w-4" /> Projetos</TabsTrigger>
                <TabsTrigger value="jobs" className="gap-2"><Briefcase className="h-4 w-4" /> Vagas</TabsTrigger>
            </TabsList>
        </div>

        {/* ABA PROJETOS */}
        <TabsContent value="projects" className="flex-1 mt-0">
            <div className="flex flex-col md:flex-row gap-6 h-full">
                
                {/* SIDEBAR PROJETOS - USANDO O NOVO COMPONENTE */}
                <aside className="w-full md:w-64 flex flex-col gap-4 shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-lg text-zinc-600 dark:text-zinc-400">Projetos</h2>
                        <Dialog>
                            <DialogTrigger asChild><Button size="icon" variant="ghost"><Plus className="h-4 w-4" /></Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
                                <form action={createProject} className="space-y-4">
                                    <Input name="title" placeholder="Nome do Projeto" required />
                                    <Input name="description" placeholder="Descrição curta" />
                                    <Button type="submit" className="w-full">Criar Projeto</Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <nav className="space-y-1 overflow-y-auto pr-2 flex-1">
                        <a href="/projects?id=inbox">
                            <Button variant={selectedProjectId === "inbox" ? "secondary" : "ghost"} className="w-full justify-start">
                                <Folder className="mr-2 h-4 w-4 text-zinc-400" /> Inbox
                            </Button>
                        </a>
                        {/* LISTA DE PROJETOS USANDO O NOVO ITEM */}
                        {projects.map(project => (
                            <ProjectItem 
                                key={project.id} 
                                project={project} 
                                selectedProjectId={selectedProjectId} 
                            />
                        ))}
                    </nav>
                </aside>

                {/* ... (LISTA DE TAREFAS mantida igual) ... */}
                <main className="flex-1 flex flex-col min-h-0">
                    <Card className="flex-1 flex flex-col shadow-sm overflow-hidden bg-white dark:bg-zinc-950">
                        {/* Header do Projeto com Progresso */}
                        <CardHeader className="border-b py-4 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <div className="flex items-center justify-between mb-2">
                                <CardTitle className="text-xl">{currentProjectName}</CardTitle>
                                <span className="text-xs font-mono text-zinc-500">{completedTasks}/{totalTasks}</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </CardHeader>
                        
                        <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin">
                            <div className="p-4 space-y-2">
                                {tasks.length === 0 ? (
                                    <div className="text-center py-20 text-zinc-400 flex flex-col items-center">
                                        <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-full mb-3">
                                            <Folder className="h-8 w-8 text-zinc-300" />
                                        </div>
                                        <p>Nenhuma tarefa aqui.</p>
                                        <p className="text-xs">Comece adicionando uma abaixo.</p>
                                    </div>
                                ) : (
                                    tasks.map(task => <TaskItem key={task.id} task={task} />)
                                )}
                            </div>
                        </CardContent>

                        {/* INPUT RÁPIDO */}
                        <TaskInput projectId={selectedProjectId} />
                        
                    </Card>
                </main>
            </div>
        </TabsContent>

        {/* ABA VAGAS */}
        <TabsContent value="jobs" className="flex-1 mt-0 overflow-y-auto">
            <JobTracker jobs={jobs} />
        </TabsContent>

      </Tabs>
    </div>
  );
}