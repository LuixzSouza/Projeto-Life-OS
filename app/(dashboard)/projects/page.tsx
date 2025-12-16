import { prisma } from "@/lib/prisma";
import { TaskInput } from "@/components/projects/task-input";
import { TaskItem } from "@/components/projects/task-item";
import { JobTracker } from "@/components/projects/job-tracker";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
    Layers, 
    Briefcase, 
    Search,
    List, 
    AlignJustify,
    CheckCircle2,
    LayoutTemplate
} from "lucide-react";
import { Prisma } from "@prisma/client"; 

// Tipagem
interface ProjectsPageProps {
    searchParams: Promise<{ id?: string; q?: string; tab?: string; view?: 'list' | 'compact'; filter?: string; }>;
}

const generateFilterUrl = (selectedProjectId: string, newFilter: string, viewMode: string) => {
    const url = new URLSearchParams({ id: selectedProjectId, view: viewMode });
    if (newFilter !== 'all') url.set('filter', newFilter);
    return `/projects?${url.toString()}`;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
    const params = await searchParams;
    const selectedProjectId = params?.id || "inbox";
    const searchQuery = params?.q || "";
    const currentTab = params?.tab || "projects";
    const viewMode = (params?.view as 'list' | 'compact') || 'list'; 
    const currentFilter = params?.filter || 'all';

    // 1. Busca de Projetos
    const projects = await prisma.project.findMany({ 
        orderBy: { createdAt: 'desc' },
        include: { 
            tasks: { select: { id: true, isDone: true } } 
        } 
    });
    
    // 2. Filtros de Tarefa
    const whereClause: Prisma.TaskWhereInput = {
        projectId: selectedProjectId === "inbox" ? null : selectedProjectId,
        ...(searchQuery && { title: { contains: searchQuery } }),
        ...(currentFilter === 'active' && { isDone: false }),
        ...(currentFilter === 'completed' && { isDone: true }),
        ...(currentFilter === 'high' && { priority: 'HIGH', isDone: false }),
    };

    const tasks = await prisma.task.findMany({
        where: whereClause,
        orderBy: [
            { isDone: 'asc' },
            { priority: 'desc' },
            { createdAt: 'desc' }
        ]
    });

    // 3. Dados do Projeto Atual
    const currentProject = selectedProjectId === "inbox" ? null : projects.find(p => p.id === selectedProjectId);
    const projectTitle = currentProject?.title || "Inbox";
    const projectDesc = currentProject?.description || "Tarefas rápidas e não categorizadas.";

    // 4. Estatísticas
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.isDone).length;
    const pendingTasks = totalTasks - completedTasks;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const jobs = await prisma.jobApplication.findMany({
        orderBy: { appliedDate: 'desc' }
    });
    
    return (
        <div className="flex flex-col p-4 md:p-6 gap-4 bg-muted/20 min-h-[calc(100vh-4rem)] overflow-hidden animate-in fade-in duration-500">
            
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                   <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                     <LayoutTemplate className="h-6 w-6 text-primary" /> Gestão de Trabalho
                   </h1>
                </div>
            </header>

            <Tabs defaultValue={currentTab} className="flex-1 flex flex-col w-full min-h-0">
                
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <TabsList className="bg-muted p-1">
                        <TabsTrigger value="projects" className="gap-2 text-xs md:text-sm">
                            <Layers className="h-4 w-4" /> Projetos
                        </TabsTrigger>
                        <TabsTrigger value="jobs" className="gap-2 text-xs md:text-sm">
                            <Briefcase className="h-4 w-4" /> Vagas 
                            <Badge variant="secondary" className="ml-1 px-1.5 h-5 bg-background text-foreground border-border">{jobs.length}</Badge>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="projects" className="flex-1 mt-0 flex flex-col min-h-0 data-[state=inactive]:hidden border-0 p-0">
                    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
                        
                        {/* SIDEBAR DE PROJETOS */}
                        <ProjectSidebar projects={projects} selectedProjectId={selectedProjectId} />

                        {/* PAINEL PRINCIPAL */}
                        <main className="flex-1 flex flex-col w-full bg-card rounded-xl border border-border shadow-sm overflow-hidden h-full">
                            
                            {/* Header do Projeto */}
                            <div className="p-6 border-b border-border bg-muted/10 shrink-0">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                                    <div className="min-w-0">
                                        <h2 className="text-2xl font-bold text-foreground tracking-tight truncate">{projectTitle}</h2>
                                        <p className="text-sm text-muted-foreground mt-1 truncate">{projectDesc}</p>
                                    </div>
                                    
                                    <div className="flex gap-3 shrink-0">
                                        <div className="flex flex-col items-center justify-center px-4 py-2 bg-background rounded-xl border border-border shadow-sm min-w-[80px]">
                                            <span className="font-bold text-lg text-foreground">{pendingTasks}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">A Fazer</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center px-4 py-2 bg-background rounded-xl border border-border shadow-sm min-w-[80px]">
                                            <span className="font-bold text-lg text-emerald-600">{completedTasks}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Feitas</span>
                                        </div>
                                    </div>
                                </div>
                                <Progress value={progress} className="h-1 bg-muted" indicatorClassName="bg-primary" />
                            </div>

                            {/* Barra de Ferramentas (Filtros) */}
                            <div className="px-4 py-3 border-b border-border flex flex-col md:flex-row items-center gap-3 bg-card shrink-0 z-10">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <form className="w-full">
                                        <input type="hidden" name="id" value={selectedProjectId} />
                                        <Input 
                                            name="q" 
                                            defaultValue={searchQuery}
                                            placeholder="Buscar tarefa..." 
                                            className="pl-9 h-9 bg-muted/30 border-border focus:bg-background transition-colors w-full text-sm" 
                                        />
                                    </form>
                                </div>

                                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                                    <div className="flex gap-1">
                                        {[{key: 'all', label: 'Tudo'}, {key: 'active', label: 'A Fazer'}, {key: 'completed', label: 'Feito'}, {key: 'high', label: 'Alta'}].map(f => (
                                            <a key={f.key} href={generateFilterUrl(selectedProjectId, f.key, viewMode)}>
                                                <Button 
                                                    size="sm" 
                                                    variant={currentFilter === f.key ? 'default' : 'outline'}
                                                    className={`h-8 px-3 rounded-lg text-xs ${currentFilter === f.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground border-border bg-background hover:bg-muted'}`}
                                                >
                                                    {f.label}
                                                </Button>
                                            </a>
                                        ))}
                                    </div>
                                    <div className="h-5 w-px bg-border mx-1 shrink-0" />
                                    <div className="flex bg-muted p-0.5 rounded-lg shrink-0">
                                        <a href={generateFilterUrl(selectedProjectId, currentFilter, 'list')}>
                                            <Button size="icon" variant="ghost" className={`h-7 w-7 rounded-md ${viewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                                                <List className="h-4 w-4" />
                                            </Button>
                                        </a>
                                        <a href={generateFilterUrl(selectedProjectId, currentFilter, 'compact')}>
                                            <Button size="icon" variant="ghost" className={`h-7 w-7 rounded-md ${viewMode === 'compact' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                                                <AlignJustify className="h-4 w-4" />
                                            </Button>
                                        </a>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Lista de Tarefas */}
                            <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent bg-muted/5 min-h-0">
                                {tasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground px-4 text-center h-full">
                                        <div className="bg-muted/50 p-6 rounded-full mb-4 ring-1 ring-border">
                                            {searchQuery ? <Search className="h-8 w-8 opacity-50" /> : <CheckCircle2 className="h-8 w-8 text-emerald-500/50" />}
                                        </div>
                                        <p className="font-medium text-lg">
                                            {searchQuery ? "Nenhuma tarefa encontrada." : "Tudo limpo por aqui!"}
                                        </p>
                                        {!searchQuery && <p className="text-sm mt-1 opacity-70">Adicione uma tarefa abaixo para começar.</p>}
                                    </div>
                                ) : (
                                    <div className={`p-4 ${viewMode === 'compact' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'flex flex-col gap-0'}`}>
                                        {tasks.map(task => (
                                            <TaskItem key={task.id} task={task} viewMode={viewMode} />
                                        ))}
                                    </div>
                                )}
                            </CardContent>

                            {/* Input Fixo */}
                            <div className="shrink-0 p-4 border-t border-border bg-card z-20">
                                <TaskInput projectId={selectedProjectId} />
                            </div>
                            
                        </main>
                    </div>
                </TabsContent>

                <TabsContent value="jobs" className="flex-1 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden border-0 p-0">
                     <div className="flex-1 overflow-y-auto p-1 scrollbar-thin">
                        <JobTracker jobs={jobs} />
                     </div>
                </TabsContent>

            </Tabs>
        </div>
    );
}