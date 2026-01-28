import { prisma } from "@/lib/prisma";
import { TaskInput } from "@/components/projects/task-input";
import { TaskItem } from "@/components/projects/task-item";
import { ProjectSettingsMenu } from "@/components/projects/project-settings-menu";
import { SortSelect } from "@/components/projects/sort-select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { CardContent, Card } from "@/components/ui/card";
import { 
  ArrowLeft, Search, List, AlignJustify, CheckCircle2, X, Filter, 
  Calendar, Flag, Star, Pin, Clock, Target, Sparkles,
  Grid3x3, Zap, TrendingUp, AlertCircle, FileText, CalendarDays
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type FilterType = "all" | "active" | "completed" | "pinned" | "starred" | "overdue";
type ViewType = "list" | "compact" | "grid";
type SortType = "priority" | "dueDate" | "createdAt" | "title";

interface ProjectDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    q?: string;
    view?: ViewType;
    filter?: FilterType;
    sort?: SortType;
  }>;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}

function StatCard({ label, value, icon, color, trend }: StatCardProps) {
  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:scale-[1.02] hover:border-primary/30 hover:shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <CardContent className="relative p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight" style={{ color }}>{value}</p>
            {trend !== undefined && (
              <p className={cn(
                "text-xs font-medium flex items-center gap-1",
                trend > 0 ? "text-green-500" : 
                trend < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {trend > 0 ? <TrendingUp className="h-3 w-3" /> : 
                 trend < 0 ? <AlertCircle className="h-3 w-3" /> : 
                 <span className="h-3 w-3" />}
                {trend > 0 ? "+" : ""}{trend}%
              </p>
            )}
          </div>
          <div 
            className="p-2.5 rounded-xl shadow-sm transition-all group-hover:scale-110 group-hover:shadow-md"
            style={{ 
              backgroundColor: `${color}15`,
              border: `1px solid ${color}30`
            }}
          >
            <div className="text-foreground" style={{ color }}>
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const FILTER_CONFIG = {
  all: { label: "Todas", icon: <List className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
  active: { label: "Pendentes", icon: <Target className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-600" },
  completed: { label: "Concluídas", icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-green-500/10 text-green-600" },
  pinned: { label: "Fixadas", icon: <Pin className="h-4 w-4" />, color: "bg-amber-500/10 text-amber-600" },
  starred: { label: "Destacadas", icon: <Star className="h-4 w-4" />, color: "bg-yellow-500/10 text-yellow-600" },
  overdue: { label: "Atrasadas", icon: <Clock className="h-4 w-4" />, color: "bg-red-500/10 text-red-600" },
} as const;

const VIEW_CONFIG = {
  list: { label: "Lista", icon: <List className="h-4 w-4" /> },
  compact: { label: "Compacto", icon: <AlignJustify className="h-4 w-4" /> },
  grid: { label: "Grade", icon: <Grid3x3 className="h-4 w-4" /> },
} as const;

export default async function ProjectDetailPage(props: ProjectDetailPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const { slug } = params;
  const searchQuery = searchParams?.q ?? "";
  const viewMode: ViewType = searchParams?.view ?? "list";
  const currentFilter: FilterType = searchParams?.filter ?? "all";
  const sortBy: SortType = searchParams?.sort ?? "priority";

  const isInbox = slug === "inbox";
  let projectTitle = "Inbox";
  let projectDescription: string | null = "Tarefas rápidas e não categorizadas.";
  let dbProjectId: string | null = null;
  let projectColor = "#6366f1";

  try {
    if (!isInbox) {
      const project = await prisma.project.findUnique({
        where: { slug },
        select: { 
          id: true, 
          title: true, 
          description: true, 
          color: true,
          createdAt: true 
        },
      });
      
      if (!project) return notFound();
      
      projectTitle = project.title;
      projectDescription = project.description;
      dbProjectId = project.id;
      projectColor = project.color || "#6366f1";
    }
  } catch (err) {
    console.error(err);
    return notFound();
  }

  const now = new Date();
  
  const where: Prisma.TaskWhereInput = {
    projectId: dbProjectId,
    ...(searchQuery ? { 
      OR: [
        { title: { contains: searchQuery, mode: 'insensitive' } }, 
        { description: { contains: searchQuery, mode: 'insensitive' } }
      ] 
    } : {}),
    ...(currentFilter === "active" ? { isDone: false } : {}),
    ...(currentFilter === "completed" ? { isDone: true } : {}),
    ...(currentFilter === "pinned" ? { isPinned: true } : {}),
    ...(currentFilter === "starred" ? { isStarred: true } : {}),
    ...(currentFilter === "overdue" ? { 
      dueDate: { lt: now }, 
      isDone: false 
    } : {}),
  };

  const orderBy: Prisma.TaskOrderByWithRelationInput[] = [];
  
  if (sortBy === "priority") orderBy.push({ priority: "desc" }, { dueDate: "asc" });
  else if (sortBy === "dueDate") orderBy.push({ dueDate: "asc" }, { priority: "desc" });
  else if (sortBy === "createdAt") orderBy.push({ createdAt: "desc" }, { priority: "desc" });
  else if (sortBy === "title") orderBy.push({ title: "asc" }, { priority: "desc" });

  const tasks = await prisma.task.findMany({
    where,
    orderBy,
    select: {
      id: true, 
      title: true, 
      description: true, 
      isDone: true, 
      priority: true,
      status: true, 
      dueDate: true, 
      image: true, 
      createdAt: true, 
      updatedAt: true,
      isPinned: true, 
      isStarred: true, 
      progress: true, 
      estimatedTime: true,
      projectId: true,
    },
  });

  const allTasks = await prisma.task.findMany({
    where: { projectId: dbProjectId },
    select: { 
      isDone: true, 
      isPinned: true, 
      isStarred: true, 
      dueDate: true, 
      progress: true 
    },
  });

  const total = allTasks.length;
  const done = allTasks.filter((t) => t.isDone).length;
  const pinned = allTasks.filter((t) => t.isPinned).length;
  const starred = allTasks.filter((t) => t.isStarred).length;
  const progressAvg = total > 0 ? Math.round(allTasks.reduce((acc, t) => acc + t.progress, 0) / total) : 0;
  const overdue = allTasks.filter((t) => t.dueDate && t.dueDate < now && !t.isDone).length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  const buildUrl = (newParams: { q?: string; view?: ViewType; filter?: FilterType; sort?: SortType }) => {
    const p = { 
      q: searchQuery, 
      view: viewMode, 
      filter: currentFilter, 
      sort: sortBy, 
      ...newParams 
    };
    
    const usp = new URLSearchParams();
    
    if (p.q) usp.set("q", p.q);
    if (p.view !== "list") usp.set("view", p.view);
    if (p.filter !== "all") usp.set("filter", p.filter);
    if (p.sort !== "priority") usp.set("sort", p.sort);
    
    const queryString = usp.toString();
    return `/projects/${encodeURIComponent(slug)}${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/5">
        {/* Enhanced Header with Gradient */}
        <header 
          className=" z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          style={{
            background: `linear-gradient(135deg, ${projectColor}08 0%, transparent 50%, ${projectColor}05 100%)`,
          }}
        >
          <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
            {/* Navigation and Title */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link 
                  href="/projects" 
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary p-2 hover:bg-primary/10 rounded-lg transition-all hover:scale-105"
                >
                  <ArrowLeft className="h-4 w-4" /> 
                  <span className="font-medium">Voltar</span>
                </Link>
                
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
                
                <div className="flex items-center gap-3">
                  <div 
                    className="h-3 w-3 rounded-full shadow-md"
                    style={{ 
                      backgroundColor: projectColor,
                      boxShadow: `0 0 12px ${projectColor}60`
                    }} 
                  />
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
                      {projectTitle}
                    </h1>
                    <p className="text-sm text-muted-foreground truncate max-w-md">
                      {projectDescription}
                    </p>
                  </div>
                </div>
              </div>
              
              {!isInbox && dbProjectId && (
                <ProjectSettingsMenu 
                  projectId={dbProjectId} 
                  projectTitle={projectTitle} 
                  projectDescription={projectDescription}
                  projectColor={projectColor}
                />
              )}
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-6">
              <StatCard 
                label="Total" 
                value={total} 
                icon={<FileText className="h-4 w-4" />} 
                color={projectColor} 
              />
              <StatCard 
                label="Concluídas" 
                value={done} 
                icon={<CheckCircle2 className="h-4 w-4" />} 
                color="#10b981" 
                trend={progress} 
              />
              <StatCard 
                label="Progresso Médio" 
                value={`${progressAvg}%`} 
                icon={<TrendingUp className="h-4 w-4" />} 
                color="#8b5cf6" 
              />
              <StatCard 
                label="Fixadas" 
                value={pinned} 
                icon={<Pin className="h-4 w-4" />} 
                color="#f59e0b" 
              />
              <StatCard 
                label="Destacadas" 
                value={starred} 
                icon={<Star className="h-4 w-4" />} 
                color="#fbbf24" 
              />
              <StatCard 
                label="Atrasadas" 
                value={overdue} 
                icon={<AlertCircle className="h-4 w-4" />} 
                color="#ef4444" 
              />
            </div>

            {/* Project Progress Bar */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Progresso do Projeto</span>
                  <Badge variant="outline" className="text-xs">
                    {done}/{total} concluídas
                  </Badge>
                </div>
                <span className="text-sm font-bold text-primary">{progress}%</span>
              </div>
              <div className="relative">
                <Progress 
                  value={progress} 
                  className="h-2.5 bg-gradient-to-r from-muted to-muted/50" 
                />
                <div 
                  className="absolute inset-0 h-2.5 rounded-full opacity-20"
                  style={{
                    background: `linear-gradient(90deg, ${projectColor}20, ${projectColor}40)`,
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Filters */}
            <aside className="lg:col-span-1 space-y-6">
              <Card className="sticky top-24 border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
                <CardContent className="p-6 space-y-6">
                  {/* Search Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-primary" />
                      <label className="text-sm font-medium">Buscar Tarefas</label>
                    </div>
                    <form method="GET" className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input 
                        name="q" 
                        defaultValue={searchQuery} 
                        placeholder="Pesquisar..." 
                        className="pl-9 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                      />
                      {searchQuery && (
                        <Link 
                          href={buildUrl({ q: "" })} 
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                        </Link>
                      )}
                      <input type="hidden" name="filter" value={currentFilter} />
                      <input type="hidden" name="view" value={viewMode} />
                      <input type="hidden" name="sort" value={sortBy} />
                    </form>
                  </div>

                  <Separator className="bg-border/30" />

                  {/* Filters Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-medium">Filtros</h3>
                    </div>
                    <div className="space-y-1">
                      {(Object.entries(FILTER_CONFIG) as [FilterType, typeof FILTER_CONFIG[FilterType]][]).map(([key, config]) => (
                        <Link key={key} href={buildUrl({ filter: key })}>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start gap-3 h-9 text-sm font-normal transition-all",
                              currentFilter === key && config.color,
                              currentFilter !== key && "hover:bg-primary/5"
                            )}
                          >
                            {config.icon}
                            {config.label}
                            {(key === "overdue" && overdue > 0) || (key === "pinned" && pinned > 0) ? (
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "ml-auto text-xs",
                                  key === "overdue" && "bg-red-500/10 text-red-600",
                                  key === "pinned" && "bg-amber-500/10 text-amber-600"
                                )}
                              >
                                {key === "overdue" ? overdue : pinned}
                              </Badge>
                            ) : null}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-border/30" />

                  {/* Sort Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-medium">Ordenar por</h3>
                    </div>
                    <SortSelect sortBy={sortBy} slug={slug} />
                  </div>

                  <Separator className="bg-border/30" />

                  {/* View Toggle */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Visualização</h3>
                    <div className="grid gap-1 p-1 rounded-lg bg-muted/30">
                      {(Object.entries(VIEW_CONFIG) as [ViewType, typeof VIEW_CONFIG[ViewType]][]).map(([key, config]) => (
                        <Tooltip key={key}>
                          <TooltipTrigger asChild>
                            <Link href={buildUrl({ view: key })} className="flex-1">
                              <Button
                                size="sm"
                                variant={viewMode === key ? "default" : "ghost"}
                                className={cn(
                                  "w-full gap-2 transition-all",
                                  viewMode === key && "shadow-sm"
                                )}
                              >
                                {config.icon}
                                <span className="hidden sm:inline">{config.label}</span>
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{config.label}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>

            {/* Main Content */}
            <section className="lg:col-span-3 space-y-6">
              {/* Tasks Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Tarefas</h2>
                    <p className="text-sm text-muted-foreground">
                      {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'} encontradas
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "transition-colors",
                      currentFilter !== "all" && FILTER_CONFIG[currentFilter].color
                    )}
                  >
                    {FILTER_CONFIG[currentFilter].icon}
                    <span className="ml-1">{FILTER_CONFIG[currentFilter].label}</span>
                  </Badge>
                </div>
              </div>

              {/* Tasks Card */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
                <CardContent className="p-0">
                  {tasks.length === 0 ? (
                    <EmptyState search={!!searchQuery} currentFilter={currentFilter} />
                  ) : (
                    <div className={cn(
                      "p-4",
                      viewMode === "grid" 
                        ? "grid grid-cols-1 md:grid-cols-2 gap-4" 
                        : viewMode === "compact" 
                        ? "space-y-2" 
                        : "space-y-3"
                    )}>
                      {tasks.map((task) => (
                        <TaskItem key={task.id} task={task} viewMode={viewMode} />
                      ))}
                    </div>
                  )}
                </CardContent>
                
                {/* Task Input */}
                <div 
                  className="p-4 border-t bg-gradient-to-r from-primary/5 via-transparent to-transparent"
                  style={{
                    borderTopColor: `${projectColor}20`
                  }}
                >
                  <TaskInput projectId={isInbox ? "inbox" : dbProjectId!} />
                </div>
              </Card>
            </section>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

function EmptyState({ search, currentFilter }: { search: boolean; currentFilter: FilterType }) {
  const messages = {
    all: "Nenhuma tarefa encontrada. Comece criando uma nova tarefa!",
    active: "🎉 Excelente! Todas as tarefas estão concluídas.",
    completed: "Nenhuma tarefa concluída ainda. Continue trabalhando!",
    pinned: "Nenhuma tarefa fixada. Fixe tarefas importantes para vê-las aqui.",
    starred: "Nenhuma tarefa destacada. Destaque tarefas importantes!",
    overdue: "🎊 Perfeito! Nenhuma tarefa atrasada."
  };

  const icons = {
    all: <FileText className="h-12 w-12 text-muted-foreground" />,
    active: <CheckCircle2 className="h-12 w-12 text-green-400" />,
    completed: <Target className="h-12 w-12 text-blue-400" />,
    pinned: <Pin className="h-12 w-12 text-amber-400" />,
    starred: <Star className="h-12 w-12 text-yellow-400" />,
    overdue: <Sparkles className="h-12 w-12 text-green-400" />
  };

  return (
    <div className="py-16 text-center">
      <div 
        className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{
          background: "linear-gradient(135deg, var(--primary)/10, var(--primary)/5)"
        }}
      >
        {icons[currentFilter]}
      </div>
      <h3 className="text-xl font-semibold mb-2">
        {search ? "Nenhum resultado encontrado" : messages[currentFilter]}
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        {search 
          ? "Tente usar palavras-chave diferentes ou ajustar os filtros." 
          : currentFilter !== "all" 
            ? "Tente mudar o filtro para ver todas as tarefas." 
            : "Use o campo acima para criar sua primeira tarefa."
        }
      </p>
    </div>
  );
}