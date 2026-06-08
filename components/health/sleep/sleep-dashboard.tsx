"use client";

import { useMemo, useState } from "react";
import { subDays, isSameDay, parseISO, eachDayOfInterval, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { deleteMetric } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Minus, Plus, Moon } from "lucide-react";

import { type SleepEntry, type SleepChartPoint } from "./sleep-types";
import { computeSleepInsights } from "@/lib/sleep-math";
import { useSleepGoal } from "./use-sleep-goal";
import { SleepStats } from "./sleep-stats";
import { LogSleepDialog } from "./log-sleep-dialog";
import { SleepTrendChart } from "./sleep-trend-chart";
import { SleepInsightCard } from "./sleep-insight-card";
import { SleepHistoryCard } from "./sleep-history-card";
import { BedtimeCalculator } from "./bedtime-calculator";

export function SleepDashboard({ data, initialGoal }: { data: SleepEntry[]; initialGoal?: number | null }) {
  const [goal, setGoal] = useSleepGoal(initialGoal);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const insights = useMemo(() => computeSleepInsights(data, goal), [data, goal]);

  // Dados do Gráfico (14 dias)
  const chartData = useMemo<SleepChartPoint[]>(() => {
    const end = new Date();
    const start = subDays(end, 13);
    const interval = eachDayOfInterval({ start, end });

    return interval.map(date => {
      const entry = data.find(d => isSameDay(parseISO(d.date), date));
      return {
        day: format(date, "dd/MM"),
        fullDate: format(date, "d 'de' MMMM", { locale: ptBR }),
        hours: entry ? entry.value : 0,
        quality: entry ? (entry.value >= goal ? "good" : "bad") : "none",
      };
    });
  }, [data, goal]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteMetric(toDelete);
    toast.success("Registro removido.");
    setToDelete(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">

      {/* META EDITÁVEL */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Painel de Recuperação</h2>
          <p className="text-xs text-muted-foreground mt-1">Adultos precisam de 7 a 9 horas para recuperação ideal.</p>
        </div>
        <div className="flex items-center gap-3 h-11 px-4 rounded-xl border border-border/50 bg-muted/20">
          <Moon className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Meta de sono</span>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setGoal(goal - 0.5)}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-14 text-center font-bold font-mono text-sm">{goal}h</span>
            <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setGoal(goal + 0.5)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SleepStats insights={insights} goal={goal} />
      </div>

      {/* GRÁFICO + REGISTRAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SleepTrendChart data={chartData} goal={goal} />
        <LogSleepDialog goal={goal} />
      </div>

      {/* FERRAMENTAS + COACH + HISTÓRICO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <BedtimeCalculator />
          <SleepInsightCard insights={insights} goal={goal} />
        </div>
        <div className="lg:col-span-2">
          <SleepHistoryCard data={data} onDelete={(id) => setToDelete(id)} />
        </div>
      </div>

      {/* Exclusão de registro de sono — modal único padronizado (sem confirm() nativo) */}
      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este registro de sono?</AlertDialogTitle>
            <AlertDialogDescription>O registro será removido permanentemente do seu histórico.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
