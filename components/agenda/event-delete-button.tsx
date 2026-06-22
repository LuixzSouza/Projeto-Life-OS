"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button"; 
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteEvent } from "@/app/(dashboard)/agenda/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ButtonVariant = React.ComponentProps<typeof Button>["variant"];

interface EventDeleteButtonProps {
  eventId: string;
  eventTitle: string;
  className?: string;
  variant?: ButtonVariant; 
}

export function EventDeleteButton({
  eventId,
  eventTitle,
  className,
  variant = "ghost",
}: EventDeleteButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEvent(eventId);
      toast.success("Alocação de tempo removida.");
      router.refresh();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Falha ao excluir registro.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={variant === "ghost" ? "icon" : "default"}
          aria-label="Excluir"
          className={cn(
            "transition-all duration-200",
            "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10",
            className
          )}
        >
          <Trash2 className={cn("h-4 w-4", variant !== "ghost" && "mr-2")} />
          {variant !== "ghost" && <span className="text-[10px] font-black uppercase tracking-widest">Excluir</span>}
        </Button>
      </AlertDialogTrigger>

      {/* Modal Estilo HUD (Centralizado, Bordas Altas) */}
      <AlertDialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:max-w-[450px] p-8 gap-6 bg-background border-border/40 shadow-2xl rounded-[2.5rem] z-[100]">
        <AlertDialogHeader className="sm:text-center flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-rose-500/10 border border-rose-500/20 shadow-inner">
            <AlertTriangle className="h-7 w-7 text-rose-500" />
          </div>
          
          <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground">
            Abortar Evento?
          </AlertDialogTitle>
          
          <AlertDialogDescription className="text-muted-foreground text-xs font-medium leading-relaxed mt-2 text-center">
            O evento <strong className="text-foreground">&quot;{eventTitle}&quot;</strong> será removido permanentemente, liberando este bloco na sua linha do tempo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="sm:justify-center gap-3 w-full">
          <AlertDialogCancel 
            disabled={isDeleting} 
            className="w-full sm:w-auto h-12 rounded-xl text-[10px] font-black uppercase tracking-widest border-border/60 hover:bg-muted"
          >
            Cancelar
          </AlertDialogCancel>
          
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="w-full sm:w-auto h-12 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Confirmar Exclusão"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}