"use client";

import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SubjectDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function SubjectDeleteDialog({ open, onOpenChange, onConfirm }: SubjectDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-destructive/30 rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive text-xl">
            <AlertTriangle className="h-6 w-6" /> Excluir Matéria?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-foreground/80 mt-2">
            Tem certeza que deseja deletar permanentemente esta matéria?
            <strong className="block mt-3 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 text-sm">
              Aviso: Todo o histórico de sessões, cronômetros e anotações vinculadas a este tópico será apagado para sempre.
            </strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-2">
          <AlertDialogCancel className="h-11 rounded-xl font-bold">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="h-11 rounded-xl font-bold bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20">
            Sim, excluir matéria
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
