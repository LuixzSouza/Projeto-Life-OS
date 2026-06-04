"use client";

import Link from "next/link";
import {
  ArrowRight, Folder, Layers, CheckCircle2, Clock, ListTodo, CircleDashed,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProjectCardMenu } from "./project-card-menu";

interface ProjectCardProps {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  status?: string;
  totalTasks: number;
  completedTasks: number;
  isInbox?: boolean;
  color?: string;
  updatedAt?: string;
}

// Estado do projeto traduzido + cor (escaneável de relance).
const STATUS_META: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Ativo", className: "bg-emerald-500/10 text-emerald-600" },
  IN_PROGRESS: { label: "Em andamento", className: "bg-blue-500/10 text-blue-600" },
  PAUSED: { label: "Pausado", className: "bg-amber-500/10 text-amber-600" },
  ON_HOLD: { label: "Em espera", className: "bg-amber-500/10 text-amber-600" },
  COMPLETED: { label: "Concluído", className: "bg-blue-500/10 text-blue-600" },
  DONE: { label: "Concluído", className: "bg-blue-500/10 text-blue-600" },
  ARCHIVED: { label: "Arquivado", className: "bg-muted text-muted-foreground" },
};

export function ProjectCard({
  id, slug, title, description, status = "ACTIVE", totalTasks, completedTasks, isInbox = false, color, updatedAt,
}: ProjectCardProps) {
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const projectUrl = isInbox ? "/projects/inbox" : `/projects/${slug}`;
  const accent = isInbox ? "#3b82f6" : (color || "#6366f1");
  const remaining = totalTasks - completedTasks;
  const isComplete = progress === 100 && totalTasks > 0;
  const statusMeta = STATUS_META[status] ?? { label: status, className: "bg-muted/60 text-muted-foreground" };
  const updatedLabel = updatedAt ? formatDistanceToNow(new Date(updatedAt), { locale: ptBR, addSuffix: true }) : null;

  const stats = [
    { icon: ListTodo, label: "Total", value: totalTasks, className: "text-foreground" },
    { icon: CheckCircle2, label: "Feitas", value: completedTasks, className: "text-emerald-600" },
    { icon: CircleDashed, label: "Restam", value: remaining, className: "text-amber-600" },
  ];

  return (
    <div className="group relative h-full">
      {/* Menu de ações: fora do <a> (evita button dentro de anchor) */}
      {!isInbox && (
        <div className="absolute right-4 top-5 z-10 flex items-center gap-1.5">
          <Badge variant="secondary" className={cn("text-[10px] font-bold border-none px-2 py-0.5", isComplete ? "bg-emerald-500/10 text-emerald-600" : statusMeta.className)}>
            {isComplete ? "Concluído" : statusMeta.label}
          </Badge>
          <ProjectCardMenu projectId={id} slug={slug} title={title} taskCount={totalTasks} />
        </div>
      )}

      <Link
        href={projectUrl}
        className={cn(
          "relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-primary/30 cursor-pointer text-left h-full",
          isInbox ? "border-dashed border-primary/30 bg-primary/[0.02]" : "border-border/40"
        )}
      >
        {/* faixa de cor no topo (identidade do projeto) */}
        {!isInbox && (
          <span className="absolute inset-x-0 top-0 h-1 rounded-t-2xl opacity-70 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: accent }} />
        )}

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105 shrink-0"
              style={{ backgroundColor: accent }}
            >
              {isInbox ? <Layers className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
            </div>
          </div>

          <div className="space-y-1.5">
          <h3 className="text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-1">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed min-h-[2.5rem]">
            {description || "Sem descrição definida."}
          </p>
        </div>

        {/* Chips de estatística — leitura rápida */}
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-muted/40 border border-border/30 px-2 py-2 text-center">
              <div className={cn("flex items-center justify-center gap-1 text-sm font-bold tabular-nums", s.className)}>
                <s.icon className="h-3.5 w-3.5" />
                {s.value}
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-medium text-muted-foreground">
            {totalTasks === 0 ? "Sem tarefas ainda" : `${completedTasks}/${totalTasks} concluídas`}
          </span>
          <span className={cn("text-xs font-bold flex items-center gap-1", isComplete ? "text-emerald-600" : "text-foreground")}>
            {isComplete && <CheckCircle2 className="h-3.5 w-3.5" />}
            {progress}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: isComplete ? "#10b981" : accent }} />
        </div>
        <div className="pt-3 flex items-center justify-between border-t border-border/40">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {updatedLabel ? <><Clock className="h-3 w-3" /> {updatedLabel}</> : <span className="opacity-0">·</span>}
          </span>
          <span className="flex items-center text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">
            {isInbox ? "Abrir" : "Abrir projeto"}
            <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
      </Link>
    </div>
  );
}
