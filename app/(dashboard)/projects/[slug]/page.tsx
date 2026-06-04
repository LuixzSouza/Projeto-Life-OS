import { prisma } from "@/lib/prisma";
import { parseMeetingImages } from "@/lib/meeting-images";
import { parseStringList } from "@/lib/meeting-meta";
import { TaskInput } from "@/components/projects/task-input";
import { ProjectSettingsMenu } from "@/components/projects/project-settings-menu";
import { TaskReorderList } from "@/components/projects/task-reorder-list";
import { TaskKanbanBoard } from "@/components/projects/task-kanban-board";
import { TasksByDay } from "@/components/projects/tasks-by-day";
import { ProjectNotes } from "@/components/projects/project-notes";
import { MeetingBoard } from "@/components/projects/meeting-board";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Search, SlidersHorizontal,
  FileText, ListTodo, LayoutGrid, List, AlignJustify, Columns3,
  CalendarClock, CalendarDays, Hash, Inbox, AlignLeft, Tag,
} from "lucide-react";
import { EntityTags } from "@/components/connect/entity-tags";
import { EntityAttachments } from "@/components/connect/entity-attachments";
import { EntityLinks } from "@/components/connect/entity-links";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { getCurrentUserId } from "@/lib/auth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import React from "react";

// --- TYPES ---
type FilterType = "all" | "active" | "completed";
type SortType = "priority" | "dueDate" | "createdAt" | "order";
type ViewMode = "list" | "grid" | "compact" | "kanban" | "byday";

interface ProjectDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    q?: string;
    filter?: FilterType;
    sort?: SortType;
    tab?: "list" | "notes" | "meetings";
    view?: ViewMode;
  }>;
}

