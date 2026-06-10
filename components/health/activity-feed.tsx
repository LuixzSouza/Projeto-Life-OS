"use client";

import { useState, useMemo } from "react";
import { Workout } from "@prisma/client";
import { ChevronDown, History } from "lucide-react";
import { deleteWorkout } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { ActivityFilter, ActivityStatsData } from "./activity/activity-types";
import { ActivityStats } from "./activity/activity-stats";
import { ActivityFilters } from "./activity/activity-filters";
import { ActivityCard } from "./activity/activity-card";
import { EntityConnectionsDialog } from "@/components/connect/entity-connections-dialog";

function dayLabel(dateKey: string): string {
  const d = new Date(dateKey);
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "EEE, dd 'de' MMMM", { locale: ptBR });
}

// Feed compacto estilo extrato: toolbar fina + linhas expansíveis agrupadas por dia.
// Pensado para viver dentro do card-moldura da página (sem card dentro de card).
export function ActivityFeed({ initialWorkouts }: { initialWorkouts: Workout[] }) {
  const [filter, setFilter] = useState<ActivityFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [connWorkout, setConnWorkout] = useState<{ id: string; title: string } | null>(null);

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
      toast.success("Treino removido do histórico.");
    } else {
      toast.error("Não foi possível excluir. Tente de novo.");
    }
  };

  return (
    <div>
      {/* Toolbar: busca + filtros + resumo, tudo compacto */}
      <div className="space-y-2 border-b border-border/40 bg-muted/20 p-3">
        <ActivityFilters
          filter={filter}
          setFilter={setFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        <ActivityStats stats={stats} />
      </div>

      {/* Lista agrupada por dia */}
      {Object.keys(groupedWorkouts).length === 0 ? (
        <EmptyState hasFilter={filter !== 'ALL' || searchTerm.trim().length > 0} />
      ) : (
        Object.entries(groupedWorkouts).map(([dateKey, items]) => (
          <div key={dateKey}>
            <div className="flex items-center justify-between border-b border-border/30 bg-muted/30 px-3.5 py-1.5 sm:px-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground first-letter:uppercase">
                {dayLabel(dateKey)}
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground/60">
                {items.length} {items.length === 1 ? "treino" : "treinos"}
              </span>
            </div>
            <div className="divide-y divide-border/30">
              {items.map((w) => (
                <ActivityCard
                  key={w.id}
                  workout={w}
                  expanded={expandedId === w.id}
                  onToggle={() => setExpandedId((cur) => (cur === w.id ? null : w.id))}
                  onDelete={handleDelete}
                  onConnections={(wk) => setConnWorkout({ id: wk.id, title: wk.title })}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Carregar mais (linha discreta no rodapé da lista) */}
      {visibleCount < filteredWorkouts.length && (
        <button
          type="button"
          onClick={() => setVisibleCount(prev => prev + 10)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border/40 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Mostrar mais ({filteredWorkouts.length - visibleCount})
        </button>
      )}

      <EntityConnectionsDialog
        entityType="workout"
        item={connWorkout}
        onOpenChange={(o) => !o && setConnWorkout(null)}
      />
    </div>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40">
        <History className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <h3 className="text-sm font-semibold">{hasFilter ? "Nada encontrado" : "Nenhum treino ainda"}</h3>
      <p className="max-w-[260px] text-xs text-muted-foreground">
        {hasFilter
          ? "Ajuste a busca ou o filtro para encontrar seus treinos."
          : "Registre um treino ou inicie uma sessão ao vivo — seu histórico aparece aqui."}
      </p>
    </div>
  );
}
