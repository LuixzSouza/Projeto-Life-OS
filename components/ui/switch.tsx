"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------------------------------
 * Switch — Enterprise / Premium
 * Comportamento preservado
 * Visual refinado, hierarquia clara e tema dinâmico
 * ------------------------------------------------------------------------------------------------- */

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        [
          // Base
          "peer inline-flex shrink-0 items-center rounded-full border border-transparent",
          "h-[1.15rem] w-8",

          // Cores dinâmicas
          "data-[state=checked]:bg-primary",
          "data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80",

          // Sombra e profundidade (enterprise)
          "shadow-xs",

          // Transições suaves
          "transition-all duration-200 ease-in-out",

          // Acessibilidade / foco
          "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",

          // Estados desabilitados
          "disabled:cursor-not-allowed disabled:opacity-50",
        ].join(" "),
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          [
            // Base
            "pointer-events-none block size-4 rounded-full",

            // Cores do thumb
            "bg-background",
            "dark:data-[state=unchecked]:bg-foreground",
            "dark:data-[state=checked]:bg-primary-foreground",

            // Movimento
            "transition-transform duration-200 ease-in-out",
            "data-[state=checked]:translate-x-[calc(100%-2px)]",
            "data-[state=unchecked]:translate-x-0",

            // Leve realce premium
            "shadow-sm",
          ].join(" ")
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
