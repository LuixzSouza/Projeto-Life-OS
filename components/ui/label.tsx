"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        /* Base */
        "inline-flex items-center gap-2 text-sm font-medium leading-none",
        "text-foreground select-none",

        /* Integração com campos */
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",

        /* Hierarquia visual */
        "transition-colors",

        /* Feedback visual sutil (focus do input associado) */
        "peer-focus-visible:text-primary",

        className
      )}
      {...props}
    />
  );
}

export { Label };
