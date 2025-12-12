import { prisma } from "@/lib/prisma";
import { createProject } from "./actions";
import { TaskItem } from "@/components/projects/task-item";
import { JobTracker } from "@/components/projects/job-tracker";
import { ProjectItem } from "@/components/projects/project-item";
import { TaskInput } from "@/components/projects/task-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Importante: Adicione este import
import { CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
    LayoutTemplate,
    List, 
    AlignJustify,
    Palette,   // Novos ícones
    Type,
    FileText,
    Sparkles
} from "lucide-react";
import { Prisma, Task } from "@prisma/client"; 

// 1. Tipagem Simplificada
interface ProjectSummary {
    id: string;
    title: string;
    description: string | null;
    tasks: { id: string; isDone: boolean; }[]; 
}

// 2. Tipo Completo da Tarefa
type TaskWithAllFields = Task; 

interface ProjectsPageProps {
    searchParams: Promise<{ id?: string; q?: string; tab?: string; view?: 'list' | 'compact'; filter?: string; }>;
}

// Helper URL
const generateFilterUrl = (selectedProjectId: string, newFilter: string, viewMode: string) => {
    const url = new URLSearchParams({ id: selectedProjectId, view: viewMode });
    if (newFilter !== 'all') url.set('filter', newFilter);
    return `/projects?${url.toString()}`;
}

