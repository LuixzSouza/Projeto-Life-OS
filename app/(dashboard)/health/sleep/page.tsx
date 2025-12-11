import { prisma } from "@/lib/prisma";
import { SleepDashboard } from "@/components/health/sleep-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Moon } from "lucide-react";
import Link from "next/link";

export default async function SleepPage() {
  // 1. Buscar histórico de sono (últimos 30 dias para análise)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const sleepData = await prisma.healthMetric.findMany({
    where: {
      type: "SLEEP",
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" }, // Crescente para o gráfico
  });

  // Serializar datas para o cliente
  const serializedData = sleepData.map(item => ({
      id: item.id,
      date: item.date.toISOString(),
      value: item.value, // Horas dormidas
  }));

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link href="/health">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Moon className="h-6 w-6 text-indigo-500 fill-indigo-500" /> Monitor de Sono
                </h1>
                <p className="text-zinc-500 text-sm">Qualidade do descanso e recuperação.</p>
            </div>
        </div>
      </div>

      {/* Dashboard Interativo */}
      <SleepDashboard data={serializedData} />
    </div>
  );
}