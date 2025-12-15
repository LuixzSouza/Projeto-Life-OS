"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, CheckCircle2, Circle, Folder } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { toggleTaskDone } from "@/app/(dashboard)/agenda/actions"; 
import { Prisma } from "@prisma/client";

type TaskWithProject = Prisma.TaskGetPayload<{
    include: { project: { select: { title: true, color: true } } }
}>;

export function TaskList({ tasks }: { tasks: TaskWithProject[] }) {
  return (
    <div className="p-6">
        <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" /> Prioridade Alta
            </h3>
            <Badge variant="secondary">{tasks.length} pendentes</Badge>
        </div>
        
        <div className="space-y-3">
            {tasks.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/20">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
                    <p className="text-muted-foreground">Tudo limpo por aqui!</p>
                </div>
            ) : (
                tasks.map(task => (
                    <div key={task.id} className="group flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-all shadow-sm">
                        <form action={async () => await toggleTaskDone(task.id)}>
                            <Button type="submit" size="icon" variant="ghost" className="h-6 w-6 rounded-full p-0 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10">
                                <Circle className="h-5 w-5" />
                            </Button>
                        </form>
                        <div className="flex-1">
                            <p className="font-medium text-sm text-foreground">{task.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                                {task.dueDate && (
                                    <span className={`text-xs font-medium ${new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-muted-foreground'}`}>
                                        {format(new Date(task.dueDate), 'dd MMM')}
                                    </span>
                                )}
                                {task.project && (
                                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        <Folder className="h-3 w-3" /> {task.project.title}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
        
        <Button variant="ghost" className="w-full mt-6 text-muted-foreground hover:text-primary" asChild>
            <Link href="/projects">Ver quadro de projetos completo &rarr;</Link>
        </Button>
    </div>
  );
}