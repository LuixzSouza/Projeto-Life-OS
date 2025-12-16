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
      {/* Trigger Button - Estilo Premium */}
      <DialogTrigger asChild>
        <Button
          className={cn(
            "relative group gap-2 px-5 h-10",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-primary/30 hover:-translate-y-0.5",
            "border border-white/10"
          )}
        >
          <ShieldPlus className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span className="font-semibold tracking-tight">Novo Acesso</span>
        </Button>
      </DialogTrigger>

      {/* Conteúdo do Modal */}
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl">
        
        {/* Header Decorativo */}
        <DialogHeader className="relative p-6 pb-6 border-b border-border/40 bg-muted/30 overflow-hidden">
          {/* Efeito de luz no fundo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex items-start gap-5">
            {/* Ícone com destaque */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background border border-border shadow-sm ring-4 ring-muted">
              <div className="relative">
                <Lock className="h-6 w-6 text-primary" />
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 border border-background">
                    <KeyRound className="h-2.5 w-2.5" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-0.5">
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                Adicionar ao Cofre
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                Armazene credenciais de clientes ou pessoais com criptografia de ponta a ponta.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo do Formulário */}
        <div className="p-6">
          <AccessForm onClose={() => setOpen(false)} />
        </div>

        {/* Footer Decorativo (Opcional, apenas visual) */}
        <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-50" />
      </DialogContent>
    </Dialog>
  );
}