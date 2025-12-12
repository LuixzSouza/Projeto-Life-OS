import { prisma } from "@/lib/prisma";
import { createProject } from "./actions";
import { TaskItem } from "@/components/projects/task-item";
import { JobTracker } from "@/components/projects/job-tracker";
import { ProjectItem } from "@/components/projects/project-item";
import { TaskInput } from "@/components/projects/task-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Folder, 
  Layers, 
  Briefcase, 
  CheckCircle2, 
  Search,
  LayoutTemplate
} from "lucide-react";
import { Prisma } from "@prisma/client";

// Tipagem correta inferida
const projectWithTasks = Prisma.validator<Prisma.ProjectDefaultArgs>()({
  include: { 
    tasks: { select: { id: true, isDone: true } }
  }
});
type ProjectWithTasks = Prisma.ProjectGetPayload<typeof projectWithTasks>;

interface ProjectsPageProps {
  searchParams: Promise<{ id?: string; q?: string; tab?: string }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const selectedProjectId = params?.id || "inbox";
  const searchQuery = params?.q || "";
  const currentTab = params?.tab || "projects";

  // Busca de Projetos
  const projects = await prisma.project.findMany({ 
    orderBy: { createdAt: 'desc' },
    include: { 
      tasks: {
        select: { id: true, isDone: true }
      } 
    } 
  });
  
  // Busca de Tarefas
  const whereClause: Prisma.TaskWhereInput = {
    projectId: selectedProjectId === "inbox" ? null : selectedProjectId,
    title: { contains: searchQuery }
  };

  const tasks = await prisma.task.findMany({
    where: whereClause,
    orderBy: [
        { isDone: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
    ]
  });

  const currentProject = selectedProjectId === "inbox" 
    ? null 
    : projects.find(p => p.id === selectedProjectId);

  const projectTitle = currentProject?.title || "Inbox";
  const projectDesc = currentProject?.description || "Tarefas rápidas e não categorizadas.";

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.isDone).length;
  const pendingTasks = totalTasks - completedTasks;
  const highPriorityTasks = tasks.filter(t => t.priority === "HIGH" && !t.isDone).length;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const jobs = await prisma.jobApplication.findMany({
    orderBy: { appliedDate: 'desc' }
  });

