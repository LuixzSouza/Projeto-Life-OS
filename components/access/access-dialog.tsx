"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldPlus, LockKeyhole } from "lucide-react";
import { AccessForm } from "./access-form";
import { cn } from "@/lib/utils";

export function AccessDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button 
                    className={cn(
                        "group relative overflow-hidden bg-zinc-900 dark:bg-white text-white dark:text-zinc-900",
                        "hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-300",
                        "border border-zinc-800 dark:border-zinc-200 shadow-sm hover:shadow-md",
                        // Um brilho sutil na borda inferior para dar um toque premium
                        "after:absolute after:inset-x-0 after:bottom-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent dark:after:via-black/20"
                    )}
                >
                    <ShieldPlus className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" /> 
                    Novo Acesso Seguro
                </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-2xl">
                {/* Cabeçalho Decorado */}
                <DialogHeader className="p-6 pb-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 relative overflow-hidden">
                    {/* Textura de fundo sutil (opcional, remove se não gostar) */}
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.15] dark:opacity-[0.05] pointer-events-none" />

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="h-12 w-12 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                            <LockKeyhole className="h-6 w-6 text-zinc-700 dark:text-zinc-300" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold tracking-tight">
                                Adicionar ao Cofre
                            </DialogTitle>
                            <DialogDescription className="text-zinc-500 mt-1.5 leading-tight">
                                Guarde senhas e dados sensíveis. Tudo é criptografado antes de salvar.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                
                {/* Área do Formulário com padding */}
                <div className="p-6 pt-2">
                    <AccessForm onClose={() => setOpen(false)} />
                </div>
            </DialogContent>
        </Dialog>
    );
}