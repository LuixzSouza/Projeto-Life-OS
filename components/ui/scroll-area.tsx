"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn(
        /* Base estrutural */
        "relative overflow-hidden",

        /* Integração visual com cards e containers */
        "rounded-[inherit]",

        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          /* Ocupa todo o espaço */
          "size-full",

          /* Herda bordas do container */
          "rounded-[inherit]",

          /* UX e acessibilidade */
          "outline-none transition-[color,box-shadow]",

          /* Focus enterprise */
          "focus-visible:ring-[3px] focus-visible:ring-ring/50"
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>

      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  const isVertical = orientation === "vertical";

  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        /* Base */
        "flex touch-none select-none p-px transition-colors",

        /* Layout por orientação */
        isVertical
          ? "h-full w-2.5 border-l border-transparent"
          : "h-2.5 flex-col border-t border-transparent",

        /* Aparência neutra enterprise */
        "bg-transparent",

        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className={cn(
          /* Forma */
          "relative flex-1 rounded-full",

          /* Visual premium */
          "bg-muted/60",

          /* Destaque com primary */
          "hover:bg-primary/60 active:bg-primary",

          /* Transições suaves */
          "transition-colors duration-200"
        )}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
