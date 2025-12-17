import * as React from "react"
import { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 p-8 text-center",

        /* Container */
        "rounded-2xl border border-dashed border-border",
        "bg-gradient-to-b from-background to-muted/30",
        "shadow-sm",

        /* Focus / Hover refinement */
        "transition-colors",

        className
      )}
    >
      {/* Icon container */}
      <div
        data-slot="empty-state-icon"
        className={cn(
          "mb-3 flex size-12 items-center justify-center rounded-full",
          "bg-primary/10 ring-1 ring-primary/20",
          "text-primary"
        )}
      >
        <Icon className="size-6" />
      </div>

      {/* Title */}
      <h3
        data-slot="empty-state-title"
        className="text-sm font-semibold leading-none text-foreground"
      >
        {title}
      </h3>

      {/* Description */}
      <p
        data-slot="empty-state-description"
        className="max-w-xs text-sm text-muted-foreground"
      >
        {description}
      </p>

      {/* Action */}
      {action && (
        <div
          data-slot="empty-state-action"
          className="mt-4 flex items-center justify-center"
        >
          {action}
        </div>
      )}
    </div>
  )
}
