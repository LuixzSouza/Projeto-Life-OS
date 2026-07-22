"use client";

// QUADRO DE ESTUDO (Kanban) — item D2 do docs/ESTUDOS_ROADMAP.md.
// Roubado do Trello, mas com vocabulário de estudo: Para estudar / Estudando /
// Revisar / Dominado. ZERO schema novo: reusa `LearningGoal.status` (String).
//
// Arrastar usa HTML5 DnD (desktop). No toque, arrastar não dispara — por isso
// cada card também tem setas ‹ › para mover de coluna. Mesma regra, dois caminhos.

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Flag, GraduationCap, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  GOAL_COLUMNS, deadlineChip, normalizeGoalStatus, priorityMeta, shiftGoalStatus,
  type GoalStatus,
} from "./goal-helpers";
import type { GoalData } from "@/app/(dashboard)/goals/actions";

interface GoalsBoardProps {
  goals: GoalData[];
  /** Abre o diálogo de edição da meta. */
  onOpen: (goal: GoalData) => void;
  /** Persiste a mudança de coluna (o pai faz a atualização otimista). */
  onMove: (goal: GoalData, next: GoalStatus) => void;
  /** Cria uma meta já na coluna clicada. */
  onCreate: (status: GoalStatus) => void;
}

export function GoalsBoard({ goals, onOpen, onMove, onCreate }: GoalsBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<GoalStatus | null>(null);

  // Uma passada só: agrupa por coluna e ordena (atrasadas > prazo mais perto > prioridade).
  const byColumn = useMemo(() => {
    const map = new Map<GoalStatus, GoalData[]>(GOAL_COLUMNS.map((c) => [c.key, [] as GoalData[]]));
    for (const g of goals) map.get(normalizeGoalStatus(g.status))!.push(g);
    for (const list of map.values()) {
      list.sort((a, b) => {
        const da = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
        const db = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
        if (da !== db) return da - db;
        return b.priority - a.priority;
      });
    }
    return map;
  }, [goals]);

  const drop = (target: GoalStatus) => {
    setOverColumn(null);
    const goal = goals.find((g) => g.id === draggingId);
    setDraggingId(null);
    if (goal && normalizeGoalStatus(goal.status) !== target) onMove(goal, target);
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
      {GOAL_COLUMNS.map((col) => {
        const list = byColumn.get(col.key) ?? [];
        const Icon = col.icon;
        return (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); setOverColumn(col.key); }}
            onDragLeave={() => setOverColumn((prev) => (prev === col.key ? null : prev))}
            onDrop={(e) => { e.preventDefault(); drop(col.key); }}
            className={cn(
              "flex min-h-[220px] flex-col rounded-2xl border bg-muted/20 p-3 transition-colors",
              overColumn === col.key ? "border-primary/50 bg-primary/5" : "border-border/40",
            )}
          >
            {/* Cabeçalho da coluna */}
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md", col.soft)}>
                  <Icon className={cn("h-3.5 w-3.5", col.accent)} />
                </span>
                <span className="truncate text-[11px] font-bold uppercase tracking-widest text-foreground/80">
                  {col.label}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full border border-border/40 bg-background px-1.5 text-[10px] font-bold text-muted-foreground">
                  {list.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                  onClick={() => onCreate(col.key)}
                  title={`Nova meta em "${col.label}"`}
                  aria-label={`Nova meta em ${col.label}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2.5">
              {list.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-border/40 py-8 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  Solte aqui
                </div>
              ) : (
                list.map((goal) => (
                  <BoardCard
                    key={goal.id}
                    goal={goal}
                    dragging={draggingId === goal.id}
                    onDragStart={() => setDraggingId(goal.id)}
                    onDragEnd={() => { setDraggingId(null); setOverColumn(null); }}
                    onOpen={() => onOpen(goal)}
                    onMove={onMove}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoardCard({
  goal, dragging, onDragStart, onDragEnd, onOpen, onMove,
}: {
  goal: GoalData;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
  onMove: (goal: GoalData, next: GoalStatus) => void;
}) {
  const status = normalizeGoalStatus(goal.status);
  const isDone = status === "DONE";
  const pr = priorityMeta(goal.priority);
  const chip = deadlineChip(goal.targetDate, isDone);
  const progress = goal.totalTasks > 0 ? Math.round((goal.doneTasks / goal.totalTasks) * 100) : 0;
  const prev = shiftGoalStatus(status, -1);
  const next = shiftGoalStatus(status, 1);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={cn(
        "group cursor-grab rounded-xl border border-border/50 bg-card p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("line-clamp-3 text-sm font-semibold leading-snug", isDone && "text-muted-foreground line-through")}>
          {goal.title}
        </p>
        {!isDone && goal.priority >= 5 && (
          <Badge className={cn("shrink-0 gap-1 border-none text-[9px]", pr.className)}>
            <Flag className="h-2.5 w-2.5" /> {pr.label}
          </Badge>
        )}
      </div>

      {goal.totalTasks > 0 && (
        <div className="mt-2.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="font-medium">{goal.doneTasks}/{goal.totalTasks} passos</span>
            <span className="font-bold text-foreground">{isDone ? 100 : progress}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", isDone || progress === 100 ? "bg-emerald-500" : "bg-primary")}
              style={{ width: `${isDone ? 100 : progress}%` }}
            />
          </div>
        </div>
      )}

      {(goal.subjectTitle || chip) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {goal.subjectTitle && (
            <Badge
              variant="secondary"
              className="gap-1 border-none text-[9px]"
              style={{ backgroundColor: `${goal.subjectColor ?? "#6366f1"}1a`, color: goal.subjectColor ?? "#6366f1" }}
            >
              <GraduationCap className="h-2.5 w-2.5" /> {goal.subjectTitle}
            </Badge>
          )}
          {chip && (
            <span className={cn("inline-flex items-center gap-1 text-[9px]", chip.className)}>
              {chip.urgent ? <AlertTriangle className="h-2.5 w-2.5" /> : <CalendarDays className="h-2.5 w-2.5" />}
              {chip.label}
            </span>
          )}
        </div>
      )}

      {/* Mover sem arrastar (toque + teclado). Visível no mobile, no hover no desktop. */}
      <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-1.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <Button
          variant="ghost" size="icon" className="h-6 w-6"
          disabled={!prev}
          onClick={(e) => { e.stopPropagation(); if (prev) onMove(goal, prev); }}
          title="Mover para a coluna anterior"
          aria-label="Mover meta para a coluna anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon" className="h-6 w-6"
          disabled={!next}
          onClick={(e) => { e.stopPropagation(); if (next) onMove(goal, next); }}
          title="Mover para a próxima coluna"
          aria-label="Mover meta para a próxima coluna"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
