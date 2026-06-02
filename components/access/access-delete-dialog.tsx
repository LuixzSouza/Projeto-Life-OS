"use client";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";

interface AccessDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function AccessDeleteDialog({ open, onOpenChange, isDeleting, onConfirm }: AccessDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="h-16 w-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center rounded-[1.5rem] mb-4 shadow-inner">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <AlertDialogTitle>Expurgar Credencial?</AlertDialogTitle>
          <AlertDialogDescription>Esta ação é irreversível. A chave de acesso será destruída do cofre de forma permanente.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Abortar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            className="bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Expurgo"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
