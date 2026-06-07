"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  createNotebook, updateNotebook, deleteNotebook, type NotebookData,
} from "@/app/(dashboard)/notes/notebook-actions";

const PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#0ea5e9", "#64748b",
];

export function NotebookDialog({
  state,
  onClose,
  onSaved,
}: {
  /** "new" para criar, um NotebookData para editar, null = fechado. */
  state: NotebookData | "new" | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isEdit = state !== null && state !== "new";
  const nb = isEdit ? (state as NotebookData) : null;

  const [name, setName] = useState(nb?.name ?? "");
  const [color, setColor] = useState(nb?.color ?? PALETTE[0]);
  const [pending, run] = useTransition();

  const save = () => {
    if (!name.trim()) {
      toast.error("Dê um nome ao caderno.");
      return;
    }
    run(async () => {
      const res = nb
        ? await updateNotebook(nb.id, { name, color })
        : await createNotebook(name, color);
      if (res.success) {
        toast.success(res.message);
        await onSaved();
      } else {
        toast.error(res.message);
      }
    });
  };

  const remove = () => {
    if (!nb) return;
    run(async () => {
      const res = await deleteNotebook(nb.id);
      if (res.success) {
        toast.success(res.message);
        await onSaved();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Dialog open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar caderno" : "Novo caderno"}</DialogTitle>
          <DialogDescription>
            Cadernos organizam suas notas por assunto (Trabalho, Pessoal, Ideias…).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do caderno"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") save(); }}
          />

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cor</label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                    color === c ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {isEdit && !nb?.isInbox ? (
            <Button variant="ghost" onClick={remove} disabled={pending} className="text-destructive hover:text-destructive">
              <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} disabled={pending} className="min-w-[90px]">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Salvar" : "Criar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
