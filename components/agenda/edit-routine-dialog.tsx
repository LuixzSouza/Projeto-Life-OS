"use client";

import { useState } from "react";
import { RoutineItem } from "@prisma/client";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Clock } from "lucide-react";
import { RoutineForm } from "./routine-form";

// --- DIALOG DE EDIÇÃO ---
export function EditRoutineDialog({ item, children }: { item: RoutineItem; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-[500px] p-0 bg-background border-border/40 shadow-2xl rounded-[2.5rem] z-[100] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border/40 bg-muted/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tighter">Editar Bloco</DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Ajuste os parâmetros da rotina</DialogDescription>
            </div>
          </div>
        </div>
        {/* O Form gerencia seu próprio scroll interno */}
        <RoutineForm item={item} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
