"use client";

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
import { Loader2, AlertCircle } from "lucide-react";

interface DeleteTransactionAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  onConfirm: () => void;
}

export function DeleteTransactionAlert({ open, onOpenChange, isLoading, onConfirm }: DeleteTransactionAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[2rem] border-destructive/20 shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 text-destructive mb-2">
            <div className="p-3 rounded-2xl bg-destructive/10">
              <AlertCircle className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl font-bold">
              Excluir Transação?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base text-muted-foreground">
            Você está prestes a remover esta transação. O saldo da sua
            carteira será automaticamente recalculado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel className="rounded-xl h-12 font-bold">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90 rounded-xl h-12 font-bold px-8 shadow-lg shadow-destructive/20"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
