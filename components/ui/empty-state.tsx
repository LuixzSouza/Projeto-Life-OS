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

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("relative flex flex-col items-center justify-center gap-3 p-10 text-center rounded-[2rem] bg-gradient-to-b from-card/40 to-muted/20 border border-dashed border-border/60 shadow-sm transition-all hover:bg-muted/30", className)}>
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-background shadow-sm border border-border/50 text-muted-foreground/60">
        <Icon className="size-8" />
      </div>
      <h3 className="text-xl font-extrabold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="max-w-xs text-sm font-medium text-muted-foreground/80 leading-relaxed">
        {description}
      </p>
      {action && (
        <div className="mt-6 flex items-center justify-center w-full">
          {action}
        </div>
      )}
    </div>
  )
}