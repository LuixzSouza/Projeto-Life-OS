"use client";

import { useState } from "react";
import { deleteDeck } from "@/app/(dashboard)/flashcards/actions";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteDeckAlertProps {
  deckId: string | null;
  onClose: () => void;
}

export function DeleteDeckAlert({ deckId, onClose }: DeleteDeckAlertProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function executeDelete() {
    if (!deckId) return;

    setIsDeleting(true);
    const toastId = toast.loading("Removendo baralho...");
    const result = await deleteDeck(deckId);

    if (result.success) {
      toast.success("Baralho removido com sucesso.", { id: toastId });
      onClose();
    } else {
      toast.error("Erro ao remover o baralho.", { id: toastId });
    }
    setIsDeleting(false);
  }

  return (
    <AlertDialog open={!!deckId} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="border-destructive/30 rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive text-xl">
            <AlertTriangle className="h-6 w-6" /> Excluir Baralho?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-foreground/80 mt-2">
            Você está prestes a deletar este baralho.
            <strong className="block mt-3 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 text-sm">
              Aviso: TODOS os flashcards contidos nele serão apagados permanentemente e o progresso de revisão será perdido.
            </strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-2">
          <AlertDialogCancel className="h-11 rounded-xl font-bold">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={executeDelete} disabled={isDeleting} className="h-11 rounded-xl font-bold bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20 min-w-[140px]">
            {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Sim, Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
