"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------------------------------
 * Textarea — Enterprise / Premium
 * Visual refinado e interatividade aprimorada
 * Cores dinâmicas do tema, feedback visual e estrutura clara
 * ------------------------------------------------------------------------------------------------- */

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Base styles
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30",

        // Container styles
        "flex w-full min-h-16 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",

        // States and interactivity
        "focus-visible:ring-[3px] focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",

        // Hover and focus effects
        "hover:ring-2 hover:ring-primary/30 focus-visible:ring-primary/30 focus-visible:ring-2 focus-visible:ring-offset-2",
        
        // Responsive sizing
        "md:text-sm",

        // Dynamic styles based on theme and invalid states
        "dark:bg-input/30 dark:focus-visible:ring-primary/30 dark:focus-visible:ring-offset-dark",

        className
      )}
      {...props}
    />
  )
}

export { Textarea }
