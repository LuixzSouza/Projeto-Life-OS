"use client";

// Dependências da tarefa ("bloqueada por") — EntityLink kind BLOCKS.
// Lista as outras tarefas do projeto; marcar uma a torna bloqueadora desta.

import { useEffect, useState, useTransition } from "react";
import { Lock, LockOpen, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getTaskDependencyState, setTaskBlockers, type TaskDependencyState,
} from "@/app/(dashboard)/projects/actions";

export function TaskBlockersEditor({ taskId }: { taskId: string }) {
  const [state, setState] = useState<TaskDependencyState | null>(null);
  const [, startSave] = useTransition();

  useEffect(() => {
    let active = true;
    getTaskDependencyState(taskId)
      .then((s) => { if (active) setState(s); })
      .catch(() => { if (active) setState({ candidates: [], blockerIds: [] }); });
    return () => { active = false; };
  }, [taskId]);

  if (state === null) {
    return (
      <div className="space-y-2">
        <Header blockedCount={0} />
        <p className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
        </p>
      </div>
    );
  }

  if (state.candidates.length === 0) return null; // sem outras tarefas, sem dependências

  const toggle = (blockerId: string, checked: boolean) => {
    const next = checked
      ? [...state.blockerIds, blockerId]
      : state.blockerIds.filter((id) => id !== blockerId);
    setState({ ...state, blockerIds: next });
    startSave(async () => {
      const res = await setTaskBlockers(taskId, next);
      if (res.error) toast.error(res.error);
    });
  };

  const activeBlockers = state.candidates.filter((c) => state.blockerIds.includes(c.id) && !c.isDone);

  return (
    <div className="space-y-2">
      <Header blockedCount={activeBlockers.length} />
      {activeBlockers.length > 0 && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600">
          Bloqueada por {activeBlockers.length} tarefa{activeBlockers.length === 1 ? "" : "s"} pendente{activeBlockers.length === 1 ? "" : "s"} — conclua-a{activeBlockers.length === 1 ? "" : "s"} para liberar.
        </p>
      )}
      <ul className="max-h-44 space-y-0.5 overflow-y-auto custom-scrollbar pr-1">
        {state.candidates.map((c) => (
          <li key={c.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors">
            <Checkbox
              checked={state.blockerIds.includes(c.id)}
              onCheckedChange={(v) => toggle(c.id, v === true)}
            />
            <span className={cn("flex-1 truncate text-sm", c.isDone && "line-through text-muted-foreground")}>
              {c.title}
            </span>
            {c.isDone && <span className="text-[10px] font-semibold text-emerald-600 shrink-0">feita</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Header({ blockedCount }: { blockedCount: number }) {
  return (
    <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {blockedCount > 0
        ? <Lock size={13} className="text-amber-500" />
        : <LockOpen size={13} />}
      Bloqueada por
    </label>
  );
}
