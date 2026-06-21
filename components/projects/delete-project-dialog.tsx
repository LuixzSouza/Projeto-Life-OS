"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2, RotateCcw } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteProject, restoreProject } from "@/app/(dashboard)/projects/actions";

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  title: string;
  taskCount?: number;
  /** Chamado após mover para a lixeira (ex.: navegar para /projects no board). */
  onDeleted?: () => void;
}

export function DeleteProjectDialog({
  open, onOpenChange, projectId, title, taskCount, onDeleted,
}: DeleteProjectDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteProject(projectId);
      onOpenChange(false);
      toast.success(`"${title}" movido para a lixeira.`, {
        icon: <Trash2 className="h-4 w-4" />,
        action: {
          label: "Desfazer",
          onClick: async () => {
            await restoreProject(projectId);
            toast.success(`"${title}" restaurado.`, { icon: <RotateCcw className="h-4 w-4" /> });
            router.refresh();
          },
        },
      });
      onDeleted?.();
      router.refresh();
    } catch {
      toast.error("Erro ao mover o projeto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
            <Trash2 className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="text-xl font-black tracking-tight">Mover para a Lixeira</DialogTitle>
            <DialogDescription className="text-muted-foreground leading-relaxed">
              O projeto <strong className="text-foreground">{title}</strong> sai das listagens. Dá para restaurar a qualquer momento.
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody>
          <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">O que acontece</p>
            <ul className="space-y-1.5 text-xs text-muted-foreground/90">
              {taskCount !== undefined && taskCount > 0 && (
                <li className="flex gap-1.5"><span className="text-primary">•</span> As <strong className="text-foreground/80">{taskCount}</strong> tarefas são preservadas e voltam ao restaurar.</li>
              )}
              <li className="flex gap-1.5"><span className="text-primary">•</span> O projeto fica na Lixeira até a exclusão definitiva.</li>
              <li className="flex gap-1.5"><span className="text-primary">•</span> Você pode desfazer logo após confirmar.</li>
            </ul>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="font-bold"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            disabled={loading}
            className="gap-2 bg-destructive font-bold text-white hover:bg-destructive/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Mover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
