"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------------------------------
 * Checkbox
 * -----------------------------------------------------------------------------------------------*/

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative shrink-0 size-4 rounded-[4px] border border-input",
        "bg-background dark:bg-input/30",
        "shadow-xs transition-all",
        "outline-none",

        /* Checked */
        "data-[state=checked]:border-primary",
        "data-[state=checked]:bg-primary",
        "data-[state=checked]:text-primary-foreground",

        /* Subtle premium glow */
        "data-[state=checked]:shadow-[0_0_0_1px_var(--primary)/40]",

        /* Focus */
        "focus-visible:border-ring",
        "focus-visible:ring-[3px]",
        "focus-visible:ring-ring/50",

        /* Invalid */
        "aria-invalid:border-destructive",
        "aria-invalid:ring-destructive/20",
        "dark:aria-invalid:ring-destructive/40",

        /* Disabled */
        "disabled:cursor-not-allowed",
        "disabled:opacity-50",

        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={cn(
          "grid place-content-center text-current",
          "transition-none"
        )}
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
