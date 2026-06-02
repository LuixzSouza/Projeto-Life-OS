import { prisma } from "@/lib/prisma";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { ProjectsExplorer, type ProjectItem } from "@/components/projects/projects-explorer";
import { Layers, ListTodo, CheckCircle2, Gauge } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { StatCard } from "@/components/ui/stat-card";

export const metadata = { title: "Projetos | Life OS" };

export default async function ProjectsPage() {
  const userId = await getCurrentUserId();

  const [projects, inboxStats, inboxCompleted] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, slug: true, title: true, description: true, status: true, color: true, updatedAt: true,
        _count: { select: { tasks: true } },
        tasks: { where: { isDone: true }, select: { id: true } },
      },
    }),
    prisma.task.aggregate({ where: { projectId: null, userId }, _count: { id: true } }),
    prisma.task.count({ where: { projectId: null, isDone: true, userId } }),
  ]);

  // Serialização para o explorador (client).
  const serialized: ProjectItem[] = projects.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    status: p.status,
    color: p.color,
    updatedAt: p.updatedAt.toISOString(),
    totalTasks: p._count.tasks,
    completedTasks: p.tasks.length,
  }));

  // KPIs agregados (projetos + inbox).
  const inboxTotal = inboxStats._count.id;
  const totalTasks = projects.reduce((a, p) => a + p._count.tasks, 0) + inboxTotal;
  const totalCompleted = projects.reduce((a, p) => a + p.tasks.length, 0) + inboxCompleted;
  const totalPending = totalTasks - totalCompleted;
  const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return (
    <PageShell>
      <PageHeader
        icon={<Layers className="h-6 w-6" />}
        title="Projetos"
        description={`${projects.length} projeto${projects.length === 1 ? "" : "s"} · ${totalPending} pendência${totalPending === 1 ? "" : "s"}`}
        actions={<NewProjectDialog />}
      />

      <PageContainer className="space-y-8">
        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Projetos" value={projects.length} hint="ativos no workspace" icon={Layers} iconClassName="text-primary bg-primary/10" />
          <StatCard label="Pendentes" value={totalPending} hint="tarefas em aberto" icon={ListTodo} iconClassName="text-amber-600 bg-amber-500/10" />
          <StatCard label="Concluídas" value={totalCompleted} hint="tarefas finalizadas" icon={CheckCircle2} iconClassName="text-emerald-600 bg-emerald-500/10" />
          <StatCard label="Conclusão" value={`${completionRate}%`} hint="do total de tarefas" icon={Gauge} iconClassName="text-blue-600 bg-blue-500/10" />
        </section>

        {/* Explorador (Inbox + busca/filtro/ordenação + grid) */}
        <ProjectsExplorer projects={serialized} inbox={{ total: inboxTotal, completed: inboxCompleted }} />
      </PageContainer>
    </PageShell>
  );
}