  return (
    // FIX 1: Layout Responsivo Híbrido
    // - Telas pequenas: min-h-screen, o conteúdo flui e a página rola.
    // - Telas médias+: h fixo e overflow-hidden, painéis internos rolam.
    <div className="flex flex-col p-4 md:p-6 gap-4 md:gap-6 bg-zinc-50/50 dark:bg-black min-h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] md:overflow-hidden transition-all">
      
      {/* Header Fixo */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
           <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
             <LayoutTemplate className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" /> Gestão de Trabalho
           </h1>
           <p className="text-zinc-500 text-sm mt-1 hidden md:block">Gerencie seus projetos e candidaturas em um só lugar.</p>
        </div>
      </header>

      {/* Tabs Container */}
      {/* FIX 2: Em telas pequenas, não forçamos flex-1 para não esticar demais se houver pouco conteúdo */}
      <Tabs defaultValue={currentTab} className="md:flex-1 flex flex-col md:min-h-0 w-full">
        
        <div className="flex items-center justify-between mb-4 shrink-0 overflow-x-auto pb-1">
            <TabsList className="bg-zinc-100 dark:bg-zinc-900 h-9 md:h-10 p-1 w-full md:w-auto flex">
                <TabsTrigger value="projects" className="flex-1 md:flex-none gap-2 px-4 text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 shadow-sm">
                    <Layers className="h-3.5 w-3.5 md:h-4 md:w-4" /> Projetos
                </TabsTrigger>
                <TabsTrigger value="jobs" className="flex-1 md:flex-none gap-2 px-4 text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 shadow-sm">
                    <Briefcase className="h-3.5 w-3.5 md:h-4 md:w-4" /> Vagas <Badge variant="secondary" className="ml-1.5 h-4 md:h-5 px-1 md:px-1.5 text-[9px] md:text-[10px] bg-zinc-200 dark:bg-zinc-700">{jobs.length}</Badge>
                </TabsTrigger>
            </TabsList>
        </div>

        {/* --- ABA PROJETOS --- */}
        {/* FIX 3: Estrutura flexível para mobile/desktop */}
        <TabsContent value="projects" className="md:flex-1 mt-0 flex flex-col md:min-h-0 data-[state=inactive]:hidden border-0 p-0 space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-full md:min-h-0">
                
                {/* SIDEBAR */}
                {/* FIX 4: Sidebar com altura máxima em mobile para não dominar a tela */}
                <aside className="w-full md:w-64 flex flex-col gap-3 shrink-0 overflow-hidden border rounded-xl p-3 md:border-0 md:p-0 bg-white md:bg-transparent dark:bg-zinc-900 md:dark:bg-transparent max-h-[250px] md:max-h-none md:h-full">
                    <div className="flex items-center justify-between px-1 shrink-0">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Projetos</span>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Criar Novo Projeto</DialogTitle>
                                </DialogHeader>
                                <form action={createProject} className="space-y-4 pt-4">
                                    <Input name="title" placeholder="Nome do Projeto (ex: Redesign Site)" required />
                                    <Input name="description" placeholder="Descrição curta do objetivo" />
                                    <div className="flex justify-end gap-2">
                                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Criar Projeto</Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <nav className="space-y-1 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 min-h-0">
                        <a href="/projects?id=inbox" className="block mb-2">
                            <Button 
                                variant={selectedProjectId === "inbox" ? "secondary" : "ghost"} 
                                className="w-full justify-start font-medium h-9"
                            >
                                <Folder className="mr-2 h-4 w-4 text-blue-500" /> Inbox
                            </Button>
                        </a>
                        
                        <Separator className="my-2 bg-zinc-200 dark:bg-zinc-800" />
                        
                        <div className="space-y-0.5">
                            {projects.map((project) => {
                                const pendingCount = project.tasks.filter(t => !t.isDone).length;
                                return (
                                    <ProjectItem 
                                        key={project.id} 
                                        project={project} 
                                        selectedProjectId={selectedProjectId} 
                                        pendingCount={pendingCount}
                                    />
                                )
                            })}
                        </div>
                    </nav>
                </aside>

                {/* PAINEL PRINCIPAL (Tarefas) */}
                {/* FIX 5: Altura mínima em mobile para garantir que o painel seja utilizável */}
                <main className="flex-1 flex flex-col bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden ring-1 ring-black/5 min-h-[500px] md:min-h-0 md:h-full">
                    
                    {/* Header do Projeto */}
                    <div className="p-4 md:p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-sm shrink-0">
                        <div className="flex flex-col gap-4 mb-5">
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight line-clamp-1">{projectTitle}</h2>
                                <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{projectDesc}</p>
                            </div>
                            
                            {/* Métricas Responsivas - Grid no mobile, Flex no desktop */}
                            <div className="grid grid-cols-2 md:flex gap-2 md:gap-3 text-sm">
                                <div className="flex flex-col items-center justify-center px-3 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm md:min-w-[90px]">
                                    <span className="font-bold text-lg text-zinc-900 dark:text-white">{pendingTasks}</span>
                                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">A Fazer</span>
                                </div>
                                <div className="flex flex-col items-center justify-center px-3 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm md:min-w-[90px]">
                                    <span className="font-bold text-lg text-emerald-600">{completedTasks}</span>
                                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Feitas</span>
                                </div>
                                {highPriorityTasks > 0 && (
                                    <div className="flex flex-col items-center justify-center px-3 py-2 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900/50 shadow-sm md:min-w-[90px] col-span-2 md:col-span-1">
                                        <span className="font-bold text-lg text-red-600">{highPriorityTasks}</span>
                                        <span className="text-[10px] text-red-400 uppercase font-bold tracking-wider">Urgentes</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Progress value={progress} className="h-1.5 bg-zinc-200 dark:bg-zinc-800" indicatorClassName="bg-indigo-600" />
                        </div>
                    </div>

                    {/* Barra de Busca */}
                    <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 bg-white dark:bg-zinc-950 shrink-0 z-10 sticky top-0 md:static">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <form className="w-full">
                                <input type="hidden" name="id" value={selectedProjectId} />
                                <Input 
                                    name="q" 
                                    defaultValue={searchQuery}
                                    placeholder="Filtrar tarefas..." 
                                    className="pl-9 h-9 md:h-10 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-900 transition-colors w-full text-sm" 
                                />
                            </form>
                        </div>
                    </div>
                    
                    {/* Lista de Tarefas */}
                    <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 min-h-0">
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-800 pb-4">
                            {tasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 md:py-24 text-zinc-400 px-4 text-center">
                                    <div className="bg-zinc-50 dark:bg-zinc-900 p-4 md:p-6 rounded-full mb-4">
                                        {searchQuery ? <Search className="h-8 w-8 md:h-10 md:w-10 text-zinc-300" /> : <CheckCircle2 className="h-8 w-8 md:h-10 md:w-10 text-emerald-500/20 text-emerald-500" />}
                                    </div>
                                    <p className="font-medium text-zinc-600 dark:text-zinc-400 text-base md:text-lg">
                                        {searchQuery ? "Nenhuma tarefa encontrada." : "Tudo limpo por aqui!"}
                                    </p>
                                    {!searchQuery && <p className="text-xs md:text-sm mt-1 text-zinc-500">Adicione uma tarefa abaixo para começar.</p>}
                                </div>
                            ) : (
                                tasks.map(task => (
                                    <TaskItem key={task.id} task={task} />
                                ))
                            )}
                        </div>
                    </CardContent>

                    {/* Input Fixo no Rodapé */}
                    <div className="p-3 md:p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30 shrink-0 sticky bottom-0 md:static bg-white/80 dark:bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                        <TaskInput projectId={selectedProjectId} />
                    </div>
                    
                </main>
            </div>
        </TabsContent>

        {/* --- ABA VAGAS --- */}
        <TabsContent value="jobs" className="md:flex-1 mt-0 overflow-hidden flex flex-col md:min-h-0 data-[state=inactive]:hidden border-0 p-0 h-[500px] md:h-auto">
             <div className="flex-1 overflow-y-auto p-1 scrollbar-thin">
                <JobTracker jobs={jobs} />
             </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}