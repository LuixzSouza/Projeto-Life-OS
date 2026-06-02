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
    <footer className="h-24 px-8 border-t border-border/40 bg-muted/5 flex items-center justify-between shrink-0">

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" className="h-12 px-6 rounded-2xl text-muted-foreground/30 hover:text-rose-500 font-black text-[10px] uppercase tracking-widest transition-all group">
            <Trash2 size={16} className="mr-2 group-hover:rotate-12 transition-transform" /> Eliminar Unidade
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent
          className="rounded-[2.5rem] border-border/40 shadow-2xl p-10 max-w-sm flex flex-col items-center fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="h-20 w-20 rounded-[2rem] bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-inner">
              <Trash2 size={32} />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-3xl font-black uppercase tracking-tighter italic">Apagar?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground font-medium text-sm leading-relaxed px-4">
                Esta ação removerá todos os dados desta missão permanentemente do Life OS.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-10 flex flex-col gap-3 w-full sm:flex-col">
            <AlertDialogAction
              onClick={onDelete}
              className="h-14 w-full rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-rose-500/20"
            >
              Confirmar Exclusão
            </AlertDialogAction>
            <AlertDialogCancel className="h-14 w-full rounded-2xl font-black uppercase text-[11px] tracking-widest border-border/60 bg-transparent hover:bg-muted">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        onClick={onSave}
        disabled={isSaving}
        className="h-14 px-12 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-[0.1em] text-[11px] shadow-2xl transition-all active:scale-95 disabled:opacity-50"
      >
        {isSaving ? <Loader2 size={18} className="animate-spin mr-3" /> : <Save size={18} className="mr-3" />}
        {isSaving ? "Salvando..." : "Confirmar Mudanças"}
      </Button>
    </footer>
  );
}
