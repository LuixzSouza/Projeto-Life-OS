"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Plus, LayoutList, LineChart as LineChartIcon, Images } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

import { GymForm } from "./gym-form";
import { GymGallery } from "./session/gallery-view";
import { PlanBuilder } from "./plan-builder";
import { VolumeChart } from "./volume-chart";
import { MuscleFrequencyCard } from "./muscle-frequency-card";
import { MuscleRecoveryCard } from "./muscle-recovery-card";
import { WorkoutCard } from "./workout-card";
import type { GymWorkout, VolumePoint, MuscleCount } from "./gym-types";
import type { MuscleRecovery } from "./session/session-types";

export type { Exercise, GymWorkout } from "./gym-types";

export function GymDashboard({ workouts, recovery = [] }: { workouts: GymWorkout[]; recovery?: MuscleRecovery[] }) {
  const [selectedMuscle, setSelectedMuscle] = useState<string | 'ALL'>('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  // Abre direto na aba "Fichas" quando chega um link de importação (?planimport=),
  // garantindo que o PlanBuilder monte e dispare a importação.
  const [tab, setTab] = useState<string>(() =>
    typeof window !== "undefined" && /[?&]planimport=/.test(window.location.search) ? "planner" : "dashboard"
  );

  // --- Calculations & Memoization ---

  // 1. Volume Chart Data
  const volumeData = useMemo<VolumePoint[]>(() => {
    return workouts.slice(0, 10).reverse().map(w => {
      let totalLoad = 0;
      w.exercises.forEach(ex => {
        // Sessão ao vivo: soma real das séries feitas. Senão, resumo legado.
        if (ex.setLog && ex.setLog.length > 0) {
          ex.setLog.forEach(s => {
            if (s.done) totalLoad += (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0);
          });
        } else {
          const weight = parseFloat(ex.weight) || 0;
          const sets = parseFloat(ex.sets) || 0;
          const reps = parseFloat(ex.reps) || 0;
          totalLoad += (weight * sets * reps);
        }
      });
      return {
        date: format(new Date(w.date), "dd/MM"),
        fullDate: format(new Date(w.date), "dd 'de' MMMM", { locale: ptBR }),
        load: totalLoad,
        title: w.title
      };
    });
  }, [workouts]);

  // 2. Muscle Distribution
  const muscleDistribution = useMemo<MuscleCount[]>(() => {
    const counts: Record<string, number> = {};
    workouts.forEach(w => {
      const groups = (w.muscleGroup || "Geral").split(", ");
      groups.forEach(g => {
        counts[g] = (counts[g] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [workouts]);

  // 3. Filtering
  const filteredWorkouts = selectedMuscle === 'ALL'
    ? workouts
    : workouts.filter(w => (w.muscleGroup || "").includes(selectedMuscle));

  return (
    <div className="pb-12">
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">

        {/* Tabs Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="-mx-1 overflow-x-auto px-1 scrollbar-hide">
            <TabsList className="inline-flex w-auto bg-muted/50 p-1 rounded-xl h-auto">
              <TabsTrigger value="dashboard" className="shrink-0 gap-1.5 px-3 py-2 text-xs font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm sm:gap-2 sm:px-4">
                <LineChartIcon className="h-4 w-4" />
                Progresso
              </TabsTrigger>
              <TabsTrigger value="planner" className="shrink-0 gap-1.5 px-3 py-2 text-xs font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm sm:gap-2 sm:px-4">
                <LayoutList className="h-4 w-4" />
                Fichas
              </TabsTrigger>
              <TabsTrigger value="gallery" className="shrink-0 gap-1.5 px-3 py-2 text-xs font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm sm:gap-2 sm:px-4">
                <Images className="h-4 w-4" />
                Galeria
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Ação: registrar sessão manual (o "Treinar agora" agora é o hero no topo). */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 w-full gap-2 font-medium rounded-lg shadow-sm sm:w-auto">
                <Plus className="h-4 w-4" /> Registrar Sessão
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-border/40 shadow-xl rounded-2xl">
              <DialogHeader className="px-6 pt-6 pb-2">
                <DialogTitle className="text-xl">Novo Treino</DialogTitle>
                <DialogDescription>
                  Registre as cargas e volumes da sua sessão de hoje.
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 pb-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
                <GymForm onSuccess={() => setIsAddOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* --- TAB: DASHBOARD --- */}
        <TabsContent value="dashboard" className="m-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Stats (4/12) */}
            <div className="lg:col-span-4 space-y-6">
              <MuscleRecoveryCard recovery={recovery} />
              <VolumeChart data={volumeData} />
              <MuscleFrequencyCard distribution={muscleDistribution} />
            </div>

            {/* Right Column: Feed (8/12) */}
            <div className="lg:col-span-8 space-y-5">

              {/* Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMuscle('ALL')}
                  className={cn(
                    "rounded-full px-4 h-8 text-xs font-medium transition-all shadow-none",
                    selectedMuscle === 'ALL'
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  Todos
                </Button>
                {muscleDistribution.map(m => (
                  <Button
                    key={m.name}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMuscle(m.name)}
                    className={cn(
                      "rounded-full px-4 h-8 text-xs font-medium transition-all whitespace-nowrap shadow-none",
                      selectedMuscle === m.name
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {m.name} <span className="ml-1.5 opacity-60 font-mono text-[10px]">{m.value}</span>
                  </Button>
                ))}
              </div>

              {/* Feed List */}
              <div className="space-y-4">
                {filteredWorkouts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border/60 rounded-2xl bg-muted/5 text-center">
                    <div className="p-3 bg-muted/20 rounded-full mb-3">
                      <Dumbbell className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">Nenhum treino encontrado</h3>
                    <p className="text-xs text-muted-foreground mt-1">Ajuste os filtros ou registre sua sessão de hoje.</p>
                  </div>
                ) : (
                  filteredWorkouts.map((w) => (
                    <WorkoutCard key={w.id} workout={w} />
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* --- TAB: PLANNER (Fichas estruturadas: divisões A/B/C + metas tipadas) --- */}
        <TabsContent value="planner" className="m-0 focus-visible:outline-none">
          <PlanBuilder />
        </TabsContent>

        {/* --- TAB: GALERIA --- */}
        <TabsContent value="gallery" className="m-0 focus-visible:outline-none">
          <GymGallery />
        </TabsContent>

      </Tabs>
    </div>
  );
}
