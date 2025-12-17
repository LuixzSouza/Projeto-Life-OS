"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------------------------------
 * Separator
 * ------------------------------------------------------------------------------------------------- */

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        /* Base */
        "relative shrink-0",

        /* Dimensões */
        "data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full",
        "data-[orientation=vertical]:w-px data-[orientation=vertical]:h-full",

        /* Visual padrão */
        "bg-border",

        /* Acabamento premium */
        "opacity-70",

        /* Destaque sutil com primary */
        "data-[orientation=horizontal]:bg-gradient-to-r",
        "data-[orientation=horizontal]:from-transparent",
        "data-[orientation=horizontal]:via-primary/40",
        "data-[orientation=horizontal]:to-transparent",

        "data-[orientation=vertical]:bg-gradient-to-b",
        "data-[orientation=vertical]:from-transparent",
        "data-[orientation=vertical]:via-primary/40",
        "data-[orientation=vertical]:to-transparent",

        /* Transições suaves */
        "transition-opacity",

        className
      )}
      {...props}
    />
  );
}

export { Separator };
