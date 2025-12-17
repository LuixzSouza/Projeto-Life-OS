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
  LayoutTemplate,
} from "lucide-react";
import { Prisma } from "@prisma/client";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */
interface ProjectsPageProps {
  searchParams: Promise<{
    id?: string;
    q?: string;
    tab?: string;
    view?: "list" | "compact";
    filter?: string;
  }>;
}

const generateFilterUrl = (
  selectedProjectId: string,
  newFilter: string,
  viewMode: string
) => {
  const url = new URLSearchParams({ id: selectedProjectId, view: viewMode });
  if (newFilter !== "all") url.set("filter", newFilter);
  return `/projects?${url.toString()}`;
};

/* -------------------------------------------------------------------------- */
/*                                    PAGE                                    */
/* -------------------------------------------------------------------------- */
export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;

  const selectedProjectId = params?.id || "inbox";
  const searchQuery = params?.q || "";
  const currentTab = params?.tab || "projects";
  const viewMode = (params?.view as "list" | "compact") || "list";
  const currentFilter = params?.filter || "all";

  /* -------------------------------- Projects -------------------------------- */
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tasks: { select: { id: true, isDone: true } },
    },
  });

  /* --------------------------------- Tasks ---------------------------------- */
  const whereClause: Prisma.TaskWhereInput = {
    projectId: selectedProjectId === "inbox" ? null : selectedProjectId,
    ...(searchQuery && { title: { contains: searchQuery } }),
    ...(currentFilter === "active" && { isDone: false }),
    ...(currentFilter === "completed" && { isDone: true }),
    ...(currentFilter === "high" && { priority: "HIGH", isDone: false }),
  };

  const tasks = await prisma.task.findMany({
    where: whereClause,
    orderBy: [
      { isDone: "asc" },
      { priority: "desc" },
      { createdAt: "desc" },
    ],
  });

  /* --------------------------------- Header --------------------------------- */
  const currentProject =
    selectedProjectId === "inbox"
      ? null
      : projects.find((p) => p.id === selectedProjectId);

  const projectTitle = currentProject?.title || "Inbox";
  const projectDesc =
    currentProject?.description ||
    "Tarefas rápidas e não categorizadas.";

  /* -------------------------------- Statistics ------------------------------- */
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.isDone).length;
  const pendingTasks = totalTasks - completedTasks;
  const progress =
    totalTasks === 0
      ? 0
      : Math.round((completedTasks / totalTasks) * 100);

  /* ---------------------------------- Jobs ---------------------------------- */
  const jobs = await prisma.jobApplication.findMany({
    orderBy: { appliedDate: "desc" },
  });

  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-500">
      {/* ================================ HEADER ================================ */}
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-10 pb-8 px-6 md:px-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-primary/10 text-primary shadow-sm">
              <LayoutTemplate className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Gestão de Trabalho
              </h1>
              <p className="text-sm text-muted-foreground">
                Projetos, tarefas e acompanhamento profissional.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ================================ CONTENT =============================== */}
      <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto">
        <Tabs
          defaultValue={currentTab}
          className="flex flex-col min-h-[calc(100vh-14rem)]"
        >
          {/* Tabs Header */}
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-muted p-1">
              <TabsTrigger value="projects" className="gap-2">
                <Layers className="h-4 w-4" />
                Projetos
              </TabsTrigger>

              <TabsTrigger value="jobs" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Vagas
                <Badge
                  variant="secondary"
                  className="ml-1 px-1.5 h-5"
                >
                  {jobs.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ============================ PROJECTS TAB ============================ */}
          <TabsContent
            value="projects"
            className="flex-1 mt-0 flex min-h-0 data-[state=inactive]:hidden"
          >
            <div className="flex gap-6 h-full min-h-0 w-full">
              <ProjectSidebar
                projects={projects}
                selectedProjectId={selectedProjectId}
              />

              <section className="flex-1 flex flex-col bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* Project Header */}
                <div className="p-6 border-b border-border bg-muted/10">
                  <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-2xl font-bold truncate">
                        {projectTitle}
                      </h2>
                      <p className="text-sm text-muted-foreground truncate">
                        {projectDesc}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <StatBox
                        label="A Fazer"
                        value={pendingTasks}
                      />
                      <StatBox
                        label="Feitas"
                        value={completedTasks}
                        accent
                      />
                    </div>
                  </div>

                  <Progress
                    value={progress}
                    className="h-1 mt-4 bg-muted"
                    indicatorClassName="bg-primary"
                  />
                </div>

                {/* Toolbar */}
                <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3 bg-card">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <form>
                      <input
                        type="hidden"
                        name="id"
                        value={selectedProjectId}
                      />
                      <Input
                        name="q"
                        defaultValue={searchQuery}
                        placeholder="Buscar tarefa..."
                        className="pl-9 h-9 bg-muted/30"
                      />
                    </form>
                  </div>

                  <div className="flex items-center gap-1">
                    {[
                      { key: "all", label: "Tudo" },
                      { key: "active", label: "A Fazer" },
                      { key: "completed", label: "Feito" },
                      { key: "high", label: "Alta" },
                    ].map((f) => (
                      <a
                        key={f.key}
                        href={generateFilterUrl(
                          selectedProjectId,
                          f.key,
                          viewMode
                        )}
                      >
                        <Button
                          size="sm"
                          variant={
                            currentFilter === f.key
                              ? "default"
                              : "outline"
                          }
                          className="h-8 px-3 text-xs"
                        >
                          {f.label}
                        </Button>
                      </a>
                    ))}
                  </div>

                  <div className="flex bg-muted p-0.5 rounded-lg">
                    <a
                      href={generateFilterUrl(
                        selectedProjectId,
                        currentFilter,
                        "list"
                      )}
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          "h-7 w-7",
                          viewMode === "list" &&
                            "bg-background shadow-sm text-primary"
                        )}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </a>

                    <a
                      href={generateFilterUrl(
                        selectedProjectId,
                        currentFilter,
                        "compact"
                      )}
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          "h-7 w-7",
                          viewMode === "compact" &&
                            "bg-background shadow-sm text-primary"
                        )}
                      >
                        <AlignJustify className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>

                {/* Task List */}
                <CardContent className="flex-1 overflow-y-auto p-0 bg-muted/5">
                  {tasks.length === 0 ? (
                    <EmptyState search={!!searchQuery} />
                  ) : (
                    <div
                      className={cn(
                        "p-4",
                        viewMode === "compact"
                          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                          : "flex flex-col"
                      )}
                    >
                      {tasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>

                {/* Input */}
                <div className="border-t border-border p-4 bg-card">
                  <TaskInput projectId={selectedProjectId} />
                </div>
              </section>
            </div>
          </TabsContent>

          {/* ============================== JOBS TAB ============================== */}
          <TabsContent
            value="jobs"
            className="flex-1 mt-0 data-[state=inactive]:hidden"
          >
            <JobTracker jobs={jobs} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  COMPONENTS                                */
/* -------------------------------------------------------------------------- */
function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-2 rounded-xl border border-border bg-background min-w-[90px]">
      <span
        className={cn(
          "text-lg font-bold",
          accent && "text-emerald-600"
        )}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase font-bold text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function EmptyState({ search }: { search: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
      <div className="bg-muted/50 p-6 rounded-full mb-4 ring-1 ring-border">
        {search ? (
          <Search className="h-8 w-8 opacity-50" />
        ) : (
          <CheckCircle2 className="h-8 w-8 text-emerald-500/50" />
        )}
      </div>

      <p className="font-medium text-lg">
        {search ? "Nenhuma tarefa encontrada." : "Tudo limpo por aqui!"}
      </p>

      {!search && (
        <p className="text-sm mt-1 opacity-70">
          Adicione uma tarefa abaixo para começar.
        </p>
      )}
    </div>
  );
}
