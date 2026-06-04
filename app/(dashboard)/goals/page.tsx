import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { Target } from "lucide-react";
import { getGoals, getGoalSubjects } from "./actions";
import { GoalsClient } from "@/components/goals/goals-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Metas de Aprendizado | Life OS" };

export default async function GoalsPage() {
  const [goals, subjects] = await Promise.all([getGoals(), getGoalSubjects()]);

  return (
    <PageShell>
      <PageHeader
        icon={<Target className="h-5 w-5" />}
        title="Metas de Aprendizado"
        description="Defina objetivos, quebre em passos e acompanhe o progresso — conectado ao resto do Life OS."
      />
      <PageContainer>
        <GoalsClient initialGoals={goals} subjects={subjects} />
      </PageContainer>
    </PageShell>
  );
}
