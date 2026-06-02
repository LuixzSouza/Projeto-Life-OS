"use client";

import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Folder, Layers, AlignLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogHeader,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import React from "react";

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
}

export function ProjectCard({
  id, slug, title, description, status = "ACTIVE", totalTasks, completedTasks, isInbox = false, color,
}: ProjectCardProps) {
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const projectUrl = isInbox ? "/projects/inbox" : `/projects/${slug}`;
  const accent = isInbox ? "#3b82f6" : (color || "#6366f1");
  const remaining = totalTasks - completedTasks;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div
          className={cn(
            "group relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30 cursor-pointer text-left h-full",
            isInbox ? "border-dashed border-primary/30 bg-primary/[0.02]" : "border-border/40"
          )}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105"
                style={{ backgroundColor: accent }}
              >
                {isInbox ? <Layers className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
              </div>
              {!isInbox && (
                <Badge variant="secondary" className="text-[10px] font-semibold bg-muted/60 text-muted-foreground border-none">
                  {status}
                </Badge>
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {description || "Sem descrição definida."}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium text-muted-foreground">{completedTasks}/{totalTasks} tarefas</span>
              <span className="text-xs font-bold text-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: accent }} />
            </div>
            <div className="pt-3 flex items-center justify-end border-t border-border/40 text-muted-foreground group-hover:text-primary transition-colors">
              <span className="text-xs font-semibold">Detalhes</span>
              <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </DialogTrigger>

      {/* MODAL DE DETALHES (limpo) */}
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-[2rem] shadow-2xl gap-0">
        <DialogHeader className="p-6 pb-5 border-b border-border/40 bg-muted/10 text-left space-y-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: accent }}>
              {isInbox ? <Layers className="h-7 w-7" /> : <Folder className="h-7 w-7" />}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold tracking-tight truncate">{title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-semibold">
                  {isInbox ? "Inbox" : status}
                </Badge>
                <span className="text-[10px] text-muted-foreground font-mono">#{id.slice(0, 6)}</span>
              </DialogDescription>
            </div>
          </div>

          {/* Progresso */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Progresso</span>
              <span className="text-sm font-bold text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-muted/50" style={{ "--progress-foreground": accent } as React.CSSProperties} />
            <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-sm">
              <span><span className="font-bold text-foreground">{totalTasks}</span> <span className="text-xs text-muted-foreground">total</span></span>
              <span><span className="font-bold text-emerald-600">{completedTasks}</span> <span className="text-xs text-muted-foreground">concluídas</span></span>
              <span><span className="font-bold text-amber-600">{remaining}</span> <span className="text-xs text-muted-foreground">restantes</span></span>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <AlignLeft className="h-3.5 w-3.5" /> Sobre
          </h4>
          <p className="text-sm text-foreground/80 leading-relaxed bg-muted/20 border border-border/40 rounded-xl p-4">
            {description || "Sem descrição. Abra o board para organizar tarefas, notas e reuniões deste projeto."}
          </p>
        </div>

        <DialogFooter className="p-4 border-t border-border/40 bg-muted/5">
          <Link href={projectUrl} className="w-full">
            <Button className="w-full gap-2 h-11 rounded-xl font-bold shadow-lg text-white" style={{ backgroundColor: accent }}>
              Abrir Board <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
