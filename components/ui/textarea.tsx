"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------------------------------
 * Textarea — Life OS Enterprise Edition
 * Foco em: Respiro visual (Padding), Tipografia e Variantes de Contexto.
 * ------------------------------------------------------------------------------------------------- */

type TextareaProps = React.ComponentProps<"textarea"> & {
  variant?: "default" | "ghost" | "paper"
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          // --- Base: Comportamento e Respiro Padrão ---
          "flex w-full min-h-[140px] outline-none resize-none transition-all duration-300",
          "text-base md:text-sm leading-relaxed tracking-tight text-foreground/90",
          "selection:bg-primary/20",
          
          // --- Variantes com Calibração de Padding ---
          
          // 1. Default: Padding equilibrado para inputs de formulário
          variant === "default" && [
            "px-4 py-3.5 rounded-xl border border-input bg-background shadow-sm",
            "hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
          ],

          // 2. Ghost: Padding lateral leve para não colar na borda do Modal
          variant === "ghost" && [
            "px-2 py-2 bg-transparent border-none shadow-none",
            "placeholder:text-muted-foreground/30 focus-visible:ring-0"
          ],

          // 3. Paper: Padding generoso (estilo escrita de notas longas)
          variant === "paper" && [
            "px-7 py-7 rounded-[2rem] border-none bg-muted/30 shadow-inner",
            "focus-visible:bg-muted/50"
          ],

          // --- Estados Globais ---
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",

          // --- Scrollbar Premium (Invisível, aparece no hover) ---
          "scrollbar-none hover:scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent",
          
          className
        )}
        {...props}
      />
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }