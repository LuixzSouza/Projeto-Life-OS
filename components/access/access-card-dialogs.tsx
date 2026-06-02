"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Fingerprint, AlertTriangle } from "lucide-react";
import { AccessForm, AccessData } from "./access-form";

export function AccessEditDialog({ open, onOpenChange, formData }: { open: boolean; onOpenChange: (o: boolean) => void; formData: AccessData }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
              <Fingerprint className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle>Sincronizar Acesso</DialogTitle>
              <DialogDescription>Atualize as credenciais no cofre</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <AccessForm item={formData} onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AccessDeleteDialog({ open, onOpenChange, onConfirm, isDeleting }: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: () => void; isDeleting: boolean }) {
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
