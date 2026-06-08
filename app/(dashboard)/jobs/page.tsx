import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { JobTracker } from "@/components/projects/job-tracker";
import { Briefcase } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { getPortfolio } from "@/app/(dashboard)/projects/actions";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Vagas & Candidaturas | Life OS",
};

export default async function JobsPage() {
  const userId = await getCurrentUserId();

  const [jobs, portfolio, projects] = await Promise.all([
    prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { appliedDate: "desc" },
      include: {
        project: { select: { id: true, slug: true, title: true } },
        events: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } },
      },
    }),
    getPortfolio(),
    prisma.project.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, slug: true },
    }),
  ]);

  return (
    <PageShell>
      <PageHeader
        icon={<Briefcase className="h-6 w-6" />}
        title="Vagas & Candidaturas"
        description="Acompanhe suas inscrições, entrevistas e o status de cada processo."
      />

      <PageContainer>
        <JobTracker jobs={jobs} portfolio={portfolio} projects={projects} />
      </PageContainer>
    </PageShell>
  );
}
