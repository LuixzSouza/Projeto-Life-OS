"use client";

import Link from "next/link";
import {
  ArrowRight, Folder, Layers, CheckCircle2, AlertTriangle, CalendarClock, Flame, Flag, Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, isTomorrow, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProjectCardMenu } from "./project-card-menu";
import { PARA_META, type ParaType } from "@/lib/para";

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
  /** Classificação PARA (exibida como etiqueta no rodapé; a troca fica no menu ⋯). */
  paraType?: string | null;
  /** Tarefas em aberto com prazo já vencido. */
  overdueTasks?: number;
  /** Próximo prazo (ISO) entre as tarefas em aberto, se houver. */
  nextDue?: string | null;
  /** Tarefas concluídas nos últimos 7 dias (ritmo do projeto). */
  doneThisWeek?: number;
  /** Tarefas em aberto com prioridade ALTA. */
  highPriority?: number;
  /** Prazo do PROJETO (ISO) — countdown no card (≠ prazos de tarefas). */
  projectDue?: string | null;
}

// Estado do projeto: rótulo + cor do pontinho na linha de meta (discreto e escaneável).
const STATUS_META: Record<string, { label: string; dot: string; text?: string }> = {
  ACTIVE: { label: "Ativo", dot: "bg-emerald-500" },
  IN_PROGRESS: { label: "Em andamento", dot: "bg-blue-500" },
  PAUSED: { label: "Pausado", dot: "bg-amber-500", text: "text-amber-600" },
  ON_HOLD: { label: "Em espera", dot: "bg-amber-500", text: "text-amber-600" },
  COMPLETED: { label: "Concluído", dot: "bg-blue-500" },
  DONE: { label: "Concluído", dot: "bg-blue-500" },
  ARCHIVED: { label: "Arquivado", dot: "bg-zinc-400" },
  TEMPLATE: { label: "Template", dot: "bg-violet-500", text: "text-violet-600" },
};

// Rótulo curto e humano para o próximo prazo.
function nextDueLabel(date: Date): string {
  if (isToday(date)) return "Vence hoje";
  if (isTomorrow(date)) return "Vence amanhã";
  return `Vence ${format(date, "d 'de' MMM", { locale: ptBR })}`;
}

