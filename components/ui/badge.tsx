import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-1",
    "w-fit shrink-0 whitespace-nowrap rounded-full",
    "px-2 py-0.5 text-xs font-medium",
    "border transition-[color,background-color,box-shadow]",
    "overflow-hidden",
    "[&>svg]:size-3 [&>svg]:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          [
            "border-transparent",
            "bg-[linear-gradient(135deg,var(--primary),var(--primary)/70)]",
            "text-primary-foreground",
            "shadow-sm",
            "[a&]:hover:opacity-90",
          ].join(" "),

        secondary:
          [
            "border-transparent",
            "bg-secondary",
            "text-secondary-foreground",
            "[a&]:hover:bg-secondary/90",
          ].join(" "),

        destructive:
          [
            "border-transparent",
            "bg-destructive",
            "text-white",
            "shadow-sm",
            "[a&]:hover:bg-destructive/90",
            "focus-visible:ring-destructive/30",
            "dark:bg-destructive/60",
          ].join(" "),

        outline:
          [
            "border-border",
            "text-foreground",
            "bg-transparent",
            "[a&]:hover:bg-accent",
            "[a&]:hover:text-accent-foreground",
          ].join(" "),
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
)

/* -------------------------------------------------------------------------------------------------
 * Component
 * -----------------------------------------------------------------------------------------------*/

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export {
  Badge,
  badgeVariants,
}
