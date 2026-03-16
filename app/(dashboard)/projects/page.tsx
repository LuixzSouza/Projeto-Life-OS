import { prisma } from "@/lib/prisma";
import { JobTracker } from "@/components/projects/job-tracker";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { ProjectCard } from "@/components/projects/project-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Layers, Briefcase, Sparkles, Inbox, LayoutGrid, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function ProjectsPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const currentTab = resolvedSearchParams?.tab ?? "projects";

  // Busca de Dados Paralela
  const [projects, jobs, inboxStats, inboxCompleted] = await Promise.all([
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        status: true,
        color: true,
        updatedAt: true,
        _count: { select: { tasks: true } },
        tasks: {
          where: { isDone: true },
          select: { id: true },
        },
      },
    }),
    prisma.jobApplication.findMany({
      orderBy: { appliedDate: "desc" },
    }),
    prisma.task.aggregate({
      where: { projectId: null },
      _count: { id: true },
    }),
    prisma.task.count({
      where: { projectId: null, isDone: true },
    }),
  ]);

  const totalTasksPending = projects.reduce((acc, p) => acc + (p._count.tasks - p.tasks.length), 0) + (inboxStats._count.id - inboxCompleted);

  return (
    <div className="min-h-screen bg-[#F4F4F5] dark:bg-[#080808] animate-in fade-in duration-700 pb-20 w-full overflow-x-hidden">
      
      {/* GLOWS DE FUNDO PARA QUEBRAR O BRANCO */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* HEADER PREMIUM (Estilo Notion/Linear) - Agora Full Width */}
      <header className="sticky top-0 z-30 bg-[#F4F4F5]/80 dark:bg-[#080808]/80 backdrop-blur-xl border-b border-border/40 px-6 md:px-10 lg:px-14 py-4">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white dark:bg-zinc-900 shadow-sm border border-border/50 text-foreground">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black uppercase tracking-tighter">Workspace</h1>
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 uppercase font-black bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Live</Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {projects.length} Projetos Ativos
                </span>
                <span className="text-border text-[10px]">•</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {totalTasksPending} Pendências
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 bg-white dark:bg-zinc-900 border-border/60 text-muted-foreground hover:text-foreground shadow-sm">
                <ListFilter className="h-4 w-4" />
             </Button>
             <NewProjectDialog />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT - Agora Full Width */}
      <main className="w-full px-6 md:px-10 lg:px-14 py-10 space-y-12 relative">
        
        <Tabs defaultValue={currentTab} className="w-full space-y-10">
          
          {/* TABS SELECTOR (Segmented Control Style) */}
          <div className="flex justify-center">
            <TabsList className="bg-zinc-200/50 dark:bg-zinc-900/50 p-1 rounded-2xl border border-border/40 h-14 w-full max-w-[450px] shadow-inner">
              <TabsTrigger 
                value="projects" 
                className="rounded-xl px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all gap-2 h-full flex-1"
              >
                <LayoutGrid className="h-4 w-4" /> Projetos
              </TabsTrigger>
              <TabsTrigger 
                value="jobs" 
                className="rounded-xl px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all gap-2 h-full flex-1"
              >
                <Briefcase className="h-4 w-4" /> Vagas
                <Badge className="ml-1 h-5 px-1.5 bg-primary/10 text-primary border-none text-[10px] font-black">{jobs.length}</Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ABA: PROJETOS */}
          <TabsContent value="projects" className="mt-0 outline-none space-y-14 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* SEÇÃO INBOX (Destaque Azul) */}
            <section className="relative">
               <div className="flex items-center justify-between mb-5 px-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                      <Inbox className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-widest">Inbox Global</h2>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">Captura rápida de ideias e tarefas</p>
                    </div>
                  </div>
              </div>
              
              <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-1 border border-border/40 shadow-sm hover:shadow-md transition-all group">
                <ProjectCard
                  id="inbox"
                  slug="inbox"
                  title="Caixa de Entrada"
                  description="Tudo o que ainda não foi processado ou categorizado em um projeto específico."
                  totalTasks={inboxStats._count.id}
                  completedTasks={inboxCompleted}
                  isInbox
                />
              </div>
            </section>

            {/* SEÇÃO PROJETOS (Destaque Principal) */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-widest">Projetos Ativos</h2>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">Estruturas de médio e longo prazo</p>
                    </div>
                  </div>
                </div>

                {projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border/40 rounded-[3rem] bg-white/50 dark:bg-zinc-900/30">
                    <div className="h-20 w-20 rounded-[2rem] bg-muted/50 flex items-center justify-center mb-6 shadow-inner">
                      <Layers className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-xl font-black tracking-tight">Vazio por aqui</h3>
                    <p className="text-muted-foreground text-sm max-w-[280px] text-center mt-2 font-medium">
                      Que tal transformar aquele objetivo em um projeto estruturado hoje?
                    </p>
                    <div className="mt-8">
                      <NewProjectDialog />
                    </div>
                  </div>
                ) : (
                  // Grid responsivo e fluído (até 5 colunas em monitores gigantes)
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {projects.map((project) => (
                      <div key={project.id} className="bg-white dark:bg-zinc-900 rounded-[2rem] p-1 border border-border/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                        <ProjectCard
                          id={project.id}
                          slug={project.slug}
                          title={project.title}
                          description={project.description}
                          status={project.status}
                          totalTasks={project._count.tasks}
                          completedTasks={project.tasks.length}
                        />
                      </div>
                    ))}
                  </div>
                )}
            </section>

          </TabsContent>

          {/* ABA: VAGAS */}
          <TabsContent value="jobs" className="mt-0 outline-none animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-zinc-900 border border-border/40 rounded-[2.5rem] overflow-hidden shadow-sm p-2">
                <JobTracker jobs={jobs} />
            </div>
          </TabsContent>
          
        </Tabs>
      </main>
    </div>
  );
}