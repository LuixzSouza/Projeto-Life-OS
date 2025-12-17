"use client"

import * as React from "react"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/* -------------------------------------------------------------------------------------------------
 * Toaster — Enterprise / Premium
 * Comportamento preservado
 * Visual refinado, hierarquia clara e tema dinâmico
 * ------------------------------------------------------------------------------------------------- */

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-[color:var(--primary)]" />
        ),
        info: (
          <InfoIcon className="size-4 text-[color:var(--primary)]" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-yellow-500 dark:text-yellow-400" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-destructive" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-[color:var(--primary)]" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast: [
            "group toast",
            "rounded-lg border shadow-lg",
            "bg-popover text-popover-foreground border-border",
            "backdrop-blur-sm",
          ].join(" "),
          title: "font-semibold text-sm",
          description: "text-sm text-muted-foreground",
          actionButton:
            "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md",
          cancelButton:
            "bg-muted text-muted-foreground hover:bg-muted/80 rounded-md",
        },
      }}
      style={
        {
          /* Base */
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",

          /* Destaque */
          "--accent-bg": "color-mix(in oklab, var(--primary) 10%, transparent)",
          "--accent-border": "color-mix(in oklab, var(--primary) 30%, transparent)",

          /* Radius */
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
