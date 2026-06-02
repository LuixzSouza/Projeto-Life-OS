"use client";

import { useState, useMemo } from "react";
import { Workout } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ChevronDown, ListFilter, History, type LucideIcon } from "lucide-react";
import { deleteWorkout } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { ActivityFilter, ActivityStatsData } from "./activity/activity-types";
import { ActivityStats } from "./activity/activity-stats";
import { ActivityFilters } from "./activity/activity-filters";
import { ActivityCard } from "./activity/activity-card";

// --- COMPONENTE PRINCIPAL ---
export function ActivityFeed({ initialWorkouts }: { initialWorkouts: Workout[] }) {
  const [filter, setFilter] = useState<ActivityFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);

  const filteredWorkouts = useMemo(() => {
    return initialWorkouts.filter(w => {
      const matchesType = filter === 'ALL'
        ? true
        : filter === 'GYM' ? w.type === 'GYM'
          : (w.type === 'RUN' || w.type === 'RUNNING');

      const searchLower = searchTerm.toLowerCase();
      const titleMatch = w.title?.toLowerCase().includes(searchLower) ?? false;
      const notesMatch = w.notes?.toLowerCase().includes(searchLower) ?? false;

      return matchesType && (titleMatch || notesMatch);
    });
  }, [initialWorkouts, filter, searchTerm]);

  const stats = useMemo<ActivityStatsData>(() => {
    const totalDuration = filteredWorkouts.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const totalCaloriesEst = Math.round(totalDuration * 8);
    return { count: filteredWorkouts.length, duration: totalDuration, calories: totalCaloriesEst };
  }, [filteredWorkouts]);

  const visibleWorkouts = filteredWorkouts.slice(0, visibleCount);

  const groupedWorkouts = useMemo(() => {
    const groups: Record<string, Workout[]> = {};
    visibleWorkouts.forEach(workout => {
      const dateKey = new Date(workout.date).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(workout);
    });
    return groups;
  }, [visibleWorkouts]);

  const handleDelete = async (id: string) => {
    const result = await deleteWorkout(id);
    if (result.success) {
      toast.success("Log de atividade removido.");
    } else {
      toast.error("Falha ao deletar.");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">

      {/* PAINEL DE CONTROLE DE ATIVIDADE */}
      <div className="bg-card border border-border/40 rounded-[2.5rem] shadow-2xl overflow-hidden p-2">
        <div className="p-6 md:p-8 space-y-8">
          <ActivityStats stats={stats} />
          <SeparatorWithIcon icon={ListFilter} />
          <ActivityFilters
            filter={filter}
            setFilter={setFilter}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </div>
      </div>

      {/* TIMELINE DE LOGS */}
      <div className="relative pl-6 md:pl-10">
        {/* Linha de Conexão Vertical Estilizada */}
        <div className="absolute left-2.5 md:left-[19px] top-4 bottom-0 w-px bg-gradient-to-b from-primary/50 via-border/40 to-transparent z-0" />

        {Object.keys(groupedWorkouts).length === 0 ? (
          <EmptyState />
        ) : (
          Object.entries(groupedWorkouts).map(([dateKey, items]) => (
            <div key={dateKey} className="relative z-10 mb-12">
              {/* Marcador de Data */}
              <div className="flex items-center gap-4 mb-6 -ml-[22px] md:-ml-[31px]">
                <div className="h-6 w-6 rounded-full bg-background border-2 border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] flex items-center justify-center z-20">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
                <div className="bg-muted/40 backdrop-blur-md border border-border/40 px-4 py-1.5 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70">
                    {isToday(new Date(dateKey)) ? "Hoje" : isYesterday(new Date(dateKey)) ? "Ontem" : format(new Date(dateKey), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {items.map((w) => (
                  <ActivityCard key={w.id} workout={w} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CARREGAR MAIS */}
      {visibleCount < filteredWorkouts.length && (
        <div className="flex justify-center pb-10">
          <Button
            variant="outline"
            onClick={() => setVisibleCount(prev => prev + 5)}
            className="rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 px-8 border-border/60 hover:bg-muted shadow-lg transition-all active:scale-95"
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            Expandir Histórico ({filteredWorkouts.length - visibleCount})
          </Button>
        </div>
      )}
    </div>
  );
}

// --- HELPERS UI ---

function SeparatorWithIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="relative flex items-center py-4">
      <div className="flex-grow border-t border-border/40"></div>
      <div className="mx-4 p-1.5 rounded-lg bg-muted/30 border border-border/60">
        <Icon className="h-3 w-3 text-muted-foreground/40" />
      </div>
      <div className="flex-grow border-t border-border/40"></div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-border/40 rounded-[3rem] bg-muted/5 opacity-50">
      <div className="h-20 w-20 bg-muted/40 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
        <History className="h-10 w-10 text-muted-foreground/30" />
      </div>
      <h3 className="text-xl font-black uppercase tracking-tighter">Fila Vazia</h3>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-3 max-w-[280px] leading-relaxed">
        Nenhuma atividade detectada para este filtro. Inicie um log agora.
      </p>
    </div>
  );
}
