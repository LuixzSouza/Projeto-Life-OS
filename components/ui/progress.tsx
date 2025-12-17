"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /**
   * Classes adicionais aplicadas somente ao indicador (barra interna)
   * Útil para variações visuais sem alterar o comportamento.
   */
  indicatorClassName?: string;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value = 0, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    data-slot="progress"
    className={cn(
      /* Container */
      "relative h-4 w-full overflow-hidden rounded-full",

      /* Base neutra premium */
      "bg-secondary/60",

      /* Borda sutil para contraste enterprise */
      "border border-border/50",

      /* Suavidade visual */
      "shadow-inner",

      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn(
        /* Preenchimento base */
        "h-full w-full flex-1",

        /* Gradiente moderno baseado no primary */
        "bg-gradient-to-r from-primary to-primary/70",

        /* Movimento suave e previsível */
        "transition-transform duration-300 ease-out",

        /* Realce premium */
        "shadow-sm",

        indicatorClassName
      )}
      style={{
        transform: `translateX(-${100 - (value ?? 0)}%)`,
      }}
    />
  </ProgressPrimitive.Root>
));

Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
