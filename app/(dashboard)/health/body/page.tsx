import { prisma } from "@/lib/prisma";
import { BodyDashboard } from "@/components/health/body-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { BodyStats } from "@/lib/body-math";

export default async function BodyPage() {
  // Buscar histórico recente de métricas para pegar o último valor de cada tipo
  const metrics = await prisma.healthMetric.findMany({
    orderBy: { date: 'desc' },
    take: 100 // Pega os últimos 100 registros para garantir que achamos todos os tipos
  });

  const getLatest = (type: string) => metrics.find(m => m.type === type)?.value || 0;

  // Mock de dados do usuário (Futuramente pegar da tabela User)
  const currentStats: BodyStats = {
    weight: getLatest('WEIGHT'),
    height: getLatest('HEIGHT'),
    waist: getLatest('WAIST'),
    neck: getLatest('NECK'),
    hip: getLatest('HIP'),
    age: 25, // Default ou buscar do User.birthDate
    gender: 'MALE', // Default ou buscar do User.gender
    activityFactor: 1.55 // Moderado default
  };

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
                    <User className="h-6 w-6 text-blue-600" /> Composição Corporal
                </h1>
                <p className="text-zinc-500 text-sm">Bioimpedância digital e análise metabólica.</p>
            </div>
        </div>
      </div>

      <BodyDashboard stats={currentStats} />
    </div>
  );
}