import { prisma } from "@/lib/prisma";
import { logWorkout, logMetric } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Activity, Dumbbell, Scale, Droplets, Moon, Flame } from "lucide-react";
// Tipos
import { Workout, HealthMetric } from "@prisma/client";

export default async function HealthPage() {
  // 1. Buscar Histórico de Treinos
  const workouts: Workout[] = await prisma.workout.findMany({
    orderBy: { date: 'desc' },
    take: 5
  });

  // 2. Buscar Último Peso Registrado
  const lastWeight = await prisma.healthMetric.findFirst({
    where: { type: "WEIGHT" },
    orderBy: { date: 'desc' }
  });

  // 3. Buscar Água Hoje (Soma)
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const waterMetrics = await prisma.healthMetric.findMany({
    where: { 
      type: "WATER",
      date: { gte: today }
    }
  });
  const waterTotal = waterMetrics.reduce((acc: number, item: HealthMetric) => acc + item.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="text-red-500" /> Saúde & Performance
        </h1>
      </div>

      {/* KPIs (Indicadores Principais) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card Peso */}
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Peso Atual</CardTitle>
                <Scale className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{lastWeight?.value || "--"} kg</div>
                <p className="text-xs text-zinc-500">Último registro</p>
            </CardContent>
        </Card>

        {/* Card Água */}
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hidratação (Hoje)</CardTitle>
                <Droplets className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{waterTotal} ml</div>
                <p className="text-xs text-zinc-500">Meta: 3000 ml</p>
            </CardContent>
        </Card>

         {/* Card Treinos */}
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Treinos</CardTitle>
                <Dumbbell className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{workouts.length}</div>
                <p className="text-xs text-zinc-500">Registrados no total</p>
            </CardContent>
        </Card>
      </div>

      {/* Área Principal com Abas */}
      <Tabs defaultValue="workout" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="workout">Registrar Treino</TabsTrigger>
          <TabsTrigger value="metrics">Registrar Métricas</TabsTrigger>
        </TabsList>
        
        {/* ABA 1: TREINO */}
        <TabsContent value="workout" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Formulário */}
            <Card>
                <CardHeader><CardTitle>Novo Treino</CardTitle></CardHeader>
                <CardContent>
                    <form action={logWorkout} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Título</Label>
                            <Input name="title" placeholder="Ex: Musculação - Costas" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <select name="type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <option value="GYM">Academia</option>
                                    <option value="CARDIO">Corrida/Cardio</option>
                                    <option value="SPORT">Esporte</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Duração (min)</Label>
                                <Input name="duration" type="number" placeholder="60" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Intensidade</Label>
                            <select name="intensity" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option value="LOW">Baixa</option>
                                <option value="MEDIUM">Média</option>
                                <option value="HIGH">Alta 🔥</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Notas / Cargas</Label>
                            <Textarea name="notes" placeholder="Supino: 3x10 (20kg)..." />
                        </div>
                        <Button className="w-full bg-orange-600 hover:bg-orange-700">Salvar Treino</Button>
                    </form>
                </CardContent>
            </Card>

            {/* Lista Recente */}
            <Card>
                <CardHeader><CardTitle>Histórico Recente</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {workouts.map((w) => (
                            <div key={w.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
                                <div className="bg-orange-100 p-2 rounded-full dark:bg-orange-900/20">
                                    {w.intensity === 'HIGH' ? <Flame className="h-5 w-5 text-orange-600" /> : <Dumbbell className="h-5 w-5 text-orange-600" />}
                                </div>
                                <div>
                                    <p className="font-bold">{w.title}</p>
                                    <p className="text-xs text-zinc-500">
                                        {new Date(w.date).toLocaleDateString()} • {w.duration} min
                                    </p>
                                    {w.notes && <p className="text-sm mt-1 text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 p-2 rounded">{w.notes}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABA 2: MÉTRICAS */}
        <TabsContent value="metrics">
            <Card>
                <CardHeader>
                    <CardTitle>Atualizar Métricas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Form de Peso */}
                    <div className="flex items-end gap-4 border-b pb-6">
                        <form action={logMetric} className="flex items-end gap-4 w-full">
                            <div className="space-y-2 flex-1">
                                <Label>Registrar Peso Atual (kg)</Label>
                                <Input name="value" type="number" step="0.1" placeholder="0.00" required />
                                <input type="hidden" name="type" value="WEIGHT" />
                            </div>
                            <Button type="submit"><Scale className="mr-2 h-4 w-4" /> Salvar Peso</Button>
                        </form>
                    </div>

                    {/* Form de Água */}
                    <div className="flex items-end gap-4">
                        <form action={logMetric} className="flex items-end gap-4 w-full">
                            <div className="space-y-2 flex-1">
                                <Label>Registrar Água (ml)</Label>
                                <Input name="value" type="number" placeholder="250" required />
                                <input type="hidden" name="type" value="WATER" />
                            </div>
                            <Button type="submit" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                                <Droplets className="mr-2 h-4 w-4" /> Adicionar Copo
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}