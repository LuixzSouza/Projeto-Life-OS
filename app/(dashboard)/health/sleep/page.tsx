import { prisma } from "@/lib/prisma";
import { SleepDashboard } from "@/components/health/sleep/sleep-dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { Moon, AlertCircle } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sono | Health",
  description: "Monitoramento da qualidade do sono.",
};

// ✅ Interface para dados de sono
interface SerializedSleepData {
  id: string;
  date: string;
  value: number;
}

export default async function SleepPage() {
  // ✅ Inicialização tipada
  let serializedData: SerializedSleepData[] = [];
  let hasError = false;

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const sleepData = await prisma.healthMetric.findMany({
      where: {
        type: "SLEEP",
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    });

    serializedData = sleepData.map(item => ({
      id: item.id,
      date: item.date.toISOString(),
      value: item.value,
    }));
  } catch (error) {
    console.error("Erro ao carregar dados de sono:", error);
    hasError = true;
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-zinc-500">
        <AlertCircle className="h-10 w-10 mb-2" />
        <p>Erro ao carregar dados de sono.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black p-6 md:p-8">
      <PageHeader 
        title="Monitor de Sono" 
        description="Qualidade do descanso e recuperação." 
        icon={Moon}
        iconColor="text-indigo-500 fill-indigo-500"
      />
      <SleepDashboard data={serializedData} />
    </div>
  );
}