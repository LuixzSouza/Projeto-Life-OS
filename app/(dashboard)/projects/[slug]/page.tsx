import { prisma } from "@/lib/prisma";
import { TaskInput } from "@/components/projects/task-input";
import { ProjectSettingsMenu } from "@/components/projects/project-settings-menu";
import { TaskReorderList } from "@/components/projects/task-reorder-list"; 
import { ProjectNotes } from "@/components/projects/project-notes";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Search, SlidersHorizontal, 
  FileText, ListTodo, LayoutGrid, List, AlignJustify,
  Sparkles, Hash, Target
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import React, { CSSProperties } from "react";

// --- TYPES ---
type FilterType = "all" | "active" | "completed";
type SortType = "priority" | "dueDate" | "createdAt" | "order";
type ViewMode = "list" | "grid" | "compact";

interface ProjectDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    q?: string;
    filter?: FilterType;
    sort?: SortType;
    tab?: "list" | "notes";
    view?: ViewMode;
  }>;
}

export default async function ProjectDetailPage(props: ProjectDetailPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const { slug } = params;
  const searchQuery = searchParams?.q ?? "";
  const currentFilter: FilterType = searchParams?.filter ?? "active"; 
  const sortBy: SortType = searchParams?.sort ?? "order";
  const activeTab = searchParams?.tab ?? "list";
  const viewMode: ViewMode = searchParams?.view ?? "list";

  const isInbox = slug === "inbox";
  
  const project = !isInbox ? await prisma.project.findUnique({
    where: { slug },
    select: { id: true, title: true, description: true, color: true, createdAt: true },
  }) : null;

  if (!isInbox && !project) return notFound();

  const projectTitle = project?.title ?? "Inbox Global";
  const projectDescription = project?.description ?? "Captura rápida de ideias e tarefas pendentes.";
  const dbProjectId = project?.id ?? null;
  const projectColor = project?.color ?? "#6366f1";

  const where: Prisma.TaskWhereInput = {
    projectId: dbProjectId,
    ...(searchQuery ? { 
        OR: [
            { title: { contains: searchQuery } }, 
            { description: { contains: searchQuery } }
        ] 
    } : {}),
    ...(currentFilter === "active" ? { isDone: false } : {}),
    ...(currentFilter === "completed" ? { isDone: true } : {}),
  };

  const orderBy: Prisma.TaskOrderByWithRelationInput[] = 
    sortBy === "priority" ? [{ priority: "desc" }, { createdAt: "asc" }] :
    sortBy === "dueDate" ? [{ dueDate: "asc" }] : 
    sortBy === "order" ? [{ order: "asc" }, { createdAt: "desc" }] : [{ createdAt: "desc" }];

  const [tasks, allStats] = await Promise.all([
    prisma.task.findMany({ where, orderBy }),
    prisma.task.groupBy({ 
        by: ['isDone'], 
        where: { projectId: dbProjectId }, 
        _count: { isDone: true } 
    })
  ]);

  const doneCount = allStats.find(s => s.isDone)?._count.isDone ?? 0;
  const pendingCount = allStats.find(s => !s.isDone)?._count.isDone ?? 0;
  const totalCount = doneCount + pendingCount;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const buildUrl = (updates: Record<string, string>) => {
    const usp = new URLSearchParams();
    if (searchQuery) usp.set("q", searchQuery);
    if (currentFilter !== "active") usp.set("filter", currentFilter);
    if (sortBy !== "order") usp.set("sort", sortBy);
    if (activeTab !== "list") usp.set("tab", activeTab);
    if (viewMode !== "list") usp.set("view", viewMode);
    
    Object.entries(updates).forEach(([k, v]) => usp.set(k, v));
    return `/projects/${slug}?${usp.toString()}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      
      {/* 1. NAVBAR - FULL WIDTH */}
      <nav className="sticky top-0 z-30 bg-background/60 backdrop-blur-xl border-b border-border/40 px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/projects" className="h-9 w-9 flex items-center justify-center rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            <span className="hidden sm:inline">Navegação</span>
            <span className="opacity-40 hidden sm:inline">/</span>
            <span className="text-foreground">{projectTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isInbox && dbProjectId && (
            <ProjectSettingsMenu 
              projectId={dbProjectId} projectTitle={projectTitle} 
              projectDescription={projectDescription} projectColor={projectColor}
            />
          )}
          <Button size="sm" className="h-9 rounded-xl bg-primary shadow-lg shadow-primary/20 gap-2 px-4">
            <Sparkles className="h-3.5 w-3.5 text-white" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Life AI</span>
          </Button>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <header className="relative pt-12 pb-8 px-4 md:px-10 lg:px-14 w-full">
        <div 
            className="absolute -top-40 -left-40 w-[600px] h-[600px] blur-[160px] opacity-[0.07] rounded-full pointer-events-none"
            style={{ backgroundColor: projectColor }}
        />

        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            <div className="space-y-5 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <div className="h-16 w-16 rounded-[1.75rem] flex items-center justify-center shadow-2xl border border-white/10" style={{ backgroundColor: projectColor }}>
                        <Hash className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Setor Operacional</span>
                        <div className="px-3 py-0.5 rounded-full bg-muted/50 border border-border/40 w-fit text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            {isInbox ? "Privado / Inbox" : "Projeto Ativo"}
                        </div>
                    </div>
                </div>

                <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-foreground leading-[0.85] animate-in fade-in slide-in-from-left-4 duration-700">
                    {projectTitle}
                </h1>

                <p className="text-lg md:text-2xl text-muted-foreground/70 max-w-4xl font-medium leading-relaxed">
                    {projectDescription}
                </p>
            </div>

            {!isInbox && (
                <div className="bg-card border border-border/40 rounded-[2.5rem] p-8 shadow-2xl min-w-[320px] lg:mb-2 backdrop-blur-sm">
                    <div className="flex justify-between items-end mb-5">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Sincronização</span>
                            <div className="text-5xl font-black font-mono tracking-tighter">{progressPercent}%</div>
                        </div>
                        <Target className="h-8 w-8 text-primary opacity-30" />
                    </div>
                    <Progress 
                        value={progressPercent} 
                        className="h-2.5 bg-muted/40" 
                        style={{ "--progress-foreground": projectColor } as React.CSSProperties} 
                    />
                    <div className="mt-6 flex gap-8 text-[10px] font-black uppercase tracking-widest border-t border-border/40 pt-5">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-muted-foreground/40 italic">Finalizado</span>
                            <span className="text-foreground text-base">{doneCount}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-muted-foreground/40 italic">Pendentes</span>
                            <span className="text-foreground text-base">{pendingCount}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </header>

      {/* 3. WORKSPACE */}
      <main className="flex-1 bg-muted/20 border-t border-border/40 rounded-t-[3rem] md:rounded-t-[5rem] shadow-[0_-20px_100px_-20px_rgba(0,0,0,0.1)]">
        <div className="w-full px-4 md:px-10 lg:px-14 py-12">
          
          <Tabs defaultValue={activeTab} className="w-full">
            
            {/* TABS E FILTROS */}
            <div className="flex flex-col xl:flex-row gap-8 items-start xl:items-center justify-between mb-12">
              <TabsList className="bg-muted/50 p-1.5 rounded-2xl border border-border/40 h-auto">
                <TabsTrigger asChild value="list" className="rounded-xl px-10 py-3.5 font-black text-[10px] uppercase tracking-[0.2em] data-[state=active]:bg-background data-[state=active]:shadow-2xl transition-all">
                  <Link href={buildUrl({tab: "list"})} scroll={false}>
                    <ListTodo className="h-4 w-4 mr-2" /> Tarefas
                  </Link>
                </TabsTrigger>
                <TabsTrigger asChild value="notes" className="rounded-xl px-10 py-3.5 font-black text-[10px] uppercase tracking-[0.2em] data-[state=active]:bg-background data-[state=active]:shadow-2xl transition-all">
                  <Link href={buildUrl({tab: "notes"})} scroll={false}>
                    <FileText className="h-4 w-4 mr-2" /> Notas
                  </Link>
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="flex bg-muted/50 p-1.5 rounded-2xl border border-border/40 shadow-inner">
                    {[
                        { mode: 'list', icon: List },
                        { mode: 'grid', icon: LayoutGrid },
                        { mode: 'compact', icon: AlignJustify }
                    ].map((item) => (
                        <Link 
                            key={item.mode}
                            href={buildUrl({view: item.mode as ViewMode})} 
                            className={cn(
                                "p-2.5 rounded-xl transition-all", 
                                viewMode === item.mode ? "bg-background shadow-xl text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <item.icon className="h-4.5 w-4.5" />
                        </Link>
                    ))}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-12 rounded-2xl border-border/40 bg-background/50 gap-4 font-black text-[10px] uppercase tracking-[0.2em] px-8 shadow-sm hover:shadow-xl transition-all">
                      <SlidersHorizontal className="h-4 w-4 text-primary" />
                      {currentFilter === 'all' ? 'Tudo' : currentFilter === 'active' ? 'Faltam' : 'Feito'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 rounded-[1.75rem] p-3 border-border/40 shadow-2xl backdrop-blur-xl bg-background/95">
                    <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/50 py-4 px-4 text-center">Filtro de Visualização</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border/40" />
                    <Link href={buildUrl({filter: "active"})}><DropdownMenuCheckboxItem checked={currentFilter === "active"} className="rounded-xl py-4 cursor-pointer font-bold uppercase text-[10px] tracking-widest mb-1">Pendentes</DropdownMenuCheckboxItem></Link>
                    <Link href={buildUrl({filter: "completed"})}><DropdownMenuCheckboxItem checked={currentFilter === "completed"} className="rounded-xl py-4 cursor-pointer font-bold uppercase text-[10px] tracking-widest mb-1">Concluídas</DropdownMenuCheckboxItem></Link>
                    <Link href={buildUrl({filter: "all"})}><DropdownMenuCheckboxItem checked={currentFilter === "all"} className="rounded-xl py-4 cursor-pointer font-bold uppercase text-[10px] tracking-widest">Todos</DropdownMenuCheckboxItem></Link>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* ABA TAREFAS */}
            <TabsContent value="list" className="space-y-12 outline-none">
              
              <div className="relative group w-full">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/20 group-focus-within:text-primary group-focus-within:scale-110 transition-all duration-300" />
                <form className="w-full">
                  <Input 
                    name="q" placeholder="Buscar em inteligência e operações..." defaultValue={searchQuery}
                    className="h-20 pl-20 pr-8 bg-background border-border/40 rounded-[2rem] shadow-2xl focus-visible:ring-primary/10 focus-visible:border-primary/40 transition-all text-xl font-medium placeholder:text-muted-foreground/10"
                  />
                  <input type="hidden" name="filter" value={currentFilter} />
                  <input type="hidden" name="sort" value={sortBy} />
                  <input type="hidden" name="view" value={viewMode} />
                </form>
              </div>

              <div className="grid grid-cols-1 gap-16">
                <section className="space-y-8">
                    <div className="flex items-center gap-4 px-4">
                        <div className="h-3 w-3 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 italic">Comando de Entrada</span>
                    </div>
                    <TaskInput projectId={isInbox ? "inbox" : dbProjectId!} />
                </section>

                {tasks.length === 0 ? (
                  <EmptyState search={!!searchQuery} currentFilter={currentFilter} />
                ) : (
                  <TaskReorderList initialTasks={tasks} viewMode={viewMode} />
                )}

              </div>
            </TabsContent>

            {/* ABA DE NOTAS / MEMÓRIA */}
            <TabsContent value="notes" className="outline-none">
                <div className="bg-card border border-border/40 rounded-[4rem] p-10 md:p-20 shadow-2xl relative overflow-hidden min-h-[75vh]">
                    <div className="absolute -top-40 -right-40 p-8 opacity-[0.02] rotate-12 pointer-events-none">
                        <FileText className="h-[700px] w-[700px]" />
                    </div>
                    
                    <div className="max-w-6xl relative z-10 h-full flex flex-col">
                        <div className="flex items-center gap-5 mb-14">
                            <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                <Sparkles className="h-8 w-8" />
                            </div>
                            <div>
                                <h2 className="text-4xl font-black tracking-tight uppercase italic text-foreground">Setor de Memória</h2>
                                <p className="text-sm font-bold text-muted-foreground/40 uppercase tracking-[0.4em]">Arquivamento de Conhecimento Estratégico</p>
                            </div>
                        </div>

                        {isInbox ? (
                          <div className="flex-1 flex items-center justify-center bg-muted/10 border border-dashed border-border/40 rounded-[3rem] p-10">
                            <p className="text-muted-foreground font-black uppercase tracking-widest text-sm opacity-50">O Setor de Memória não está disponível na Caixa de Entrada Global.</p>
                          </div>
                        ) : (
                          <ProjectNotes 
                            projectId={dbProjectId!} 
                            initialNotes={projectDescription || ""} 
                          />
                        )}

                    </div>
                </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function EmptyState({ search, currentFilter }: { search: boolean; currentFilter: FilterType }) {
  return (
    <div className="col-span-full py-48 flex flex-col items-center justify-center text-center px-6">
      <div className="h-32 w-32 rounded-[3rem] bg-muted/40 flex items-center justify-center mb-10 text-muted-foreground/5 border border-border/40 shadow-inner">
        {search ? <Search className="h-12 w-12" /> : <Target className="h-12 w-12" />}
      </div>
      <h3 className="text-3xl font-black tracking-tighter mb-4 uppercase italic opacity-20">Sector Deactivated</h3>
      <p className="text-muted-foreground/40 max-w-[360px] font-bold text-sm uppercase tracking-[0.2em] leading-relaxed">
        {search 
            ? "O scanner não detectou frequências compatíveis." 
            : "Todos os subsistemas operando em silêncio. Sem pendências."}
      </p>
      {search && (
        <Button variant="link" asChild className="mt-10 text-primary font-black uppercase tracking-[0.4em] text-[11px]">
          <Link href="?">Reiniciar Scanner</Link>
        </Button>
      )}
    </div>
  );
}