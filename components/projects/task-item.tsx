"use client";

import { Checkbox } from "@/components/ui/checkbox"; // Vamos instalar já já
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleTask, deleteTask } from "@/app/(dashboard)/projects/actions";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    isDone: boolean;
  };
}

export function TaskItem({ task }: TaskItemProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await toggleTask(task.id, task.isDone);
    });
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
      startTransition(async () => {
        await deleteTask(task.id);
      });
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border transition-all",
      task.isDone ? "bg-zinc-50 dark:bg-zinc-900/50 opacity-60" : "bg-white dark:bg-zinc-950"
    )}>
      <div className="flex items-center gap-3">
        {/* Checkbox Customizado */}
        <div 
            onClick={handleToggle}
            className={cn(
                "h-5 w-5 rounded border cursor-pointer flex items-center justify-center transition-colors",
                task.isDone ? "bg-green-500 border-green-500" : "border-zinc-300 hover:border-zinc-400"
            )}
        >
            {task.isDone && <span className="text-white text-xs font-bold">✓</span>}
        </div>
        
        <span className={cn("text-sm", task.isDone && "line-through text-zinc-500")}>
          {task.title}
        </span>
      </div>

      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-zinc-400 hover:text-red-500"
        onClick={handleDelete}
        disabled={isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}