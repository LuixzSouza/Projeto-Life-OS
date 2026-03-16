"use client";

import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  Folder,
  Layers,
  AlignLeft,
  ExternalLink,
  CheckCircle2,
  Circle,
  Calendar,
  MoreHorizontal
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
  DialogHeader,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface ProjectCardProps {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  status?: string;
  totalTasks: number;
  completedTasks: number;
  isInbox?: boolean;
  color?: string; // Hexadecimal vindo do banco
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
  color,
}: ProjectCardProps) {
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const projectUrl = isInbox ? "/projects/inbox" : `/projects/${slug}`;
  
  // Cor de destaque (Default para Indigo se não houver)
  const accentColor = color || "#6366f1";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div
          className={cn(
            "group relative flex flex-col justify-between rounded-[2rem] border bg-card p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl cursor-pointer text-left h-full active:scale-[0.98]",
            isInbox
              ? "border-dashed border-primary/30 bg-primary/[0.02] hover:border-primary/50"
              : "border-border/60 hover:border-border"
          )}
        >
          <div className="space-y-5">
            {/* Top Bar: Icon & Badge */}
            <div className="flex items-start justify-between">
              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center border border-border/50 shadow-sm transition-transform group-hover:scale-110 duration-500 bg-background"
                style={{ color: isInbox ? undefined : accentColor }}
              >
                {isInbox ? (
                  <Layers className="h-6 w-6 text-blue-500" />
                ) : (
                  <Folder className="h-6 w-6 fill-current opacity-20 absolute" />
                )}
                {!isInbox && <Folder className="h-6 w-6 relative z-10" />}
              </div>

              {!isInbox && (
                <Badge
                  variant="secondary"
                  className="text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 bg-muted/50 text-muted-foreground border-none"
                >
                  {status}
                </Badge>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <h3 className="text-xl font-black text-foreground tracking-tight group-hover:text-primary transition-colors duration-300">
                {title}
              </h3>
              <p className="text-sm font-medium text-muted-foreground/80 line-clamp-2 leading-relaxed">
                {description || "Sem descrição definida para este projeto."}
              </p>
            </div>
          </div>

          {/* Progress Section */}
          <div className="mt-8 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  {completedTasks} / {totalTasks} Tarefas
                </span>
                <span className="text-xs font-black font-mono text-foreground">
                  {progress}%
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full transition-all duration-1000 ease-out rounded-full"
                  style={{ 
                    width: `${progress}%`,
                    backgroundColor: isInbox ? '#3b82f6' : accentColor 
                  }}
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-border/40">
              <div className="flex -space-x-2">
                {/* Placeholder para avatares se houver time no futuro */}
                <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[8px] font-bold">L</div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest">Detalhes</span>
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </DialogTrigger>

      {/* MODAL DETALHADO */}
      <DialogContent className="fixed left-[50%] top-[50%] z-50 flex w-[95vw] md:max-w-2xl max-h-[90vh] flex-col translate-x-[-50%] translate-y-[-50%] p-0 overflow-hidden bg-background border-border/40 shadow-2xl rounded-[2.5rem]">
        
        {/* Modal Header */}
        <div className="bg-muted/20 p-8 border-b border-border/40 relative">
            <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex items-center gap-5">
                    <div 
                        className="h-16 w-16 rounded-3xl flex items-center justify-center border border-border/50 shadow-sm bg-background"
                        style={{ color: isInbox ? '#3b82f6' : accentColor }}
                    >
                        {isInbox ? <Layers className="h-8 w-8" /> : <Folder className="h-8 w-8" />}
                    </div>
                    <div>
                        <DialogTitle className="text-3xl font-black tracking-tighter text-foreground uppercase">
                            {title}
                        </DialogTitle>
                        <DialogDescription className="flex items-center gap-3 mt-1.5 font-bold uppercase tracking-widest text-[10px]">
                            <Badge variant="outline" className="bg-background">{status}</Badge>
                            <span className="text-muted-foreground/60 tracking-normal font-mono uppercase">ID: {id.slice(0, 8)}</span>
                        </DialogDescription>
                    </div>
                </div>
            </div>

            {/* Stats Overview inside Modal */}
            <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="bg-background/60 p-4 rounded-2xl border border-border/40 shadow-sm">
                    <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Concluído</p>
                    <p className="text-2xl font-black font-mono">{progress}%</p>
                </div>
                <div className="bg-background/60 p-4 rounded-2xl border border-border/40 shadow-sm">
                    <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Tarefas</p>
                    <p className="text-2xl font-black font-mono">{totalTasks}</p>
                </div>
                <div className="bg-background/60 p-4 rounded-2xl border border-border/40 shadow-sm">
                    <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Restantes</p>
                    <p className="text-2xl font-black font-mono text-primary">{totalTasks - completedTasks}</p>
                </div>
            </div>
        </div>

        <ScrollArea className="flex-1 p-8">
          <div className="space-y-6">
            <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <AlignLeft className="h-4 w-4" /> Sobre o Projeto
                </h4>
                <div className="text-base font-medium text-foreground/80 leading-relaxed whitespace-pre-wrap bg-muted/10 p-6 rounded-[1.5rem] border border-border/40 italic">
                    &quot;{description || "O sucesso deste projeto depende da organização e execução clara das tarefas pendentes."}&quot;
                </div>
            </div>

            {/* Actions Quick List (Placeholder para features futuras) */}
            <div className="pt-4 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/5 border border-border/40 text-xs font-bold text-muted-foreground italic">
                    <CheckCircle2 className="h-4 w-4 opacity-40" /> Foco em Conclusão
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/5 border border-border/40 text-xs font-bold text-muted-foreground italic">
                    <Calendar className="h-4 w-4 opacity-40" /> Sem data limite
                </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-border/40 bg-muted/5 shrink-0">
          <div className="flex flex-col sm:flex-row w-full gap-4">
              <Button variant="ghost" className="rounded-xl font-bold text-xs uppercase tracking-widest flex-1 h-12" asChild>
                  <Link href={projectUrl}>Ações rápidas</Link>
              </Button>
              <Link href={projectUrl} className="flex-[2]">
                <Button 
                    className="w-full gap-3 text-sm h-12 rounded-xl shadow-xl font-black uppercase tracking-widest transition-all active:scale-95"
                    style={{ backgroundColor: isInbox ? '#3b82f6' : accentColor }}
                >
                  Abrir Board <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}