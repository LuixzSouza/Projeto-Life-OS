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
import { ShieldPlus, LockKeyhole } from "lucide-react";
import { AccessForm } from "./access-form";
import { cn } from "@/lib/utils";

export function AccessDialog() {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger */}
      <DialogTrigger asChild>
        <Button
          className={cn(
            "relative overflow-hidden group gap-2",
            "shadow-sm hover:shadow-md transition-all",
            "after:absolute after:inset-x-0 after:bottom-0 after:h-px",
            "after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent",
            "dark:after:via-black/30"
          )}
        >
          <ShieldPlus className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span className="font-medium">Novo Acesso Seguro</span>
        </Button>
      </DialogTrigger>

      {/* Conteúdo */}
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border shadow-2xl">
        {/* Header */}
        <DialogHeader className="relative p-6 pb-5 border-b bg-muted/40">
          {/* Background decorativo */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] 
                       [background-size:16px_16px] opacity-[0.18] dark:opacity-[0.06]"
          />

          <div className="relative z-10 flex items-start gap-4">
            <div
              className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                "bg-background border shadow-sm"
              )}
            >
              <LockKeyhole className="h-6 w-6 text-primary" />
            </div>

            <div className="space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Adicionar ao Cofre
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                Salve credenciais, URLs e dados sensíveis com criptografia forte
                antes de persistir.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <div className="p-6 pt-4">
          <AccessForm onClose={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
