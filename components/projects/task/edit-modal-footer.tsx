"use client";

import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Save, Trash2, Loader2 } from 'lucide-react';

interface EditModalFooterProps {
  onDelete: () => void;
  isSaving: boolean;
  onSave: () => void;
}

export function EditModalFooter({ onDelete, isSaving, onSave }: EditModalFooterProps) {
  return (
    <footer className="h-20 px-6 lg:px-8 border-t border-border/40 bg-muted/10 flex items-center justify-between shrink-0">

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" className="h-11 px-4 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 font-semibold text-sm transition-all group">
            <Trash2 size={16} className="mr-2 group-hover:rotate-12 transition-transform" /> Excluir tarefa
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent
          className="rounded-[2rem] border-border/40 shadow-2xl p-8 max-w-sm flex flex-col items-center fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
              <Trash2 size={28} />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-xl font-bold tracking-tight">Excluir tarefa?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
                Esta ação remove a tarefa permanentemente. Não dá para desfazer.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-8 flex flex-col gap-2.5 w-full sm:flex-col">
            <AlertDialogAction
              onClick={onDelete}
              className="h-12 w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-500/20"
            >
              Excluir definitivamente
            </AlertDialogAction>
            <AlertDialogCancel className="h-12 w-full rounded-xl font-bold text-sm border-border/60 bg-transparent hover:bg-muted">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        onClick={onSave}
        disabled={isSaving}
        className="h-12 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
      >
        {isSaving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
        {isSaving ? "Salvando..." : "Salvar alterações"}
      </Button>
    </footer>
  );
}
