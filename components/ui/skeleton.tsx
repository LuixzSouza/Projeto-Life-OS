import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------------------------------
 * Skeleton — Enterprise / Premium
 * Comportamento preservado (div + animate-pulse)
 * Visual refinado, hierarquia clara e tema dinâmico
 * ------------------------------------------------------------------------------------------------- */

function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        /* Base */
        "relative overflow-hidden rounded-md",

        /* Cor base do tema */
        "bg-muted",

        /* Animação principal (mantida) */
        "animate-pulse",

        /* Camada de brilho premium */
        "before:absolute before:inset-0",
        "before:-translate-x-full before:bg-gradient-to-r",
        "before:from-transparent before:via-primary/20 before:to-transparent",
        "before:animate-[shimmer_1.8s_infinite]",

        /* Suavização visual */
        "shadow-sm",

        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
