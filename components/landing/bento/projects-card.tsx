"use client";

import { Briefcase, CheckCircle2, Sparkles } from "lucide-react";
import { BaseCard } from "./base-card";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Pill } from "./bento-atoms";

// model Task: title, status (TODO/IN_PROGRESS/DONE), priority. model Meeting: summary (IA).
const INITIAL = [
  { id: 1, text: "Schema SQLite + Prisma", done: true },
  { id: 2, text: "Onboarding & setup local", done: true },
  { id: 3, text: "IA híbrida (Ollama/Cloud)", done: false },
  { id: 4, text: "Deploy na Vercel", done: false },
];

export function ProjectsCard() {
  const [tasks, setTasks] = useState(INITIAL);
  const toggle = (id: number) =>
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const done = tasks.filter((t) => t.done).length;
  const progress = Math.round((done / tasks.length) * 100);

  return (
    <BaseCard
      title="Projetos"
      icon={Briefcase}
      description="Tarefas, sprints e reuniões."
      className="col-span-2 md:col-span-1 lg:row-span-2"
    >
      <div className="flex h-full w-full flex-col">
        {/* Projeto + progresso */}
        <div className="space-y-1.5 border-b border-border/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Life OS</span>
            <span className="font-mono text-[10px] font-bold text-primary">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-brand transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Checklist (clicável) */}
        <div className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => toggle(task.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all active:scale-[0.98]",
                task.done
                  ? "border-primary/20 bg-primary/5"
                  : "border-border/60 bg-card/40 hover:border-primary/30"
              )}
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                  task.done ? "border-primary bg-primary text-primary-foreground" : "border-border"
                )}
              >
                {task.done && <CheckCircle2 className="size-3.5" />}
              </span>
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  task.done ? "text-muted-foreground line-through" : "text-foreground"
                )}
              >
                {task.text}
              </span>
            </button>
          ))}

          {/* Resumo de reunião por IA */}
          <div className="mt-auto flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2.5">
            <Sparkles className="size-4 shrink-0 text-primary" />
            <p className="text-[10px] leading-snug text-muted-foreground">
              <span className="font-semibold text-foreground">Resumo IA:</span> a reunião gerou 3
              tarefas e 1 follow-up.
            </p>
          </div>

          <Pill className="self-start" icon={Briefcase}>
            Cliente vinculado
          </Pill>
        </div>
      </div>
    </BaseCard>
  );
}
