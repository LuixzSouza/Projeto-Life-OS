"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button"; // Removido ButtonProps da importação
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

// Solução: Extrair o tipo 'variant' diretamente das props do componente Button
type ButtonVariant = React.ComponentProps<typeof Button>["variant"];

interface EventDeleteButtonProps {
  eventId: string;
  eventTitle: string;
  className?: string;
  variant?: ButtonVariant; // Uso do tipo inferido
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
      toast.success("Evento removido com sucesso.");
      router.refresh();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível excluir o evento.");
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
          className={cn(
            "transition-all duration-200",
            "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            className
          )}
        >
          <Trash2 className={cn("h-4 w-4", variant !== "ghost" && "mr-2")} />
          {variant !== "ghost" && "Excluir"}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="sm:max-w-[450px] p-6 gap-6">
        <AlertDialogHeader className="sm:text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          
          <AlertDialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Excluir compromisso?
          </AlertDialogTitle>
          
          <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed mt-2">
            Você está prestes a remover <strong className="text-foreground">&quot;{eventTitle}&quot;</strong> da sua agenda. 
            <br />
            Esta ação é irreversível e liberará o horário agendado.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="sm:justify-center gap-3">
          <AlertDialogCancel 
            disabled={isDeleting} 
            className="w-full sm:w-auto mt-0 border-border hover:bg-muted"
          >
            Cancelar
          </AlertDialogCancel>
          
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm shadow-destructive/20"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...
              </>
            ) : (
              "Sim, excluir permanentemente"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}