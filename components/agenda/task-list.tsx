"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Circle, Folder, ArrowRight, CalendarClock, Sparkles } from "lucide-react";
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border/40 flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground leading-tight">Tarefas Prioritárias</h3>
            <p className="text-xs text-muted-foreground">Foco para hoje</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-background font-mono font-medium">
          {tasks.length}
        </Badge>
      </div>
      
      {/* List Content */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[400px]">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center border-2 border-dashed border-border/60 rounded-xl bg-muted/5 animate-in fade-in duration-500">
            <div className="bg-emerald-500/10 p-4 rounded-full mb-4 ring-1 ring-emerald-500/20">
              <Sparkles className="h-8 w-8 text-emerald-600" />
            </div>
            <h4 className="text-base font-semibold text-foreground">Tudo em dia!</h4>
            <p className="text-sm text-muted-foreground max-w-[200px] mt-1 leading-relaxed">
              Você completou todas as tarefas prioritárias. Aproveite o foco livre.
            </p>
          </div>
        ) : (
          tasks.map(task => (
            <div 
              key={task.id} 
              className="group flex items-start gap-4 p-4 rounded-xl bg-card border border-border/60 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden"
            >
              {/* Indicador de prioridade (opcional visual) */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/0 group-hover:bg-primary transition-all duration-300" />

              {/* Check Action */}
              <form action={async () => await toggleTaskDone(task.id)} className="pt-0.5">
                <Button 
                  type="submit" 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6 rounded-full text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                  title="Concluir tarefa"
                >
                  <Circle className="h-5 w-5" />
                </Button>
              </form>

              {/* Task Details */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className={cn(
                  "font-medium text-sm text-foreground leading-snug group-hover:text-primary transition-colors",
                  // Adicione lógica aqui se quiser riscar tarefas completadas visualmente antes de sumirem
                )}>
                  {task.title}
                </p>
                
                <div className="flex flex-wrap items-center gap-2">
                  {task.dueDate && (
                    <div className={cn(
                      "flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md border",
                      new Date(task.dueDate) < new Date() 
                        ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400" 
                        : "bg-muted/50 text-muted-foreground border-transparent"
                    )}>
                      <CalendarClock className="h-3 w-3" />
                      {format(new Date(task.dueDate), "d 'de' MMM", { locale: ptBR })}
                    </div>
                  )}
                  
                  {task.project && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-2 font-normal bg-muted text-muted-foreground hover:bg-muted border-transparent gap-1">
                      <Folder className="h-3 w-3 opacity-70" />
                      {task.project.title}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Footer Action */}
      <div className="p-4 border-t border-border/40 bg-muted/5">
        <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-primary group/btn" asChild>
          <Link href="/projects">
            <span className="text-sm font-medium">Gerenciar Projetos</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}