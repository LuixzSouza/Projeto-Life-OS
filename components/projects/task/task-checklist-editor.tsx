"use client";

// Checklist (subtarefas) dentro do modal da tarefa. Salva sozinha (debounce no
// blur/toggle) — independente do botão "Salvar" do modal, sem estado perdido.

import { useState, useTransition } from "react";
import { Plus, X, ListTodo } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateTaskChecklist } from "@/app/(dashboard)/projects/actions";
import { parseChecklist, type TaskChecklistItem } from "@/lib/task-checklist";

export function TaskChecklistEditor({ taskId, initialRaw }: { taskId: string; initialRaw: string | null }) {
  const [items, setItems] = useState<TaskChecklistItem[]>(() => parseChecklist(initialRaw));
  const [draft, setDraft] = useState("");
  const [, startSave] = useTransition();

  const persist = (next: TaskChecklistItem[]) => {
    setItems(next);
    startSave(async () => {
      const res = await updateTaskChecklist(taskId, next);
      if (res.error) toast.error(res.error);
    });
  };

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    persist([...items, { id: crypto.randomUUID(), text, done: false }]);
    setDraft("");
  };

  const done = items.filter((i) => i.done).length;

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <ListTodo size={13} /> Checklist
        {items.length > 0 && (
          <span className="font-mono text-[10px] text-muted-foreground/70">{done}/{items.length}</span>
        )}
      </label>

      {items.length > 0 && (
        <>
          <Progress value={items.length ? (done / items.length) * 100 : 0} className="h-1.5 bg-muted/50" />
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id} className="group/check flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors">
                <Checkbox
                  checked={item.done}
                  onCheckedChange={(v) =>
                    persist(items.map((i) => (i.id === item.id ? { ...i, done: v === true } : i)))
                  }
                />
                <span className={cn("flex-1 text-sm min-w-0 break-words", item.done && "line-through text-muted-foreground")}>
                  {item.text}
                </span>
                <button
                  type="button"
                  aria-label="Remover item"
                  onClick={() => persist(items.filter((i) => i.id !== item.id))}
                  className="opacity-0 group-hover/check:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-rose-500 transition-all shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Adicionar subtarefa…"
          className="h-9 text-sm"
        />
        <Button type="button" size="icon" variant="outline" aria-label="Adicionar item" className="h-9 w-9 shrink-0" onClick={add} disabled={!draft.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
