"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------------------------------
 * Tooltip Provider
 * ------------------------------------------------------------------------------------------------- */

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Tooltip Root
 * Mantém API simples e previsível
 * ------------------------------------------------------------------------------------------------- */

function Tooltip(
  props: React.ComponentProps<typeof TooltipPrimitive.Root>
) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Tooltip Trigger
 * ------------------------------------------------------------------------------------------------- */

function TooltipTrigger(
  props: React.ComponentProps<typeof TooltipPrimitive.Trigger>
) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Tooltip Content — Enterprise / Premium
 * Hierarquia clara, contraste elegante e animações suaves
 * ------------------------------------------------------------------------------------------------- */

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          // Base container
          "z-50 w-fit max-w-xs rounded-md px-3 py-1.5 text-xs leading-relaxed",

          // Colors & theme
          "bg-foreground text-background",
          "shadow-lg ring-1 ring-black/5 dark:ring-white/10",

          // Motion & polish
          "origin-(--radix-tooltip-content-transform-origin)",
          "animate-in fade-in-0 zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",

          // Directional animations
          "data-[side=bottom]:slide-in-from-top-2",
          "data-[side=top]:slide-in-from-bottom-2",
          "data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2",

          // Typography refinement
          "text-balance tracking-tight",

          // Optional premium accent using primary
          "before:absolute before:inset-0 before:rounded-md before:opacity-[0.04]",
          "before:bg-[linear-gradient(135deg,var(--primary),transparent)]",
          "before:pointer-events-none",

          className
        )}
        {...props}
      >
        {children}

        {/* Arrow */}
        <TooltipPrimitive.Arrow
          className={cn(
            "z-50 size-2.5 rotate-45 rounded-[2px]",
            "bg-foreground fill-foreground",
            "shadow-sm",
            "ring-1 ring-black/5 dark:ring-white/10"
          )}
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
}