// Cores disponíveis para o projeto (Tailwind classes para visualização)
const PROJECT_COLORS = [
    { name: "Indigo", value: "#6366f1", class: "bg-indigo-500" },
    { name: "Blue", value: "#3b82f6", class: "bg-blue-500" },
    { name: "Emerald", value: "#10b981", class: "bg-emerald-500" },
    { name: "Amber", value: "#f59e0b", class: "bg-amber-500" },
    { name: "Rose", value: "#f43f5e", class: "bg-rose-500" },
    { name: "Violet", value: "#8b5cf6", class: "bg-violet-500" },
];

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
    }) as unknown as ProjectSummary[]; 
    
    // 2. BUSCA DE TAREFAS
    const baseFilter: Prisma.TaskWhereInput = {
        projectId: selectedProjectId === "inbox" ? null : selectedProjectId,
    };
    
    const searchFilter: Prisma.TaskWhereInput = searchQuery 
        ? { title: { contains: searchQuery } }
        : {};
    
    const statusFilter: Prisma.TaskWhereInput = {}; 
    
    if (currentFilter === 'active') {
        statusFilter.isDone = false;
    } else if (currentFilter === 'completed') {
        statusFilter.isDone = true;
    } else if (currentFilter === 'high') {
        statusFilter.priority = 'HIGH';
        statusFilter.isDone = false;
    }

    const finalWhere: Prisma.TaskWhereInput = {
        AND: [baseFilter, searchFilter, statusFilter].filter(f => Object.keys(f).length > 0)
    };

    const tasks: TaskWithAllFields[] = await prisma.task.findMany({
        where: finalWhere,
        orderBy: [
            { isDone: 'asc' },
            { priority: 'desc' },
            { createdAt: 'desc' }
        ]
    });

    const currentProject = selectedProjectId === "inbox" ? null : projects.find(project => project.id === selectedProjectId);
    const projectTitle = currentProject?.title || "Inbox";
    const projectDesc = currentProject?.description || "Tarefas rápidas e não categorizadas.";

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.isDone).length;
    const pendingTasks = totalTasks - completedTasks;
    const highPriorityTasks = tasks.filter(task => task.priority === "HIGH" && !task.isDone).length;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const jobs = await prisma.jobApplication.findMany({
        orderBy: { appliedDate: 'desc' }
    });
    
    return (
        <div className="flex flex-col p-4 md:p-6 gap-4 bg-zinc-50/50 dark:bg-black h-[calc(100vh-4rem)] overflow-hidden">
            
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                   <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                     <LayoutTemplate className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" /> Gestão de Trabalho
                   </h1>
                </div>
            </header>

            <Tabs defaultValue={currentTab} className="flex-1 flex flex-col w-full min-h-0">
                
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

                <TabsContent value="projects" className="flex-1 mt-0 flex flex-col min-h-0 data-[state=inactive]:hidden border-0 p-0">
                    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
                        
                        {/* --- SIDEBAR DE PROJETOS --- */}
                        <aside className="w-full lg:w-72 flex flex-col gap-4 shrink-0 h-full overflow-hidden">
                            <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4 h-full flex flex-col">
                                <div className="flex items-center justify-between px-1 mb-3 shrink-0">
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Projetos</span>
                                    
                                    {/* --- NOVO MODAL DE CRIAÇÃO --- */}
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-indigo-600">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden gap-0">
                                            
                                            {/* Cabeçalho Visual */}
                                            <div className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 p-6 flex flex-col items-center text-center">
                                                <div className="h-12 w-12 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-sm mb-3 border border-zinc-100 dark:border-zinc-700">
                                                    <Sparkles className="h-6 w-6 text-indigo-500" />
                                                </div>
                                                <DialogTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Novo Projeto</DialogTitle>
                                                <DialogDescription className="text-sm text-zinc-500 mt-1 max-w-[280px]">
                                                    Crie um espaço para organizar suas tarefas, ideias e metas.
                                                </DialogDescription>
                                            </div>

                                            <form action={createProject} className="p-6 space-y-5">
                                                
                                                {/* Nome do Projeto */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="title" className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                                        <Type className="h-3.5 w-3.5" /> Nome do Projeto
                                                    </Label>
                                                    <Input id="title" name="title" placeholder="Ex: Redesign do Site..." required className="bg-zinc-50/50 dark:bg-zinc-900/50" />
                                                </div>

                                                {/* Descrição */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="description" className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                                        <FileText className="h-3.5 w-3.5" /> Descrição Curta
                                                    </Label>
                                                    <Input id="description" name="description" placeholder="Objetivo principal..." className="bg-zinc-50/50 dark:bg-zinc-900/50" />
                                                </div>

                                                {/* Seletor de Cores Visual */}
                                                <div className="space-y-3">
                                                    <Label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                                        <Palette className="h-3.5 w-3.5" /> Cor do Marcador
                                                    </Label>
                                                    <div className="flex flex-wrap gap-3">
                                                        {PROJECT_COLORS.map((color) => (
                                                            <label key={color.value} className="relative cursor-pointer group">
                                                                <input 
                                                                    type="radio" 
                                                                    name="color" 
                                                                    value={color.value} 
                                                                    className="peer sr-only" 
                                                                    defaultChecked={color.name === "Indigo"}
                                                                />
                                                                <div className={`w-8 h-8 rounded-full ${color.class} border-2 border-transparent peer-checked:border-white peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-indigo-500 transition-all hover:scale-110 shadow-sm`}></div>
                                                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                                    {color.name}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                <DialogFooter className="pt-2">
                                                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]">
                                                        <Plus className="mr-2 h-4 w-4" /> Criar Projeto
                                                    </Button>
                                                </DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                    {/* --- FIM DO NOVO MODAL --- */}

                                </div>

                                <nav className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                                    <a href={generateFilterUrl(selectedProjectId, currentFilter, viewMode)} className="block mb-2">
                                        <Button variant={selectedProjectId === "inbox" ? "secondary" : "ghost"} className="w-full justify-start font-medium h-9">
                                            <Folder className="mr-2 h-4 w-4 text-blue-500" /> Inbox
                                        </Button>
                                    </a>
                                    <Separator className="my-2 bg-zinc-100 dark:bg-zinc-800" />
                                    <div className="space-y-0.5">
                                        {projects.map((project) => {
                                            const pendingCount = project.tasks.filter(task => !task.isDone).length;
                                            return (
                                                <ProjectItem key={project.id} project={project} selectedProjectId={selectedProjectId} pendingCount={pendingCount} />
                                            )
                                        })}
                                    </div>
                                </nav>
                            </div>
                        </aside>

                        {/* --- PAINEL PRINCIPAL (TAREFAS) --- */}
                        <main className="flex-1 flex flex-col w-full bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden h-full">
                            
                            {/* Header do Projeto */}
                            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                                    <div className="min-w-0">
                                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight truncate">{projectTitle}</h2>
                                        <p className="text-sm text-zinc-500 mt-1 truncate">{projectDesc}</p>
                                    </div>
                                    
                                    <div className="flex gap-3 shrink-0">
                                        <div className="flex flex-col items-center justify-center px-4 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm min-w-[80px]">
                                            <span className="font-bold text-lg text-zinc-900 dark:text-white">{pendingTasks}</span>
                                            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">A Fazer</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center px-4 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm min-w-[80px]">
                                            <span className="font-bold text-lg text-emerald-600">{completedTasks}</span>
                                            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Feitas</span>
                                        </div>
                                    </div>
                                </div>
                                <Progress value={progress} className="h-1 bg-zinc-200 dark:bg-zinc-800" indicatorClassName="bg-indigo-600" />
                            </div>

                            {/* Barra de Ferramentas (Sticky) */}
                            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row items-center gap-3 bg-white dark:bg-zinc-950 shrink-0 z-10">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                    <form className="w-full">
                                        <input type="hidden" name="id" value={selectedProjectId} />
                                        <Input 
                                            name="q" 
                                            defaultValue={searchQuery}
                                            placeholder="Buscar tarefa..." 
                                            className="pl-9 h-9 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-950 transition-colors w-full text-sm" 
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
                                                    className={`h-8 px-3 rounded-lg text-xs ${currentFilter === f.key ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'text-zinc-600 border-zinc-200 bg-white hover:bg-zinc-50'}`}
                                                >
                                                    {f.label}
                                                </Button>
                                            </a>
                                        ))}
                                    </div>
                                    <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0" />
                                    <div className="flex bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg shrink-0">
                                        <a href={generateFilterUrl(selectedProjectId, currentFilter, 'list')}>
                                            <Button size="icon" variant="ghost" className={`h-7 w-7 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-zinc-800 shadow-sm text-indigo-600' : 'text-zinc-400 hover:text-zinc-600'}`}>
                                                <List className="h-4 w-4" />
                                            </Button>
                                        </a>
                                        <a href={generateFilterUrl(selectedProjectId, currentFilter, 'compact')}>
                                            <Button size="icon" variant="ghost" className={`h-7 w-7 rounded-md ${viewMode === 'compact' ? 'bg-white dark:bg-zinc-800 shadow-sm text-indigo-600' : 'text-zinc-400 hover:text-zinc-600'}`}>
                                                <AlignJustify className="h-4 w-4" />
                                            </Button>
                                        </a>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Lista de Tarefas */}
                            <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10 min-h-0">
                                {tasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-zinc-400 px-4 text-center h-full">
                                        <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-full mb-4 ring-1 ring-zinc-100 dark:ring-zinc-800">
                                            {searchQuery ? <Search className="h-8 w-8 text-zinc-300" /> : <CheckCircle2 className="h-8 w-8 text-emerald-500/20 text-emerald-500" />}
                                        </div>
                                        <p className="font-medium text-zinc-600 dark:text-zinc-400 text-lg">
                                            {searchQuery ? "Nenhuma tarefa encontrada." : "Tudo limpo por aqui!"}
                                        </p>
                                        {!searchQuery && <p className="text-sm mt-1 text-zinc-500">Adicione uma tarefa abaixo para começar.</p>}
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
                            <div className="shrink-0 p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 z-20">
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