"use client";

import { useState } from "react";
import { RoutineItem } from "@prisma/client";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Clock } from "lucide-react";
import { RoutineForm } from "./routine-form";

// --- DIALOG DE EDIÇÃO ---
export function EditRoutineDialog({ item, children }: { item: RoutineItem; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent size="md">
        <DialogHeader
          icon={<Clock className="h-5 w-5" />}
          title="Editar Bloco"
          description="Ajuste os parâmetros da rotina"
        />
        {/* O Form gerencia seu próprio scroll interno */}
        <RoutineForm item={item} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
