import { prisma } from "@/lib/prisma";
import { BodyDashboard } from "@/components/health/body/body-dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { User, AlertCircle } from "lucide-react";
import { BodyStats } from "@/lib/body-math";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Composição Corporal | Health",
  description: "Acompanhamento de medidas e bioimpedância.",
};

export default async function BodyPage() {
  let currentStats: BodyStats | null = null;
  let hasError = false;

  try {
    const metrics = await prisma.healthMetric.findMany({
      orderBy: { date: 'desc' },
      take: 100 
    });

    const getLatest = (type: string) => metrics.find(m => m.type === type)?.value || 0;

    currentStats = {
      weight: getLatest('WEIGHT'),
      height: getLatest('HEIGHT'),
      waist: getLatest('WAIST'),
      neck: getLatest('NECK'),
      hip: getLatest('HIP'),
      age: 25, 
      gender: 'MALE', 
      activityFactor: 1.55
    };
  } catch (error) {
    console.error("Erro ao carregar dados corporais:", error);
    hasError = true;
  }

  // Render Error State
  if (hasError || !currentStats) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-zinc-500">
        <AlertCircle className="h-10 w-10 mb-2" />
        <p>Não foi possível carregar os dados corporais.</p>
      </div>
    );
  }

  // Render Success State
  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black p-6 md:p-8">
      <PageHeader 
        title="Composição Corporal" 
        description="Bioimpedância digital e análise metabólica." 
        icon={User}
        iconColor="text-blue-600"
      />
      <BodyDashboard stats={currentStats} />
    </div>
  );
}