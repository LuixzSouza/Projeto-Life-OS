"use client"

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

function Accordion(
  props: React.ComponentProps<typeof AccordionPrimitive.Root>
) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className="w-full rounded-xl border border-border bg-card"
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Item
 * -----------------------------------------------------------------------------------------------*/

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        "group border-b last:border-b-0 transition-colors",
        "data-[state=open]:bg-[linear-gradient(180deg,var(--primary)/8,transparent)]",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/trigger relative flex flex-1 items-start justify-between gap-4",
          "rounded-lg px-4 py-4 text-left text-sm font-medium",
          "transition-all duration-200 outline-none",
          "hover:bg-muted/50",
          "focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "data-[state=open]:text-primary",
          "data-[state=open]:bg-[linear-gradient(90deg,var(--primary)/12,transparent)]",
          className
        )}
        {...props}
      >
        <span className="leading-relaxed">{children}</span>

        <ChevronDownIcon
          className={cn(
            "pointer-events-none size-4 shrink-0",
            "text-muted-foreground transition-transform duration-200",
            "group-data-[state=open]/trigger:rotate-180",
            "group-data-[state=open]/trigger:text-primary"
          )}
        />

        {/* Accent bar (premium detail) */}
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full",
            "bg-primary/0 transition-all duration-200",
            "group-data-[state=open]/trigger:bg-primary"
          )}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cn(
        "overflow-hidden text-sm",
        "data-[state=open]:animate-accordion-down",
        "data-[state=closed]:animate-accordion-up"
      )}
      {...props}
    >
      <div
        className={cn(
          "px-4 pb-5 pt-1",
          "text-muted-foreground leading-relaxed",
          "border-l border-primary/20 ml-2",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
}

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
}