export function ProjectCard({
  id, slug, title, description, status = "ACTIVE", totalTasks, completedTasks, isInbox = false, color, updatedAt,
  paraType = null, overdueTasks = 0, nextDue = null, doneThisWeek = 0, highPriority = 0,
  projectDue = null,
}: ProjectCardProps) {
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const projectUrl = isInbox ? "/projects/inbox" : `/projects/${slug}`;
  const accent = isInbox ? "#3b82f6" : (color || "#6366f1");
  const remaining = totalTasks - completedTasks;
  const isComplete = progress === 100 && totalTasks > 0;
  const isPaused = status === "PAUSED" || status === "ON_HOLD";
  const statusMeta = isComplete
    ? { label: "Concluído", dot: "bg-emerald-500", text: "text-emerald-600" }
    : (STATUS_META[status] ?? { label: status, dot: "bg-zinc-400" });
  const updatedLabel = updatedAt ? formatDistanceToNow(new Date(updatedAt), { locale: ptBR, addSuffix: true }) : null;
  // Projeto "dormindo": aberto, com pendências e sem mexer há 14+ dias.
  const idleDays = updatedAt ? differenceInCalendarDays(new Date(), new Date(updatedAt)) : 0;
  const isIdle = !isInbox && !isComplete && !isPaused && remaining > 0 && idleDays >= 14;
  const nextDueDate = nextDue ? new Date(nextDue) : null;
  const dueToday = nextDueDate !== null && isToday(nextDueDate);
  const paraMeta = paraType ? PARA_META[paraType as ParaType] : null;
  // Prazo do PROJETO: countdown (vencido → vermelho; ≤7 dias → âmbar).
  const projectDueDate = projectDue ? new Date(projectDue) : null;
  const projectDueDays = projectDueDate ? differenceInCalendarDays(projectDueDate, new Date()) : null;
  const projectDueLabel = projectDueDate === null || projectDueDays === null ? null
    : projectDueDays < 0 ? `Prazo venceu há ${Math.abs(projectDueDays)} dia${Math.abs(projectDueDays) === 1 ? "" : "s"}`
    : projectDueDays === 0 ? "Prazo é hoje"
    : projectDueDays === 1 ? "Prazo é amanhã"
    : projectDueDays <= 30 ? `Prazo em ${projectDueDays} dias`
    : `Prazo ${format(projectDueDate, "d 'de' MMM", { locale: ptBR })}`;
  const hasSignals = overdueTasks > 0 || (!isComplete && nextDueDate !== null) || highPriority > 0 || doneThisWeek > 0
    || (!isComplete && projectDueLabel !== null);

  return (
    <div className="group relative h-full">
      {/* Menu de ações: fora do <a> (evita button dentro de anchor) */}
      {!isInbox && (
        <div className="absolute right-3 top-3 z-10">
          <ProjectCardMenu
            projectId={id}
            slug={slug}
            title={title}
            taskCount={totalTasks}
            status={isComplete ? "COMPLETED" : status}
            paraType={paraType}
            projectDue={projectDue}
          />
        </div>
      )}

      <Link
        href={projectUrl}
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 cursor-pointer text-left",
          "group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-primary/30",
          isInbox ? "border-dashed border-primary/30 bg-primary/[0.02]" : "border-border/40",
          isPaused && "opacity-80 saturate-50 group-hover:opacity-100 group-hover:saturate-100"
        )}
      >
        {/* identidade do projeto: brilho suave da cor atrás do ícone */}
        {!isInbox && (
          <span
            aria-hidden
            className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full opacity-[0.13] blur-2xl transition-opacity duration-300 group-hover:opacity-25"
            style={{ backgroundColor: accent }}
          />
        )}

        {/* Header: ícone + título + linha de meta (status · atividade) */}
        <div className={cn("flex items-center gap-3", !isInbox && "pr-9")}>
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-105"
            style={{ backgroundColor: accent }}
          >
            {isInbox ? <Layers className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-bold tracking-tight text-foreground transition-colors group-hover:text-primary line-clamp-1">
              {title}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              {!isInbox && (
                <>
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusMeta.dot)} />
                  <span className={cn("shrink-0", statusMeta.text)}>{statusMeta.label}</span>
                </>
              )}
              {isIdle ? (
                <span className="flex items-center gap-1 truncate font-semibold text-amber-600">
                  <span className="shrink-0">·</span>
                  <Moon className="h-3 w-3 shrink-0" /> Parado há {idleDays} dias
                </span>
              ) : updatedLabel ? (
                <span className="truncate">
                  {!isInbox && "· "}atualizado {updatedLabel}
                </span>
              ) : isInbox ? (
                <span className="truncate">{totalTasks} ite{totalTasks === 1 ? "m" : "ns"} capturado{totalTasks === 1 ? "" : "s"}</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Descrição (só quando existe — sem placeholder vazio) */}
        {description && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}

        {/* Sinais acionáveis: prazos, prioridade e ritmo — só quando dizem algo */}
        {hasSignals && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {!isComplete && projectDueLabel && projectDueDays !== null && (
              <span className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold",
                projectDueDays < 0 ? "bg-rose-500/10 text-rose-600"
                : projectDueDays <= 7 ? "bg-amber-500/10 text-amber-600"
                : "bg-muted/60 text-muted-foreground"
              )}>
                <Flag className="h-3 w-3" />
                {projectDueLabel}
              </span>
            )}
            {overdueTasks > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-600">
                <AlertTriangle className="h-3 w-3" />
                {overdueTasks} atrasada{overdueTasks === 1 ? "" : "s"}
              </span>
            )}
            {!isComplete && nextDueDate && (
              <span className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold",
                dueToday ? "bg-amber-500/10 text-amber-600" : "bg-muted/60 text-muted-foreground"
              )}>
                <CalendarClock className="h-3 w-3" />
                {nextDueLabel(nextDueDate)}
              </span>
            )}
            {highPriority > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-1 text-[10px] font-bold text-orange-600">
                <Flag className="h-3 w-3" />
                {highPriority} alta{highPriority === 1 ? "" : "s"}
              </span>
            )}
            {doneThisWeek > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600">
                <Flame className="h-3 w-3" />
                {doneThisWeek} na semana
              </span>
            )}
          </div>
        )}

        {/* Empurra progresso + rodapé para a base (cards alinhados no grid) */}
        <div className="flex-1" />

        {/* Progresso */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              {totalTasks === 0
                ? "Sem tarefas ainda"
                : isComplete
                  ? `${totalTasks} tarefa${totalTasks === 1 ? "" : "s"} concluída${totalTasks === 1 ? "" : "s"}`
                  : `${completedTasks}/${totalTasks} · ${remaining} resta${remaining === 1 ? "" : "m"}`}
            </span>
            <span className={cn("flex items-center gap-1 text-xs font-bold tabular-nums", isComplete ? "text-emerald-600" : "text-foreground")}>
              {isComplete && <CheckCircle2 className="h-3.5 w-3.5" />}
              {progress}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, backgroundColor: isComplete ? "#10b981" : accent }}
            />
          </div>
        </div>

        {/* Rodapé: etiqueta PARA à esquerda, ação à direita */}
        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3">
          {paraMeta ? (
            <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest", paraMeta.badgeClass)}>
              {paraMeta.label}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground/50">{isInbox ? "Sempre à mão" : "Sem categoria"}</span>
          )}
          <span className="flex items-center text-xs font-semibold text-muted-foreground transition-colors group-hover:text-primary">
            {isInbox ? "Abrir" : "Abrir projeto"}
            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </div>
  );
}
