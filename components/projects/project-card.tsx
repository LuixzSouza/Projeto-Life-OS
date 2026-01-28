"use client";

import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  Folder,
  Layers,
  AlignLeft,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface ProjectCardProps {
  id: string;          // UUID (banco)
  slug: string;        // usado na rota
  title: string;
  description?: string | null;
  status?: string;
  totalTasks: number;
  completedTasks: number;
  isInbox?: boolean;
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export function ProjectCard({
  id,
  slug,
  title,
  description,
  status = "ACTIVE",
  totalTasks,
  completedTasks,
  isInbox = false,
}: ProjectCardProps) {
  const progress =
    totalTasks === 0
      ? 0
      : Math.round((completedTasks / totalTasks) * 100);

  const projectUrl = isInbox ? "/projects/inbox" : `/projects/${slug}`;

  return (
    <Dialog>
      {/* CARD = TRIGGER */}
      <DialogTrigger asChild>
        <div
          className={cn(
            "group relative flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer text-left h-full",
            isInbox
              ? "border-dashed border-border hover:border-primary/50 bg-muted/5"
              : "border-border hover:border-primary/40"
          )}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div
                className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                  isInbox
                    ? "bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    : "bg-primary/10 text-primary"
                )}
              >
                {isInbox ? (
                  <Layers className="h-5 w-5" />
                ) : (
                  <Folder className="h-5 w-5" />
                )}
              </div>

              {!isInbox && (
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-bold tracking-wider opacity-70"
                >
                  {status}
                </Badge>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-card-foreground group-hover:text-primary transition-colors line-clamp-1">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
                {description || "Sem descrição definida."}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>Progresso</span>
              <span>{progress}%</span>
            </div>

            <Progress value={progress} className="h-1.5" />

            <div className="pt-4 mt-2 flex items-center justify-between border-t border-border/50">
              <span className="text-xs text-muted-foreground font-medium">
                {completedTasks}/{totalTasks} tarefas
              </span>
              <span className="p-2 rounded-full bg-muted/50 group-hover:bg-primary group-hover:text-white transition-all -mr-2 shadow-sm">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </DialogTrigger>

      {/* MODAL */}
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 border-border overflow-hidden">
        <div className="bg-muted/30 p-6 border-b border-border flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center border border-border shadow-sm",
                  isInbox
                    ? "bg-background"
                    : "bg-primary/10 text-primary"
                )}
              >
                {isInbox ? (
                  <Layers className="h-6 w-6" />
                ) : (
                  <Folder className="h-6 w-6" />
                )}
              </div>

              <div>
                <DialogTitle className="text-2xl font-bold leading-tight">
                  {title}
                </DialogTitle>

                <DialogDescription className="flex items-center gap-2 mt-1">
                  {!isInbox && (
                    <Badge variant="secondary" className="rounded-md">
                      {status}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    ID: {id.slice(0, 8)}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="bg-background rounded-lg p-3 border border-border/50 shadow-sm">
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span className="flex items-center gap-2 text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                Status Geral
              </span>
              <span>{progress}% Concluído</span>
            </div>

            <Progress value={progress} className="h-2" />

            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{completedTasks} tarefas feitas</span>
              <span>{totalTasks - completedTasks} restantes</span>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <AlignLeft className="h-4 w-4" />
              Sobre o Projeto
            </h4>

            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap bg-muted/10 p-4 rounded-xl border border-border/50">
              {description ||
                "Nenhuma descrição detalhada fornecida para este projeto."}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t border-border bg-muted/10 flex-shrink-0">
          <Link href={projectUrl} className="w-full sm:w-auto">
            <Button className="w-full gap-2 text-base h-11 shadow-md bg-primary hover:bg-primary/90">
              Abrir Quadro de Tarefas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
