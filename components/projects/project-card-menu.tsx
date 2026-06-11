"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import {
  MoreHorizontal, ExternalLink, Copy, Trash2, CheckCircle2, Pause, Play, CopyPlus, RotateCcw, Shapes, Check, FileDown,
  CalendarClock, LayoutTemplate, Rocket,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeleteProjectDialog } from "./delete-project-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  setProjectStatus, setProjectPara, duplicateProject, exportProjectMarkdown,
  setProjectDueDate, saveProjectAsTemplate, instantiateTemplate, type ProjectQuickStatus,
} from "@/app/(dashboard)/projects/actions";
import { PARA_TYPES, PARA_META, type ParaType } from "@/lib/para";

interface ProjectCardMenuProps {
  projectId: string;
  slug: string;
  title: string;
  taskCount: number;
  status?: string;
  paraType?: string | null;
  /** Prazo atual do projeto (ISO) — pré-preenche o diálogo "Definir prazo". */
  projectDue?: string | null;
}

// Menu de ações rápidas no card da lista. Vive dentro do card clicável, então
// tudo precisa de stopPropagation para não abrir o modal de detalhes por baixo.
export function ProjectCardMenu({ projectId, slug, title, taskCount, status = "ACTIVE", paraType = null, projectDue = null }: ProjectCardMenuProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);
  const [dueValue, setDueValue] = useState(projectDue ? projectDue.slice(0, 10) : "");
  const [isPending, startTransition] = useTransition();
  const isTemplate = status === "TEMPLATE";
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  // O card é um <Link>: além de não borbulhar, precisa cancelar a navegação ao clicar no menu.
  const stopNav = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

  const isCompleted = status === "COMPLETED" || status === "DONE";
  const isPaused = status === "PAUSED" || status === "ON_HOLD";

  const changeStatus = (next: ProjectQuickStatus, message: string) => {
    startTransition(async () => {
      await setProjectStatus(projectId, next);
      toast.success(message);
      router.refresh();
    });
  };

  const changePara = (next: ParaType | null) => {
    startTransition(async () => {
      await setProjectPara(projectId, next);
      toast.success(next ? `Classificado como ${PARA_META[next].label}.` : "Classificação removida.");
      router.refresh();
    });
  };

  const exportMd = () => {
    startTransition(async () => {
      const result = await exportProjectMarkdown(projectId);
      if (result.error || !result.content) {
        toast.error(result.error ?? "Falha ao exportar o projeto.");
        return;
      }
      saveAs(new Blob([result.content], { type: "text/markdown;charset=utf-8" }), result.filename);
      toast.success("Projeto exportado em Markdown!");
    });
  };

  const saveDueDate = (value: string | null) => {
    startTransition(async () => {
      const result = await setProjectDueDate(projectId, value);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setDueOpen(false);
      toast.success(value ? "Prazo do projeto definido!" : "Prazo removido.");
      router.refresh();
    });
  };

  const saveAsTemplate = () => {
    startTransition(async () => {
      const result = await saveProjectAsTemplate(projectId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Template salvo!", { description: "Disponível na seção Templates da listagem." });
      router.refresh();
    });
  };

  const useTemplate = () => {
    startTransition(async () => {
      const result = await instantiateTemplate(projectId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Projeto criado a partir do template!");
      if (result.slug) router.push(`/projects/${result.slug}`);
      else router.refresh();
    });
  };

  const duplicate = () => {
    startTransition(async () => {
      const result = await duplicateProject(projectId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Projeto duplicado!", {
        description: "Tarefas copiadas e reiniciadas como pendentes.",
        action: result.slug
          ? { label: "Abrir", onClick: () => router.push(`/projects/${result.slug}`) }
          : undefined,
      });
      router.refresh();
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={stopNav}
            onPointerDown={stop}
            aria-label="Ações do projeto"
            className="h-8 w-8 rounded-lg text-muted-foreground opacity-100 transition-all md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={stop} className="w-56 rounded-xl p-1.5 shadow-xl border-border/40">
          <DropdownMenuItem
            onSelect={() => router.push(`/projects/${slug}`)}
            className="rounded-lg px-2.5 py-2 gap-2.5 cursor-pointer group/i"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover/i:text-primary transition-colors" />
            <span className="font-semibold text-sm">Abrir board</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              navigator.clipboard.writeText(`${window.location.origin}/projects/${slug}`);
              toast.success("Link do projeto copiado!");
            }}
            className="rounded-lg px-2.5 py-2 gap-2.5 cursor-pointer group/i"
          >
            <Copy className="h-4 w-4 text-muted-foreground group-hover/i:text-blue-500 transition-colors" />
            <span className="font-semibold text-sm">Copiar link</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1.5 bg-border/40" />

          {isTemplate ? (
            <DropdownMenuItem
              disabled={isPending}
              onSelect={useTemplate}
              className="rounded-lg px-2.5 py-2 gap-2.5 cursor-pointer group/i"
            >
              <Rocket className="h-4 w-4 text-muted-foreground group-hover/i:text-primary transition-colors" />
              <span className="font-semibold text-sm">Usar template</span>
            </DropdownMenuItem>
          ) : isCompleted ? (
            <DropdownMenuItem
              disabled={isPending}
              onSelect={() => changeStatus("ACTIVE", "Projeto reativado!")}
              className="rounded-lg px-2.5 py-2 gap-2.5 cursor-pointer group/i"
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground group-hover/i:text-emerald-500 transition-colors" />
              <span className="font-semibold text-sm">Reativar projeto</span>
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem
                disabled={isPending}
                onSelect={() => changeStatus("COMPLETED", "Projeto concluído! 🎉")}
                className="rounded-lg px-2.5 py-2 gap-2.5 cursor-pointer group/i"
              >
                <CheckCircle2 className="h-4 w-4 text-muted-foreground group-hover/i:text-emerald-500 transition-colors" />
                <span className="font-semibold text-sm">Concluir projeto</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isPending}
                onSelect={() =>
                  isPaused
                    ? changeStatus("ACTIVE", "Projeto retomado!")
                    : changeStatus("PAUSED", "Projeto pausado.")
                }
                className="rounded-lg px-2.5 py-2 gap-2.5 cursor-pointer group/i"
              >
                {isPaused
                  ? <Play className="h-4 w-4 text-muted-foreground group-hover/i:text-emerald-500 transition-colors" />
                  : <Pause className="h-4 w-4 text-muted-foreground group-hover/i:text-amber-500 transition-colors" />}
                <span className="font-semibold text-sm">{isPaused ? "Retomar projeto" : "Pausar projeto"}</span>
              </DropdownMenuItem>
            </>
          )}

          {!isTemplate && (
            <DropdownMenuItem
              disabled={isPending}
              onSelect={() => setDueOpen(true)}
              className="rounded-lg px-2.5 py-2 gap-2.5 cursor-pointer group/i"
            >
              <CalendarClock className="h-4 w-4 text-muted-foreground group-hover/i:text-amber-500 transition-colors" />
              <span className="font-semibold text-sm">{projectDue ? "Alterar prazo" : "Definir prazo"}</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            disabled={isPending}
            onSelect={duplicate}
            className="rounded-lg px-2.5 py-2 gap-2.5 cursor-pointer group/i"
          >
            <CopyPlus className="h-4 w-4 text-muted-foreground group-hover/i:text-blue-500 transition-colors" />
            <span className="font-semibold text-sm">Duplicar projeto</span>
          </DropdownMenuItem>

          {!isTemplate && (
            <DropdownMenuItem
              disabled={isPending}
              onSelect={saveAsTemplate}
              className="rounded-lg px-2.5 py-2 gap-2.5 cursor-pointer group/i"
            >
              <LayoutTemplate className="h-4 w-4 text-muted-foreground group-hover/i:text-primary transition-colors" />
              <span className="font-semibold text-sm">Salvar como template</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            disabled={isPending}
            onSelect={exportMd}
            className="rounded-lg px-2.5 py-2 gap-2.5 cursor-pointer group/i"
          >
            <FileDown className="h-4 w-4 text-muted-foreground group-hover/i:text-violet-500 transition-colors" />
            <span className="font-semibold text-sm">Exportar (.md)</span>
          </DropdownMenuItem>

          {/* Classificação PARA — saiu do badge solto no card para cá */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="rounded-lg px-2.5 py-2 gap-2.5 cursor-pointer">
              <Shapes className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Classificar (PARA)</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56 rounded-xl p-1.5 shadow-xl border-border/40" onClick={stop}>
              {PARA_TYPES.map((key) => (
                <DropdownMenuItem
                  key={key}
                  disabled={isPending}
                  onSelect={() => changePara(key)}
                  className="rounded-lg px-2.5 py-2 gap-2 cursor-pointer"
                >
                  <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest", PARA_META[key].badgeClass)}>
                    {PARA_META[key].label}
                  </span>
                  <span className="flex-1 truncate text-[10px] text-muted-foreground">{PARA_META[key].hint}</span>
                  {paraType === key && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </DropdownMenuItem>
              ))}
              {paraType && (
                <DropdownMenuItem
                  disabled={isPending}
                  onSelect={() => changePara(null)}
                  className="rounded-lg px-2.5 py-2 cursor-pointer text-xs text-muted-foreground"
                >
                  Remover classificação
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator className="my-1.5 bg-border/40" />
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="rounded-lg px-2.5 py-2 gap-2.5 cursor-pointer text-rose-500 focus:text-rose-500 focus:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" />
            <span className="font-semibold text-sm">Mover para a lixeira</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        projectId={projectId}
        title={title}
        taskCount={taskCount}
      />

      {/* Prazo do projeto (countdown no card + presença na Agenda) */}
      <Dialog open={dueOpen} onOpenChange={setDueOpen}>
        <DialogContent className="max-w-sm" onClick={stop}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" /> Prazo do projeto
            </DialogTitle>
            <DialogDescription>
              O countdown aparece no card e o prazo entra na Agenda.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="date"
            value={dueValue}
            onChange={(e) => setDueValue(e.target.value)}
            disabled={isPending}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            {projectDue && (
              <Button variant="ghost" disabled={isPending} onClick={() => { setDueValue(""); saveDueDate(null); }}>
                Remover prazo
              </Button>
            )}
            <Button disabled={isPending || !dueValue} onClick={() => saveDueDate(dueValue)}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
