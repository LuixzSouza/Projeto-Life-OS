"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldPlus, Lock, KeyRound } from "lucide-react";
import { AccessForm } from "./access-form";
import { cn } from "@/lib/utils";

export function AccessDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* TRIGGER BUTTON (Estilo Tático Premium) */}
      <DialogTrigger asChild>
        <Button
          className={cn(
            "h-11 px-5 rounded-xl bg-foreground text-background hover:bg-primary hover:text-white shadow-lg",
            "font-black uppercase tracking-widest text-[10px] gap-2 transition-all active:scale-95 group"
          )}
        >
          <ShieldPlus className="h-4 w-4 stroke-[3] transition-transform group-hover:scale-110" />
          <span>Novo Acesso</span>
        </Button>
      </DialogTrigger>

      {/* CONTEÚDO DO MODAL (O design já vem do componente base Dialog) */}
      <DialogContent className="p-0">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20 relative">
              <Lock className="h-6 w-6" />
              {/* Micro-detalhe da chave no canto */}
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 border-2 border-background">
                  <KeyRound className="h-2.5 w-2.5" />
              </div>
            </div>
            <div>
              <DialogTitle>Adicionar ao Cofre</DialogTitle>
              <DialogDescription>Credenciais com criptografia ponta-a-ponta</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* CONTAINER DO FORMULÁRIO (Com rolagem segura) */}
        <div className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <AccessForm onClose={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}