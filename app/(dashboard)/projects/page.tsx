import { prisma } from "@/lib/prisma";
import { JobTracker } from "@/components/projects/job-tracker";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { ProjectCard } from "@/components/projects/project-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Layers, Briefcase, LayoutTemplate } from "lucide-react";

// No Next 16, searchParams é uma Promise
type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function ProjectsPage({ searchParams }: Props) {
  // OBRIGATÓRIO: Aguardar a promise no Next 16
  const resolvedSearchParams = await searchParams;
  const currentTab = resolvedSearchParams?.tab ?? "projects";

  /* -------------------------------------------------------------------------- */
  /* BUSCA DE DADOS                                                             */
  /* -------------------------------------------------------------------------- */

  const [projects, jobs, inboxStats, inboxCompleted] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        status: true,
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

  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-500">
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-10 pb-8 px-6 md:px-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-primary/10 text-primary shadow-sm">
            <LayoutTemplate className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Gestão de Trabalho</h1>
            <p className="text-sm text-muted-foreground">Visão macro dos seus projetos e candidaturas.</p>
          </div>
        </div>
      </header>

      <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto">
        <Tabs defaultValue={currentTab} className="flex flex-col">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <TabsList className="bg-muted p-1">
              <TabsTrigger value="projects" className="gap-2">
                <Layers className="h-4 w-4" /> Projetos
              </TabsTrigger>
              <TabsTrigger value="jobs" className="gap-2">
                <Briefcase className="h-4 w-4" /> Vagas
                <Badge variant="secondary" className="ml-1 px-1.5 h-5">{jobs.length}</Badge>
              </TabsTrigger>
            </TabsList>
            <NewProjectDialog />
          </div>

          <TabsContent value="projects" className="mt-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <ProjectCard
                id="inbox"
                slug="inbox"
                title="Inbox (Caixa de Entrada)"
                description="Tarefas rápidas e não categorizadas."
                totalTasks={inboxStats._count.id}
                completedTasks={inboxCompleted}
                isInbox
              />

              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  slug={project.slug}
                  title={project.title}
                  description={project.description}
                  status={project.status}
                  totalTasks={project._count.tasks}
                  completedTasks={project.tasks.length}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="jobs" className="mt-0 outline-none">
            <JobTracker jobs={jobs} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}