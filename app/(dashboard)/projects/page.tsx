import { prisma } from "@/lib/prisma";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { ProjectsExplorer, type ProjectItem, type TaskSummary } from "@/components/projects/projects-explorer";
import { Layers, ListTodo, CheckCircle2, Gauge } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { StatCard } from "@/components/ui/stat-card";

export const metadata = { title: "Projetos | Life OS" };

// Campos mínimos de tarefa para montar o resumo do card (prazos, ritmo, prioridade).
interface TaskSlim {
  isDone: boolean;
  dueDate: Date | null;
  priority: string;
  updatedAt: Date;
}

// Resume as tarefas de um projeto (ou da inbox) nos sinais exibidos no card.
function summarizeTasks(tasks: TaskSlim[], todayStart: Date, weekAgo: Date): TaskSummary {
  const open = tasks.filter((t) => !t.isDone);
  const upcoming = open
    .map((t) => t.dueDate)
    .filter((d): d is Date => d !== null && d >= todayStart)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    totalTasks: tasks.length,
    completedTasks: tasks.length - open.length,
    overdueTasks: open.filter((t) => t.dueDate !== null && t.dueDate < todayStart).length,
    nextDue: upcoming.length > 0 ? upcoming[0].toISOString() : null,
    doneThisWeek: tasks.filter((t) => t.isDone && t.updatedAt >= weekAgo).length,
    highPriority: open.filter((t) => t.priority === "HIGH").length,
  };
}

export default async function ProjectsPage() {
  const userId = await getCurrentUserId();

  const taskSelect = { isDone: true, dueDate: true, priority: true, updatedAt: true } as const;

  const [projects, inboxTasks] = await Promise.all([
    prisma.project.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, slug: true, title: true, description: true, status: true, color: true, updatedAt: true, paraType: true,
        dueDate: true,
        tasks: { where: { deletedAt: null }, select: taskSelect },
      },
    }),
    prisma.task.findMany({ where: { projectId: null, userId, deletedAt: null }, select: taskSelect }),
  ]);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Serialização para o explorador (client).
  const serialized: ProjectItem[] = projects.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    status: p.status,
    color: p.color,
    paraType: p.paraType,
    updatedAt: p.updatedAt.toISOString(),
    dueDate: p.dueDate?.toISOString() ?? null,
    ...summarizeTasks(p.tasks, todayStart, weekAgo),
  }));

  const inboxSummary = summarizeTasks(inboxTasks, todayStart, weekAgo);

  // KPIs agregados (projetos + inbox) — templates ficam de fora das contas.
  const real = serialized.filter((p) => p.status !== "TEMPLATE");
  const totalTasks = real.reduce((a, p) => a + p.totalTasks, 0) + inboxSummary.totalTasks;
  const totalCompleted = real.reduce((a, p) => a + p.completedTasks, 0) + inboxSummary.completedTasks;
  const totalOverdue = real.reduce((a, p) => a + p.overdueTasks, 0) + inboxSummary.overdueTasks;
  const totalPending = totalTasks - totalCompleted;
  const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return (
    <PageShell>
      <PageHeader
        icon={<Layers className="h-6 w-6" />}
        title="Projetos"
        description={`${real.length} projeto${real.length === 1 ? "" : "s"} · ${totalPending} pendência${totalPending === 1 ? "" : "s"}`}
        actions={<NewProjectDialog />}
      />

      <PageContainer className="space-y-8">
        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Projetos" value={real.length} hint="ativos no workspace" icon={Layers} iconClassName="text-primary bg-primary/10" />
          <StatCard
            label="Pendentes"
            value={totalPending}
            hint={totalOverdue > 0 ? `${totalOverdue} com prazo vencido` : "tarefas em aberto"}
            icon={ListTodo}
            iconClassName={totalOverdue > 0 ? "text-rose-600 bg-rose-500/10" : "text-amber-600 bg-amber-500/10"}
          />
          <StatCard label="Concluídas" value={totalCompleted} hint="tarefas finalizadas" icon={CheckCircle2} iconClassName="text-emerald-600 bg-emerald-500/10" />
          <StatCard label="Conclusão" value={`${completionRate}%`} hint="do total de tarefas" icon={Gauge} iconClassName="text-blue-600 bg-blue-500/10" />
        </section>

        {/* Explorador (Inbox + busca/filtro/ordenação + grid) */}
        <ProjectsExplorer projects={serialized} inbox={inboxSummary} />
      </PageContainer>
    </PageShell>
  );
}
