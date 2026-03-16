"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

/* -------------------------------------------------------------------------------------------------
 * Calendar (HUD Design)
 * -----------------------------------------------------------------------------------------------*/

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      className={cn(
        "group/calendar rounded-[1.5rem] border border-border/40 bg-card p-5 shadow-xl",
        "[[data-slot=card-content]_&]:bg-transparent",
        "[[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),

        months: cn(
          "relative flex flex-col gap-6 md:flex-row",
          defaultClassNames.months
        ),

        month: cn("flex w-full flex-col gap-5", defaultClassNames.month),

        nav: cn(
          "absolute inset-x-0 top-0 flex items-center justify-between gap-1",
          defaultClassNames.nav
        ),

        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-8 w-8 p-0 rounded-xl bg-muted/30 hover:bg-primary/20 hover:text-primary transition-all aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),

        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-8 w-8 p-0 rounded-xl bg-muted/30 hover:bg-primary/20 hover:text-primary transition-all aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),

        month_caption: cn(
          "flex h-8 w-full items-center justify-center",
          defaultClassNames.month_caption
        ),

        // Cabeçalho do Mês (Tipografia Tática)
        caption_label: cn(
          "select-none text-xs font-black uppercase tracking-widest text-foreground",
          captionLayout !== "label" &&
            "flex h-8 items-center gap-1 rounded-md pl-2 pr-1 [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label
        ),

        dropdowns: cn(
          "flex h-8 w-full items-center justify-center gap-1.5 text-sm font-bold uppercase",
          defaultClassNames.dropdowns
        ),

        dropdown_root: cn(
          "relative rounded-xl border border-input shadow-xs",
          "has-focus:border-primary has-focus:ring-[3px] has-focus:ring-primary/20",
          defaultClassNames.dropdown_root
        ),

        dropdown: cn(
          "absolute inset-0 bg-popover opacity-0",
          defaultClassNames.dropdown
        ),

        table: "w-full border-collapse space-y-2",

        weekdays: cn("flex pb-2", defaultClassNames.weekdays),

        // Dias da Semana (Seg, Ter, Qua...)
        weekday: cn(
          "flex-1 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 select-none",
          defaultClassNames.weekday
        ),

        week: cn("mt-2 flex w-full gap-1", defaultClassNames.week),

        week_number_header: cn(
          "w-9 select-none",
          defaultClassNames.week_number_header
        ),

        week_number: cn(
          "text-[0.8rem] text-muted-foreground select-none",
          defaultClassNames.week_number
        ),

        day: cn(
          "group/day relative aspect-square w-full p-0 text-center select-none outline-none",
          "[&:last-child[data-selected=true]_button]:rounded-r-xl",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-xl"
            : "[&:first-child[data-selected=true]_button]:rounded-l-xl",
          defaultClassNames.day
        ),

        // Dia Atual (Hoje)
        today: cn(
          "rounded-xl border border-primary/30 bg-primary/5 text-primary data-[selected=true]:rounded-none font-black",
          defaultClassNames.today
        ),

        // Dias de outros meses
        outside: cn(
          "text-muted-foreground/30 aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),

        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),

        range_start: cn(
          "bg-primary text-primary-foreground rounded-l-xl",
          defaultClassNames.range_start
        ),

        range_middle: cn(
          "bg-primary/10 text-primary rounded-none",
          defaultClassNames.range_middle
        ),

        range_end: cn(
          "bg-primary text-primary-foreground rounded-r-xl",
          defaultClassNames.range_end
        ),

        hidden: cn("invisible", defaultClassNames.hidden),

        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => (
          <div
            data-slot="calendar"
            ref={rootRef}
            className={cn(className)}
            {...props}
          />
        ),

        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn("h-4 w-4", className)} {...props} />
          }

          if (orientation === "right") {
            return <ChevronRightIcon className={cn("h-4 w-4", className)} {...props} />
          }

          return <ChevronDownIcon className={cn("h-4 w-4", className)} {...props} />
        },

        DayButton: CalendarDayButton,

        WeekNumber: ({ children, ...props }) => (
          <td {...props}>
            <div className="flex h-9 w-9 items-center justify-center text-center">
              {children}
            </div>
          </td>
        ),

        ...components,
      }}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Day Button (Os quadrados dos dias)
 * -----------------------------------------------------------------------------------------------*/

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        // Base Styling
        "relative flex aspect-square w-9 h-9 flex-col items-center justify-center font-bold text-sm transition-all duration-200",
        "hover:bg-muted/50 hover:scale-105 active:scale-95 rounded-xl",
        
        // Selected Styling (Premium Glow)
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:font-black data-[selected-single=true]:shadow-lg data-[selected-single=true]:shadow-primary/20",
        
        // Range Styling
        "data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground",
        "data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground",
        "data-[range-middle=true]:bg-primary/10 data-[range-middle=true]:text-primary",
        
        // Focus Styling
        "group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-primary/50 group-data-[focused=true]/day:ring-offset-1 group-data-[focused=true]/day:ring-offset-background",
        
        // Helper text inside button (if any)
        "[&>span]:text-[10px] [&>span]:opacity-60",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }