// Conteudo autenticado por-usuario: render por requisicao (nunca prerender no build).
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { JobTracker } from "@/components/projects/job-tracker";
import { Briefcase } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { listResumes } from "./resume-actions";
import { parseSnapshotMeta } from "@/types/resume-snapshot";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { AskAiButton } from "@/components/ai/ask-ai-button";

export const metadata: Metadata = {
  title: "Vagas & Candidaturas | Life OS",
};

export default async function JobsPage() {
  const userId = await getCurrentUserId();

  const [jobs, resumes, projects] = await Promise.all([
    prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { appliedDate: "desc" },
      include: {
        project: { select: { id: true, slug: true, title: true } },
        events: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } },
      },
    }),
    listResumes(),
    prisma.project.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, slug: true },
    }),
  ]);

  // O snapshot (JSON de currículo, ~10-30 KB por vaga) NÃO vai ao client na lista:
  // trafega só o metadado leve. O PDF exato busca o snapshot completo sob demanda.
  const jobsClient = jobs.map((j) => ({
    ...j,
    resumeSnapshot: null,
    snapshotMeta: parseSnapshotMeta(j.resumeSnapshot),
  }));

  return (
    <PageShell>
      <PageHeader
        icon={<Briefcase className="h-6 w-6" />}
        title="Vagas & Candidaturas"
        description="Acompanhe suas inscrições, entrevistas e o status de cada processo."
        actions={<AskAiButton q="Como está meu funil de vagas? Algum processo parado precisando de follow-up?" label="Analisar com IA" />}
      />

      <PageContainer>
        <JobTracker jobs={jobsClient} resumes={resumes} projects={projects} />
      </PageContainer>
    </PageShell>
  );
}
