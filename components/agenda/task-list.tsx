"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckSquare, Circle, Folder, ArrowRight, 
  CalendarClock, Sparkles, CheckCircle2 
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { toggleTaskDone } from "@/app/(dashboard)/agenda/actions"; 
import { Prisma } from "@prisma/client";
import { cn } from "@/lib/utils";

type TaskWithProject = Prisma.TaskGetPayload<{
  include: { project: { select: { title: true, color: true } } }
}>;

export function TaskList({ tasks }: { tasks: TaskWithProject[] }) {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* HEADER TÁTICO */}
      <div className="px-6 py-5 border-b border-border/40 flex items-center justify-between bg-muted/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-xl text-primary shadow-inner border border-primary/20">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-black uppercase tracking-tighter text-foreground text-lg leading-none">Foco do Dia</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Tarefas Prioritárias Ativas</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-background border-primary/30 text-primary font-mono text-xs px-2 py-0.5 shadow-sm">
          {tasks.length} <span className="sr-only">tarefas pendentes</span>
        </Badge>
      </div>
      
      {/* LISTA DE TAREFAS */}
      <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar bg-background/30">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/5">
            <div className="bg-emerald-500/10 p-4 rounded-2xl mb-4 shadow-inner border border-emerald-500/20">
              <Sparkles className="h-8 w-8 text-emerald-500 animate-pulse" />
            </div>
            <h4 className="text-xl font-black uppercase tracking-tighter text-foreground">Tudo Limpo!</h4>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2 max-w-[250px] leading-relaxed opacity-60">
              Nenhuma tarefa prioritária pendente. Aproveite a visão livre.
            </p>
          </div>
        ) : (
          tasks.map(task => {
             const isLate = task.dueDate && new Date(task.dueDate) < new Date();
             const projectColor = task.project?.color || "hsl(var(--primary))";

             return (
                <div 
                  key={task.id} 
                  className="group flex items-start gap-4 p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden"
                >
                  {/* Borda Esquerda de Destaque */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2"
                    style={{ backgroundColor: task.project ? `${projectColor}80` : "hsl(var(--primary) / 0.5)" }} 
                  />

                  {/* Ação de Concluir (Checkbox Custom) */}
                  <form action={async () => await toggleTaskDone(task.id)} className="shrink-0 z-10 pt-0.5">
                    <Button 
                      type="submit" 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 rounded-lg text-muted-foreground/50 border border-border/60 hover:text-emerald-500 hover:border-emerald-500 hover:bg-emerald-500/10 transition-all group/btn"
                      title="Concluir tarefa"
                    >
                      <CheckCircle2 className="h-4 w-4 opacity-0 group-hover/btn:opacity-100 transition-opacity absolute" />
                      <Circle className="h-4 w-4 group-hover/btn:opacity-0 transition-opacity" />
                    </Button>
                  </form>

                  {/* Detalhes da Tarefa */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                    <h4 className="font-bold text-sm text-foreground leading-tight group-hover:text-primary transition-colors truncate">
                      {task.title}
                    </h4>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Data de Vencimento */}
                      {task.dueDate && (
                        <div className={cn(
                          "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                          isLate 
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20" 
                            : "bg-muted/40 text-muted-foreground border-border/40"
                        )}>
                          <CalendarClock className="h-3 w-3" />
                          {format(new Date(task.dueDate), "dd MMM", { locale: ptBR })}
                          {isLate && <span className="ml-1 text-[8px] px-1 bg-rose-500 text-white rounded-sm leading-none py-0.5">Atraso</span>}
                        </div>
                      )}
                      
                      {/* Projeto Associado */}
                      {task.project && (
                        <Badge 
                          variant="outline" 
                          className="text-[9px] h-5 px-2 font-black uppercase tracking-widest gap-1 border border-border/40 bg-background"
                          style={{ color: projectColor }}
                        >
                          <Folder className="h-3 w-3" style={{ color: projectColor }} />
                          {task.project.title}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
            );
          })
        )}
      </div>
      
      {/* FOOTER ACTION */}
      <div className="p-5 border-t border-border/40 bg-muted/10 shrink-0">
        <Button variant="ghost" className="w-full h-12 rounded-xl flex justify-between items-center text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all group/btn border border-transparent hover:border-primary/20" asChild>
          <Link href="/projects">
            <span className="text-[10px] font-black uppercase tracking-widest">Painel de Projetos</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}