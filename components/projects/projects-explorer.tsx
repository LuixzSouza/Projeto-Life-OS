"use client";

import { useMemo, useState } from "react";
import { Search, Inbox, Sparkles, LayoutGrid, ArrowDownUp, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ProjectCard } from "./project-card";
import { NewProjectDialog } from "./new-project-dialog";
import { PARA_TYPES, PARA_META, type ParaType } from "@/lib/para";

// Resumo das tarefas (projeto ou inbox) calculado no servidor — alimenta os
// sinais de prazo/ritmo/prioridade do card.
export interface TaskSummary {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  nextDue: string | null;
  doneThisWeek: number;
  highPriority: number;
}

export interface ProjectItem extends TaskSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  color: string | null;
  paraType: string | null;
  updatedAt: string;
  /** Prazo do PROJETO (ISO) — countdown no card. */
  dueDate: string | null;
}

type FilterKey = "all" | "active" | "late" | "done" | "archived";
type ParaFilter = "all" | ParaType | "none";
type SortKey = "recent" | "name" | "progress" | "pending" | "deadline";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "active", label: "Em andamento" },
  { key: "late", label: "Atrasados" },
  { key: "done", label: "Concluídos" },
  { key: "archived", label: "Arquivados" },
];

const progressOf = (p: ProjectItem) => (p.totalTasks === 0 ? 0 : Math.round((p.completedTasks / p.totalTasks) * 100));

export function ProjectsExplorer({ projects, inbox }: { projects: ProjectItem[]; inbox: TaskSummary }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [paraFilter, setParaFilter] = useState<ParaFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  // Templates (status TEMPLATE) vivem numa seção própria, fora da lista padrão.
  const templates = useMemo(() => projects.filter((p) => p.status === "TEMPLATE"), [projects]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = projects.filter((p) => {
      if (p.status === "TEMPLATE") return false; // seção própria
      // Arquivados (paraType ARCHIVE) só aparecem no filtro "Arquivados".
      const isArchived = p.paraType === "ARCHIVE";
      if (filter === "archived") {
        if (!isArchived) return false;
      } else if (isArchived) {
        return false;
      }
      const matchesSearch = !q || p.title.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
      const prog = progressOf(p);
      const matchesFilter =
        filter === "all" || filter === "archived" ? true
        : filter === "done" ? prog === 100 && p.totalTasks > 0
        : filter === "late" ? p.overdueTasks > 0
        : !(prog === 100 && p.totalTasks > 0);
      const matchesPara =
        paraFilter === "all" ? true : paraFilter === "none" ? !p.paraType : p.paraType === paraFilter;
      return matchesSearch && matchesFilter && matchesPara;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "name": return a.title.localeCompare(b.title);
        case "progress": return progressOf(b) - progressOf(a);
        case "pending": return (b.totalTasks - b.completedTasks) - (a.totalTasks - a.completedTasks);
        case "deadline": {
          // Atrasados primeiro; depois o prazo mais próximo (do projeto ou da
          // próxima tarefa, o que vier antes); sem prazo por último.
          if (a.overdueTasks !== b.overdueTasks) return b.overdueTasks - a.overdueTasks;
          const dueOf = (p: ProjectItem) => Math.min(
            p.dueDate ? new Date(p.dueDate).getTime() : Number.POSITIVE_INFINITY,
            p.nextDue ? new Date(p.nextDue).getTime() : Number.POSITIVE_INFINITY,
          );
          return dueOf(a) - dueOf(b);
        }
        default: return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
    return list;
  }, [projects, search, filter, paraFilter, sort]);

  return (
    <div className="space-y-8">
      {/* Inbox em destaque */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Inbox className="h-4 w-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-foreground">Caixa de Entrada</h2>
          <span className="text-xs text-muted-foreground">· captura rápida de ideias</span>
        </div>
        <ProjectCard
          id="inbox"
          slug="inbox"
          title="Caixa de Entrada"
          description="Tudo o que ainda não foi organizado em um projeto específico."
          totalTasks={inbox.totalTasks}
          completedTasks={inbox.completedTasks}
          overdueTasks={inbox.overdueTasks}
          nextDue={inbox.nextDue}
          doneThisWeek={inbox.doneThisWeek}
          highPriority={inbox.highPriority}
          isInbox
        />
      </section>

      {/* Toolbar de projetos */}
      <section className="space-y-5">
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Projetos</h2>
          <span className="text-xs text-muted-foreground">· {projects.length}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          {/* Busca */}
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar projeto..."
              className="pl-9 h-10 rounded-xl bg-muted/40 border-border/40 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {/* Filtro por estado */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 shrink-0">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "px-3 h-8 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                    filter === f.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Filtro PARA (#10) */}
            <Select value={paraFilter} onValueChange={(v) => setParaFilter(v as ParaFilter)}>
              <SelectTrigger className="h-10 w-[140px] rounded-xl bg-muted/40 border-border/40 shrink-0 gap-2">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">PARA: todos</SelectItem>
                {PARA_TYPES.map((key) => (
                  <SelectItem key={key} value={key}>{PARA_META[key].label}</SelectItem>
                ))}
                <SelectItem value="none">Sem classificação</SelectItem>
              </SelectContent>
            </Select>

            {/* Ordenação */}
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-10 w-[150px] rounded-xl bg-muted/40 border-border/40 shrink-0 gap-2">
                <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="recent">Recentes</SelectItem>
                <SelectItem value="deadline">Prazo próximo</SelectItem>
                <SelectItem value="name">Nome (A–Z)</SelectItem>
                <SelectItem value="progress">Progresso</SelectItem>
                <SelectItem value="pending">Mais pendências</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid */}
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/10 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <LayoutGrid className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {search || filter !== "all" ? "Nenhum projeto encontrado" : "Vazio por aqui"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              {search || filter !== "all"
                ? "Ajuste a busca ou os filtros para encontrar seus projetos."
                : "Que tal transformar aquele objetivo em um projeto estruturado?"}
            </p>
            {!search && filter === "all" && (
              <div className="mt-6">
                <NewProjectDialog />
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch">
            {visible.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                slug={project.slug}
                title={project.title}
                description={project.description}
                status={project.status}
                color={project.color || undefined}
                totalTasks={project.totalTasks}
                completedTasks={project.completedTasks}
                overdueTasks={project.overdueTasks}
                nextDue={project.nextDue}
                doneThisWeek={project.doneThisWeek}
                highPriority={project.highPriority}
                updatedAt={project.updatedAt}
                paraType={project.paraType}
                projectDue={project.dueDate}
              />
            ))}
          </div>
        )}
      </section>

      {/* Templates: biblioteca de modelos ("Salvar como template" no menu ⋯) */}
      {templates.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <LayoutGrid className="h-4 w-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-foreground">Templates</h2>
            <span className="text-xs text-muted-foreground">
              · use o menu ⋯ → &quot;Usar template&quot; para criar um projeto novo
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch">
            {templates.map((t) => (
              <ProjectCard
                key={t.id}
                id={t.id}
                slug={t.slug}
                title={t.title}
                description={t.description}
                status={t.status}
                color={t.color || undefined}
                totalTasks={t.totalTasks}
                completedTasks={t.completedTasks}
                overdueTasks={0}
                nextDue={null}
                doneThisWeek={0}
                highPriority={0}
                updatedAt={t.updatedAt}
                paraType={t.paraType}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