const FILTER_LABEL: Record<FilterType, string> = { all: "Todos", active: "Pendentes", completed: "Concluídas" };

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
  const isKanban = viewMode === "kanban";
  // No Kanban as colunas cobrem todos os status, então ignoramos o filtro feito/pendente.
  const effectiveFilter: FilterType = isKanban ? "all" : currentFilter;

  const userId = await getCurrentUserId();

  const project = !isInbox ? await prisma.project.findFirst({
    where: { slug, userId, deletedAt: null },
    select: { id: true, title: true, description: true, color: true, createdAt: true },
  }) : null;

  if (!isInbox && !project) return notFound();

  const projectTitle = project?.title ?? "Caixa de Entrada";
  const projectDescription = project?.description ?? "Captura rápida de ideias e tarefas pendentes.";
  const dbProjectId = project?.id ?? null;
  const projectColor = project?.color ?? "#6366f1";
  const accentColor = isInbox ? "#3b82f6" : projectColor;

  const where: Prisma.TaskWhereInput = {
    projectId: dbProjectId,
    userId,
    deletedAt: null,
    ...(searchQuery ? {
        OR: [
            { title: { contains: searchQuery } },
            { description: { contains: searchQuery } }
        ]
    } : {}),
    ...(effectiveFilter === "active" ? { isDone: false } : {}),
    ...(effectiveFilter === "completed" ? { isDone: true } : {}),
  };

  const orderBy: Prisma.TaskOrderByWithRelationInput[] =
    sortBy === "priority" ? [{ priority: "desc" }, { createdAt: "asc" }] :
    sortBy === "dueDate" ? [{ dueDate: "asc" }] :
    sortBy === "order" ? [{ order: "asc" }, { createdAt: "desc" }] : [{ createdAt: "desc" }];

  const [tasks, allStats, rawMeetings] = await Promise.all([
    prisma.task.findMany({ where: { ...where, deletedAt: null }, orderBy }),
    prisma.task.groupBy({
        by: ['isDone'],
        where: { projectId: dbProjectId, userId, deletedAt: null },
        _count: { isDone: true }
    }),
    prisma.meeting.findMany({
        where: { projectId: dbProjectId, userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, rawNotes: true, summary: true, image: true, images: true, createdAt: true,
          participants: true, tags: true, decisions: true,
        },
    })
  ]);

  const meetings = rawMeetings.map(({ image, images, createdAt, participants, tags, decisions, ...m }) => ({
    ...m,
    images: parseMeetingImages(images, image),
    participants: parseStringList(participants),
    tags: parseStringList(tags),
    decisions: parseStringList(decisions),
    createdAt: createdAt.toISOString(),
  }));

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

  const TABS = [
    { key: "list", label: "Tarefas", icon: ListTodo },
    { key: "notes", label: "Notas", icon: FileText },
    { key: "meetings", label: "Reuniões", icon: CalendarClock },
  ] as const;

  return (
    <div className="min-h-screen bg-background w-full pb-12 animate-in fade-in duration-500">

      {/* HEADER (padrão do sistema) */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 px-6 md:px-8 py-4">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/projects" className="h-9 w-9 flex items-center justify-center rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: accentColor }}>
              {isInbox ? <Inbox className="h-5 w-5" /> : <Hash className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-foreground truncate">{projectTitle}</h1>
                <Badge variant="secondary" className="hidden sm:inline-flex bg-muted/60 text-muted-foreground border-none text-[10px]">
                  {isInbox ? "Inbox" : "Projeto"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {totalCount} tarefa{totalCount === 1 ? "" : "s"} · {pendingCount} pendente{pendingCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {!isInbox && dbProjectId && (
            <div className="shrink-0">
              <ProjectSettingsMenu
                projectId={dbProjectId} projectTitle={projectTitle}
                projectDescription={projectDescription} projectColor={projectColor}
              />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-6 md:px-8 py-8 space-y-8">

        {/* OVERVIEW: sobre + progresso */}
        <section className="space-y-4">
          {/* Sobre — a descrição que o usuário escreveu, legível e por extenso */}
          {!isInbox && project?.description?.trim() ? (
            <div className="rounded-2xl border border-border/40 bg-card shadow-sm p-5 space-y-2.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <AlignLeft className="h-3.5 w-3.5" /> Sobre
              </h2>
              <p className="text-[15px] text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                {project.description}
              </p>
            </div>
          ) : isInbox ? (
            <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">{projectDescription}</p>
          ) : null}

          <div className="rounded-2xl border border-border/40 bg-card shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Progresso</span>
              <span className="text-sm font-bold text-foreground">{progressPercent}%</span>
            </div>
            <Progress
              value={progressPercent}
              className="h-2 bg-muted/50"
              style={{ "--progress-foreground": accentColor } as React.CSSProperties}
            />
            <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4 text-sm">
              <span><span className="font-bold text-foreground">{totalCount}</span> <span className="text-xs text-muted-foreground">total</span></span>
              <span><span className="font-bold text-emerald-600">{doneCount}</span> <span className="text-xs text-muted-foreground">concluídas</span></span>
              <span><span className="font-bold text-amber-600">{pendingCount}</span> <span className="text-xs text-muted-foreground">pendentes</span></span>
            </div>
          </div>

          {/* Tags, Anexos & Relações (antes só no modal, agora na página) */}
          {!isInbox && dbProjectId && (
            <div className="rounded-2xl border border-border/40 bg-card shadow-sm p-5 space-y-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Tags, anexos & relações
              </h2>
              <EntityTags entityType="project" entityId={dbProjectId} />
              <EntityAttachments entityType="project" entityId={dbProjectId} />
              <EntityLinks entityType="project" entityId={dbProjectId} />
            </div>
          )}
        </section>

        {/* WORKSPACE */}
        <div className="w-full space-y-6">
          {/* Abas (navegação por URL — sem estado de cliente, sem mismatch de hidratação) */}
          <div className="inline-flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={buildUrl({ tab: t.key })}
                scroll={false}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                  activeTab === t.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </Link>
            ))}
          </div>

          {/* ABA TAREFAS */}
          {activeTab === "list" && (
          <div className="space-y-6 outline-none">

            {/* Controles: busca + view + filtro */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <form className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="q" placeholder="Buscar tarefas..." defaultValue={searchQuery}
                  className="pl-9 h-10 rounded-xl bg-muted/40 border-border/40 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/20"
                />
                <input type="hidden" name="filter" value={currentFilter} />
                <input type="hidden" name="sort" value={sortBy} />
                <input type="hidden" name="view" value={viewMode} />
              </form>

              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 shrink-0">
                  {[
                    { mode: 'list', icon: List },
                    { mode: 'grid', icon: LayoutGrid },
                    { mode: 'compact', icon: AlignJustify },
                    { mode: 'byday', icon: CalendarDays },
                    { mode: 'kanban', icon: Columns3 }
                  ].map((item) => (
                    <Link
                      key={item.mode}
                      href={buildUrl({ view: item.mode as ViewMode })}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        viewMode === item.mode ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </Link>
                  ))}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 rounded-xl border-border/40 gap-2 text-xs font-semibold px-3 shrink-0">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                      {FILTER_LABEL[currentFilter]}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-xl">
                    <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filtrar</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link href={buildUrl({ filter: "active" })}><DropdownMenuCheckboxItem checked={currentFilter === "active"} className="cursor-pointer text-sm">Pendentes</DropdownMenuCheckboxItem></Link>
                    <Link href={buildUrl({ filter: "completed" })}><DropdownMenuCheckboxItem checked={currentFilter === "completed"} className="cursor-pointer text-sm">Concluídas</DropdownMenuCheckboxItem></Link>
                    <Link href={buildUrl({ filter: "all" })}><DropdownMenuCheckboxItem checked={currentFilter === "all"} className="cursor-pointer text-sm">Todos</DropdownMenuCheckboxItem></Link>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Captura rápida */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Captura rápida</p>
              <TaskInput projectId={isInbox ? "inbox" : dbProjectId!} />
            </div>

            {/* Lista / Por dia / Kanban */}
            {isKanban ? (
              <TaskKanbanBoard initialTasks={tasks} />
            ) : tasks.length === 0 ? (
              <EmptyState search={!!searchQuery} />
            ) : viewMode === "byday" ? (
              <TasksByDay initialTasks={tasks} />
            ) : (
              <TaskReorderList initialTasks={tasks} viewMode={viewMode as "list" | "grid" | "compact"} />
            )}
          </div>
          )}

          {/* ABA NOTAS */}
          {activeTab === "notes" && (
            <div className="rounded-2xl border border-border/40 bg-card shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Notas do projeto</h2>
                  <p className="text-xs text-muted-foreground">Documentação, contexto e decisões</p>
                </div>
              </div>

              {isInbox ? (
                <div className="flex items-center justify-center bg-muted/10 border border-dashed border-border/40 rounded-2xl p-10 text-center">
                  <p className="text-sm text-muted-foreground">As notas ficam disponíveis dentro de um projeto específico, não na Caixa de Entrada.</p>
                </div>
              ) : (
                <ProjectNotes projectId={dbProjectId!} initialNotes={projectDescription || ""} />
              )}
            </div>
          )}

          {/* ABA REUNIÕES */}
          {activeTab === "meetings" && (
            <div className="rounded-2xl border border-border/40 bg-card shadow-sm p-6 md:p-8">
              <MeetingBoard meetings={meetings} projectId={dbProjectId} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState({ search }: { search: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/10 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        {search ? <Search className="h-8 w-8 text-muted-foreground/40" /> : <ListTodo className="h-8 w-8 text-muted-foreground/40" />}
      </div>
      <h3 className="text-lg font-bold text-foreground">
        {search ? "Nenhuma tarefa encontrada" : "Tudo em dia por aqui"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mt-1">
        {search
          ? "Tente outra busca ou ajuste o filtro."
          : "Sem tarefas pendentes. Capture uma nova ideia no campo acima."}
      </p>
      {search && (
        <Button variant="link" asChild className="mt-3 text-primary text-sm">
          <Link href="?">Limpar busca</Link>
        </Button>
      )}
    </div>
  );
}
