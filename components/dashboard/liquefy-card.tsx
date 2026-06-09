"use client";

// Liquefação de Tarefas (Roadmap Fase 4 — #18): tarefas com 2+ blocos vencidos
// aparecem aqui como "congeladas". Um clique derrete cada uma em micro-passos
// (o primeiro vira ⚡ 2 min na Caixa de Entrada). Sem tarefas presas, sem card.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, Loader2, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getStuckTasks, liquefyTask, type StuckTask } from "@/app/(dashboard)/dashboard/liquefy-actions";

export function LiquefyCard() {
  const [tasks, setTasks] = useState<StuckTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getStuckTasks().then((t) => { if (alive) { setTasks(t); setLoaded(true); } });
    return () => { alive = false; };
  }, []);

  const melt = async (task: StuckTask) => {
    setBusyId(task.id);
    const res = await liquefyTask(task.id);
    setBusyId(null);
    if (res.success) {
      toast.success(res.message);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } else {
      toast.error(res.message);
    }
  };

  if (!loaded || tasks.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        <Snowflake className="h-3.5 w-3.5 text-sky-500" /> Tarefas congeladas · {tasks.length}
      </p>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Estas tarefas já viram 2+ blocos passarem sem acontecer — provavelmente são grandes demais.
        Liquefazer divide em micro-passos (o 1º cabe em 2 minutos).
      </p>

      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 24 }}
              className="flex items-center gap-2.5 rounded-xl border border-border/30 bg-background px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{task.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {task.missedBlocks} blocos vencidos{task.projectTitle ? ` · ${task.projectTitle}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={busyId !== null}
                onClick={() => melt(task)}
                className="h-7 shrink-0 gap-1.5 rounded-lg px-2 text-[10px] font-black uppercase tracking-wider text-sky-500 hover:bg-sky-500/10 hover:text-sky-500"
              >
                {busyId === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskConical className="h-3 w-3" />}
                Liquefazer
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
